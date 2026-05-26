import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as sharp from "sharp"
import { v4 as uuidv4 } from "uuid"
import * as dns from "dns"
import { promisify } from "util"

const dnsLookup = promisify(dns.lookup)

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const r2AccountId = process.env.R2_ACCOUNT_ID
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.R2_BUCKET_NAME || "seniqu"
const r2PublicUrl = process.env.R2_PUBLIC_URL || "https://cdn.seniqu.art"
const googleMapsKey = process.env.GOOGLE_MAPS_KEY || process.env.FRONTEND_GOOGLE_MAPS_KEY || ""

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.error("❌ Missing required database or R2 credentials in .env file.")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
})

// Helpers
const getPublicUrl = (key: string) => `${r2PublicUrl.replace(/\/$/, "")}/${key}`

function isPrivateIP(ip: string): boolean {
    if (!ip) return true
    
    // IPv4 check
    const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    if (ipv4Pattern.test(ip)) {
        const parts = ip.split('.').map(Number)
        if (parts.some(isNaN)) return true
        
        // Loopback, Private, Link-local ranges
        if (parts[0] === 127) return true
        if (parts[0] === 10) return true
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
        if (parts[0] === 192 && parts[1] === 168) return true
        if (parts[0] === 169 && parts[1] === 254) return true
        if (parts.join('.') === '0.0.0.0') return true
        
        return false
    }
    
    // IPv6 check
    const ipLower = ip.toLowerCase()
    if (ipLower === '::1' || ipLower === '::') return true
    if (ipLower.startsWith('fe80:') || ipLower.startsWith('fc00:') || ipLower.startsWith('fd00:')) return true
    
    return false
}

/**
 * Downloads external asset securely (SSRF, chunking limit, timeout)
 */
async function downloadAsset(url: string): Promise<Buffer | null> {
    try {
        const parsedUrl = new URL(url)
        
        // 1. SSRF check protocol
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            console.error(`Blocked non-HTTP/HTTPS protocol: ${parsedUrl.protocol}`)
            return null
        }

        // 2. SSRF check IP address
        const hostname = parsedUrl.hostname
        let ip = hostname
        try {
            const lookup = await dnsLookup(hostname)
            ip = lookup.address
        } catch {
            // Treat unresolved hostnames as unsafe
        }

        if (isPrivateIP(ip)) {
            console.error(`Blocked SSRF attempt to private/loopback IP: ${ip} (${hostname})`)
            return null
        }

        // 3. Timeout and stream constraints
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000) // 12s timeout
        
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'SeniQu-Scraper/1.0 (contact@seniqu.art)',
            },
            signal: controller.signal
        })
        clearTimeout(timeout)
        
        if (!res.ok) return null

        // 4. Content Type & Chunk Limit checks (Anti-Chunking / OOM protection)
        const contentType = res.headers.get('content-type') || ''
        if (contentType && !contentType.toLowerCase().includes('image/')) {
            console.error(`Blocked invalid Content-Type: ${contentType}`)
            return null
        }

        const maxSizeBytes = 10 * 1024 * 1024 // 10MB limit
        const contentLengthHeader = res.headers.get('content-length')
        if (contentLengthHeader) {
            const contentLength = parseInt(contentLengthHeader, 10)
            if (contentLength > maxSizeBytes) {
                console.error(`Blocked file exceeding size limit: ${contentLength} bytes`)
                return null
            }
        }

        if (!res.body) {
            console.error('Empty response body')
            return null
        }

        const reader = res.body.getReader()
        const chunks: Uint8Array[] = []
        let totalBytes = 0

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            if (value) {
                totalBytes += value.length
                if (totalBytes > maxSizeBytes) {
                    reader.cancel()
                    console.error(`Terminated transfer: stream size exceeded ${maxSizeBytes} bytes`)
                    return null
                }
                chunks.push(value)
            }
        }

        // Combine chunks
        const buffer = Buffer.alloc(totalBytes)
        let offset = 0
        for (const chunk of chunks) {
            buffer.set(chunk, offset)
            offset += chunk.length
        }

        return buffer
    } catch (err: any) {
        console.error(`Error downloading ${url}:`, err.message)
        return null
    }
}

/**
 * Uploads processed buffer to Cloudflare R2
 */
async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: r2BucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    )
}

/**
 * Wikipedia search for cover images
 */
async function scrapePlaceImage(placeName: string): Promise<string | null> {
    try {
        const queryName = placeName.trim()
        if (!queryName) return null

        // Step 1: ID Wikipedia
        const idUrl = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=pageimages&pithumbsize=1000&format=json&origin=*`
        const res1 = await fetch(idUrl, {
            headers: { 'User-Agent': 'SeniQu-Scraper/1.0 (contact@seniqu.art)' }
        })
        if (res1.ok) {
            const data = await res1.json() as any
            if (data?.query?.pages) {
                const pages = Object.values(data.query.pages) as any[]
                if (pages.length > 0 && pages[0].thumbnail?.source) {
                    return pages[0].thumbnail.source
                }
            }
        }

        // Step 2: EN Wikipedia fallback
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=pageimages&pithumbsize=1000&format=json&origin=*`
        const res2 = await fetch(enUrl, {
            headers: { 'User-Agent': 'SeniQu-Scraper/1.0 (contact@seniqu.art)' }
        })
        if (res2.ok) {
            const data = await res2.json() as any
            if (data?.query?.pages) {
                const pages = Object.values(data.query.pages) as any[]
                if (pages.length > 0 && pages[0].thumbnail?.source) {
                    return pages[0].thumbnail.source
                }
            }
        }
    } catch (e: any) {
        console.warn(`Wikipedia image lookup failed for "${placeName}":`, e.message)
    }
    return null
}

