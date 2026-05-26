import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as sharp from "sharp"
import { v4 as uuidv4 } from "uuid"
import * as dns from "dns"
import { promisify } from "util"
import * as puppeteer from 'puppeteer-core'

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
    
    const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    if (ipv4Pattern.test(ip)) {
        const parts = ip.split('.').map(Number)
        if (parts.some(isNaN)) return true
        if (parts[0] === 127) return true
        if (parts[0] === 10) return true
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
        if (parts[0] === 192 && parts[1] === 168) return true
        if (parts[0] === 169 && parts[1] === 254) return true
        if (parts.join('.') === '0.0.0.0') return true
        return false
    }
    
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

async function run() {
    console.log("🚀 Starting Google Maps & Search combined Puppeteer scraper...")

    // Fetch all institutions from the database
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('id, name, city, cover_image_url, reviews')
    
    if (error || !institutions) {
        console.error("Failed to query institutions table:", error?.message)
        return
    }

    console.log(`Successfully fetched ${institutions.length} institutions from database.`)

    const mockAuthors = [
        "Budi Santoso", "Siti Rahma", "Aditya Wijaya", "Dewi Lestari", "Rian Hidayat",
        "Andi Saputra", "Ahmad Saputra", "Rina Wulandari", "Hendra Kurnia", "Mega Sari",
        "Joko Susanto", "Sri Utami", "Eko Prasetyo", "Rudi Kurnia", "Agus Gunawan",
        "Yanto Nasution", "Bambang Setiawan", "Wati Setiawan", "Kartika Wati", "Denny Siregar",
        "Fajar Wijaya", "Gita Lestari", "Dina Hidayatullah", "Hadi Saputra", "Indra Putra",
        "Kurniawan Lubis", "Larasati Kusuma", "Mulyono Utomo", "Novi Siregar", "Putra Susanto"
    ]

    const pendingUpdate = institutions.filter(i => {
        const needsCover = !i.cover_image_url || !i.cover_image_url.includes("cdn.seniqu.art")
        const isMockReviews = !i.reviews || i.reviews.length === 0 || i.reviews.some((r: any) => mockAuthors.includes(r.author))
        return needsCover || isMockReviews
    })

    console.log(`Identified ${pendingUpdate.length} records requiring Google Maps cover image or review scraping.`)

    if (pendingUpdate.length === 0) {
        console.log("🎉 All records are up-to-date! No work to do.")
        return
    }

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,1024',
        ]
    })

    let processedCount = 0
    let successCount = 0

    for (const inst of pendingUpdate) {
        processedCount++
        console.log(`\n[${processedCount}/${pendingUpdate.length}] Processing "${inst.name}" (${inst.city || 'No City'})`)
        
        const updatePayload: any = {}
        let imageProcessed = false
        let reviewsProcessed = false

        const needsCover = !inst.cover_image_url || !inst.cover_image_url.includes("cdn.seniqu.art")
        const isMockReviews = !inst.reviews || inst.reviews.length === 0 || inst.reviews.some((r: any) => mockAuthors.includes(r.author))

        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 1024 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        // Set normal viewport and user agent

        try {
            // STEP 1: Handle Review Scraping (Google Search)
            if (isMockReviews) {
                console.log(`  🔍 Finding FID in Google Search...`)
                const searchQuery = encodeURIComponent(`${inst.name} ${inst.city || ''}`)
                const searchUrl = `https://www.google.com/search?q=${searchQuery}&hl=id&gl=id`
                
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
                await new Promise(r => setTimeout(r, 3000))

                // Extract FID
                let fid: string | null = await page.evaluate(() => {
                    const el = document.querySelector('[data-fid]')
                    return el ? el.getAttribute('data-fid') : null
                })

                if (!fid) {
                    const content = await page.content()
                    const match = content.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/)
                    fid = match ? match[0] : null
                }

                if (fid) {
                    console.log(`  Found FID: ${fid}. Navigating to reviews modal...`)
                    const reviewsUrl = `https://www.google.com/search?q=${searchQuery}&hl=id&gl=id#lrd=${fid},1`
                    await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: 30000 })
                    
                    try {
                        await page.waitForSelector('div.bwb7ce', { timeout: 12000 })
                    } catch (err) {
                        console.log(`  Waiting for review selector timed out, using fallback delay.`)
                        await new Promise(r => setTimeout(r, 6000))
                    }

                    // Parse reviews
                    const reviews = await page.evaluate(() => {
                        const results: any[] = []
                        document.querySelectorAll('div.bwb7ce').forEach((el: any) => {
                            try {
                                const author = el.querySelector('.Vpc5Fe')?.textContent?.trim() || ''
                                const text = el.querySelector('.OA1nbd')?.textContent?.trim() || ''
                                
                                const ratingStr = el.querySelector('.dHX2k')?.getAttribute('aria-label') || ''
                                const ratingMatch = ratingStr.match(/([0-5][\.,\d]*)/)
                                const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 5

                                const time = el.querySelector('.y3Ibjb')?.textContent?.trim() || 'Baru saja'

                                if (author) {
                                    results.push({ author, rating, text, time })
                                }
                            } catch (e) {
                                // Ignore individual review parsing errors
                            }
                        })
                        return results
                    })

                    if (reviews && reviews.length > 0) {
                        console.log(`  ✅ Successfully scraped ${reviews.length} authentic reviews from Google Maps.`)
                        updatePayload.reviews = reviews
                        reviewsProcessed = true
                    } else {
                        console.log(`  ⚠️ Reviews modal was empty or parsing failed.`)
                    }
                } else {
                    console.log(`  ⚠️ FID could not be found. Skipping reviews.`)
                }
            }

            // STEP 2: Handle Cover Image Scraping (Google Maps)
            if (needsCover) {
                console.log(`  🗺️  Finding cover photo in Google Maps...`)
                const mapQuery = encodeURIComponent(`${inst.name} ${inst.city || ''}`)
                const mapUrl = `https://www.google.com/maps/search/${mapQuery}?hl=id`
                
                await page.goto(mapUrl, { waitUntil: 'networkidle2', timeout: 30000 })
                await new Promise(r => setTimeout(r, 6000))

                const coverPhoto = await page.evaluate(() => {
                    const imgs = Array.from(document.querySelectorAll('img'))
                    const matches = imgs.map(img => img.getAttribute('src') || '')
                        .filter(src => src.includes('googleusercontent.com') || src.includes('gps-cs-s'))
                    return matches.length > 0 ? matches[0] : null
                })

                if (coverPhoto) {
                    console.log(`  Found cover photo: ${coverPhoto.substring(0, 100)}...`)
                    // Resize to high-resolution (1200x800)
                    let resizedUrl = coverPhoto
                    if (coverPhoto.includes('=')) {
                        const base = coverPhoto.split('=')[0]
                        resizedUrl = `${base}=w1200-h800-p`
                    } else {
                        resizedUrl = `${coverPhoto}=w1200-h800-p`
                    }

                    console.log(`  📥 Downloading image securely...`)
                    const buffer = await downloadAsset(resizedUrl)
                    if (buffer) {
                        console.log(`  🖼️  Optimizing with Sharp (strip EXIF metadata)...`)
                        try {
                            const optimizedBuffer = await sharp(buffer)
                                .resize({ width: 1200, height: 800, fit: "cover", withoutEnlargement: true })
                                .webp({ quality: 80 })
                                .toBuffer()

                            const fileUuid = uuidv4()
                            const key = `museums/images/${fileUuid}.webp`
                            
                            console.log(`  📤 Uploading WebP to Cloudflare R2...`)
                            await uploadToR2(key, optimizedBuffer, "image/webp")

                            const cdnUrl = getPublicUrl(key)
                            updatePayload.cover_image_url = cdnUrl
                            imageProcessed = true
                        } catch (err: any) {
                            console.error(`  ❌ Sharp processing or R2 upload failed:`, err.message)
                        }
                    }
                } else {
                    console.log(`  ⚠️ No cover image found on Google Maps.`)
                }
            }

            // STEP 3: Update the Database
            if (Object.keys(updatePayload).length > 0) {
                console.log(`  💾 Indexing metadata in database...`)
                const { error: updateErr } = await supabase
                    .from('institutions')
                    .update(updatePayload)
                    .eq('id', inst.id)

                if (updateErr) {
                    console.error(`  ❌ Database update failed:`, updateErr.message)
                } else {
                    console.log(`  ✅ Successfully updated record in Supabase! (Cover: ${imageProcessed ? 'YES' : 'NO'}, Reviews: ${reviewsProcessed ? 'YES' : 'NO'})`)
                    successCount++
                }
            } else {
                console.log(`  ℹ️ Nothing new to update for this record.`)
            }

        } catch (e: any) {
            console.error(`  ❌ Error processing "${inst.name}":`, e.message)
        } finally {
            await page.close()
        }

        // Anti-Throttling Delay (random between 2.0 and 3.5 seconds)
        const delayMs = Math.floor(Math.random() * 1500) + 2000
        await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    await browser.close()
    console.log(`\n🎉 PUPPETEER GOOGLE MAPS SCRAPING & CDN MIGRATION COMPLETE:`)
    console.log(`- Total Records Checked: ${pendingUpdate.length}`)
    console.log(`- Successfully Updated in DB: ${successCount}`)
    console.log(`- Failed/Skipped: ${pendingUpdate.length - successCount}`)
}

run()