/**
 * Google Places API photo search fallback
 */
async function scrapeGooglePlaceImage(placeName: string, city: string): Promise<string | null> {
    if (!googleMapsKey) return null
    try {
        console.log(`[Google Maps Fallback] Searching text for "${placeName}, ${city}"...`)
        const searchUrl = 'https://places.googleapis.com/v1/places:searchText'
        const searchRes = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsKey,
                'X-Goog-FieldMask': 'places.id,places.photos',
                'Accept-Language': 'id',
            },
            body: JSON.stringify({
                textQuery: `${placeName} ${city}`,
                languageCode: 'id',
                maxResultCount: 1,
            })
        })

        if (!searchRes.ok) return null
        const searchData = await searchRes.json() as any
        if (searchData.places && searchData.places.length > 0) {
            const place = searchData.places[0]
            if (place.photos && place.photos.length > 0) {
                const photoName = place.photos[0].name
                console.log(`[Google Maps Fallback] Resolving static photo URL for "${photoName}"...`)
                const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${googleMapsKey}&maxHeightPx=1000`
                const mediaRes = await fetch(mediaUrl, {
                    method: 'GET',
                    redirect: 'follow', // Follow the redirect to obtain static content URL
                })
                if (mediaRes.ok) {
                    return mediaRes.url
                }
            }
        }
    } catch (e: any) {
        console.warn(`Google Places photo lookup failed for "${placeName}":`, e.message)
    }
    return null
}

async function run() {
    console.log("🚀 Starting secure enrichment & R2 CDN migration for institutions...")
    
    // Fetch all institutions from the database
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('id, name, city, cover_image_url')
    
    if (error || !institutions) {
        console.error("Failed to query institutions table:", error?.message)
        return
    }

    console.log(`Successfully fetched ${institutions.length} institutions from database.`)

    const pendingMigration = institutions.filter(i => {
        const url = i.cover_image_url
        // Migrate if null/empty OR if it is an external URL (doesn't point to cdn.seniqu.art)
        return !url || !url.includes("cdn.seniqu.art")
    })

    console.log(`Identified ${pendingMigration.length} records requiring image enrichment or CDN migration.`)

    let processedCount = 0
    let successCount = 0

    for (const inst of pendingMigration) {
        processedCount++
        console.log(`\n[${processedCount}/${pendingMigration.length}] Processing "${inst.name}" (${inst.city || 'No City'})`)
        
        let targetUrl = inst.cover_image_url
        let sourceMethod = "external-cdn-migration"

        // Step 1: If cover_image_url is missing, scrape from Wikipedia first, then fall back to Google Places
        if (!targetUrl) {
            sourceMethod = "wikipedia-scraper"
            console.log(`  🔍 Image missing. Trying Wikipedia scraper...`)
            targetUrl = await scrapePlaceImage(inst.name)
            
            // Wikipedia failed, try Google Places API if configured
            if (!targetUrl && googleMapsKey) {
                sourceMethod = "google-places-api"
                targetUrl = await scrapeGooglePlaceImage(inst.name, inst.city || "")
            }
        }

        if (!targetUrl) {
            console.log(`  ⚠️ Skipping: No image could be resolved for this place.`)
            continue
        }

        // Step 2: Download the image securely (SSRF check + chunk caps + timeouts)
        console.log(`  📥 Downloading image securely from: ${targetUrl.substring(0, 80)}...`)
        const buffer = await downloadAsset(targetUrl)
        if (!buffer) {
            console.error(`  ❌ Failed to download secure buffer from ${targetUrl.substring(0, 60)}`)
            continue
        }

        // Step 3: Optimize using Sharp (strips malicious EXIF headers, scales down, outputs secure WebP)
        console.log(`  🖼️  Optimizing image with Sharp (converting to WebP)...`)
        let optimizedBuffer: Buffer
        try {
            optimizedBuffer = await sharp(buffer)
                .resize({ width: 1200, height: 800, fit: "cover", withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer()
        } catch (err: any) {
            console.error(`  ❌ Sharp processing failed:`, err.message)
            continue
        }

        // Step 4: Upload optimized buffer to R2 CDN
        try {
            const fileUuid = uuidv4()
            const key = `museums/images/${fileUuid}.webp`
            console.log(`  📤 Uploading to R2: bucket=${r2BucketName}, key=${key}`)
            await uploadToR2(key, optimizedBuffer, "image/webp")

            const cdnUrl = getPublicUrl(key)

            // Step 5: Save CDN URL back to Database metadata
            console.log(`  💾 Indexing metadata in database...`)
            const { error: updateErr } = await supabase
                .from('institutions')
                .update({ cover_image_url: cdnUrl })
                .eq('id', inst.id)

            if (updateErr) {
                console.error(`  ❌ Database update failed:`, updateErr.message)
            } else {
                console.log(`  ✅ Successfully updated DB! URL: ${cdnUrl}`)
                successCount++
            }
        } catch (err: any) {
            console.error(`  ❌ R2 migration failed:`, err.message)
        }

        // Step 6: Anti-Throttling Delay (800ms between records)
        await new Promise(resolve => setTimeout(resolve, 800))
    }

    console.log(`\n🎉 ENRICHMENT & MIGRATION SUMMARY:`)
    console.log(`- Total Records Processed: ${pendingMigration.length}`)
    console.log(`- Successfully Migrated to R2 CDN: ${successCount}`)
    console.log(`- Failed/Skipped: ${pendingMigration.length - successCount}`)
}

run()
