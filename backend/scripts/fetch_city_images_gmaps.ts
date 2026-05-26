import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as sharp from "sharp"
import * as dns from "dns"
import { promisify } from "util"

const dnsLookup = promisify(dns.lookup)

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
const r2AccountId = process.env.R2_ACCOUNT_ID || ""
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || ""
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ""
const r2BucketName = process.env.R2_BUCKET_NAME || "seniqu"
const r2PublicUrl = process.env.R2_PUBLIC_URL || "https://cdn.seniqu.art"
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"
const refererHeader = FRONTEND_URL.endsWith('/') ? FRONTEND_URL : `${FRONTEND_URL}/`

if (!GOOGLE_MAPS_KEY) {
    console.error("❌ GOOGLE_MAPS_KEY is missing in .env file.")
    process.exit(1)
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
})

// Landmarks to search for each city
const cityLandmarks = [
    { id: "cirebon", query: "Keraton Kasepuhan Cirebon", wikiQuery: "Keraton Kasepuhan" },
    { id: "padang", query: "Masjid Raya Sumatera Barat", wikiQuery: "Masjid Raya Sumatera Barat" },
    { id: "banjarmasin", query: "Menara Pandang Banjarmasin", wikiQuery: "Menara Pandang Banjarmasin" },
    { id: "mataram", query: "Islamic Center NTB Mataram", wikiQuery: "Masjid Raya Hubbul Wathan" }
]

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
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true
        if (parts[0] >= 224 && parts[0] <= 239) return true
        return false
    }
    const ipLower = ip.toLowerCase()
    if (ipLower === '::1' || ipLower === '::') return true
    if (ipLower.startsWith('fe80:') || ipLower.startsWith('fc00:') || ipLower.startsWith('fd00:')) return true
    return false
}

async function downloadAsset(url: string): Promise<Buffer | null> {
    try {
        const parsedUrl = new URL(url)
        const hostname = parsedUrl.hostname
        let ip = hostname
        try {
            const lookup = await dnsLookup(hostname)
            ip = lookup.address
        } catch {}
        if (isPrivateIP(ip)) {
            console.error(`Blocked IP: ${ip}`)
            return null
        }
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000)
        const res = await fetch(url, {
            headers: { 'User-Agent': 'SeniQu-Scraper/1.0 (contact@seniqu.art)' },
            signal: controller.signal
        })
        clearTimeout(timeout)
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    } catch (e: any) {
        console.error(`Failed to download ${url}:`, e.message)
        return null
    }
}

async function uploadToR2(key: string, body: Buffer): Promise<string> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: r2BucketName,
            Key: key,
            Body: body,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
        })
    )
    return `${r2PublicUrl.replace(/\/$/, "")}/${key}`
}

async function fetchWikipediaImage(query: string): Promise<string | null> {
    try {
        const url = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=1200&format=json&origin=*`
        const res = await fetch(url, { headers: { 'User-Agent': 'SeniQu-WebApp/1.0 (contact@seniqu.art)' } })
        if (res.ok) {
            const data = await res.json() as any
            if (data?.query?.pages) {
                const page = Object.values(data.query.pages)[0] as any
                if (page.thumbnail?.source) {
                    return page.thumbnail.source
                }
            }
        }
    } catch {}
    
    // Try English Wikipedia fallback
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=1200&format=json&origin=*`
        const res = await fetch(url, { headers: { 'User-Agent': 'SeniQu-WebApp/1.0 (contact@seniqu.art)' } })
        if (res.ok) {
            const data = await res.json() as any
            if (data?.query?.pages) {
                const page = Object.values(data.query.pages)[0] as any
                if (page.thumbnail?.source) {
                    return page.thumbnail.source
                }
            }
        }
    } catch {}
    
    return null
}

async function run() {
    console.log("🚀 Starting landmark-based cover image scraper...")
    console.log(`🔗 Using Referer: ${refererHeader}`)

    for (const city of cityLandmarks) {
        console.log(`\n===========================================`)
        console.log(`📍 Processing City: ${city.id.toUpperCase()}`)
        console.log(`===========================================`)
        
        let coverImageUrl: string | null = null

        // Strategy A: Google Places Text Search (with correct fieldmask)
        try {
            console.log(`🔍 Strategy A: Querying Google Places for "${city.query}"...`)
            const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
                    "Accept-Language": "id",
                    "Referer": refererHeader
                },
                body: JSON.stringify({
                    textQuery: city.query,
                    languageCode: "id"
                })
            })

            if (res.ok) {
                const data = await res.json() as any
                const places = data.places || []
                if (places.length > 0 && places[0].photos && places[0].photos.length > 0) {
                    const photoObj = places[0].photos[0]
                    console.log(`  📸 Found GMaps photo: ${photoObj.name} for landmark "${places[0].displayName?.text}"`)
                    
                    const mediaUrl = `https://places.googleapis.com/v1/${photoObj.name}/media?key=${GOOGLE_MAPS_KEY}&maxHeightPx=1200`
                    const mediaRes = await fetch(mediaUrl, { 
                        method: 'GET', 
                        redirect: 'follow',
                        headers: { 'Referer': refererHeader }
                    })

                    if (mediaRes.ok) {
                        coverImageUrl = mediaRes.url
                        console.log(`  ✅ Successfully resolved GMaps URL: ${coverImageUrl}`)
                    }
                }
            } else {
                console.error(`  ⚠️ GMaps request failed: ${res.status}`)
            }
        } catch (e: any) {
            console.error(`  ⚠️ GMaps request error:`, e.message)
        }

        // Strategy B: Wikipedia Page Image (Fallback)
        if (!coverImageUrl) {
            try {
                console.log(`🔍 Strategy B: Falling back to Wikipedia search for "${city.wikiQuery}"...`)
                const wikiUrl = await fetchWikipediaImage(city.wikiQuery)
                if (wikiUrl) {
                    coverImageUrl = wikiUrl
                    console.log(`  ✅ Successfully resolved Wikipedia URL: ${coverImageUrl}`)
                }
            } catch (e: any) {
                console.error(`  ⚠️ Wikipedia fetch error:`, e.message)
            }
        }

        if (coverImageUrl) {
            try {
                console.log(`📥 Downloading image: ${coverImageUrl}`)
                const buffer = await downloadAsset(coverImageUrl)
                if (buffer) {
                    console.log(`⚙️ Optimizing and converting to WebP (1200x800)...`)
                    const optimized = await sharp(buffer)
                        .resize({ width: 1200, height: 800, fit: "cover" })
                        .webp({ quality: 80 })
                        .toBuffer()

                    const key = `assets/static/cities/${city.id}.webp`
                    console.log(`📤 Uploading to R2: bucket=${r2BucketName}, key=${key}`)
                    const finalUrl = await uploadToR2(key, optimized)
                    console.log(`🎉 Success: ${city.id} cover -> ${finalUrl}`)
                } else {
                    console.error(`❌ Failed to download resolved image buffer.`)
                }
            } catch (err: any) {
                console.error(`❌ Image optimization/upload failed:`, err.message)
            }
        } else {
            console.error(`❌ Could not resolve cover image for ${city.id} using Google Places or Wikipedia.`)
        }

        // Delay between cities
        await new Promise(r => setTimeout(r, 2000))
    }

    console.log("\n🎉 City cover image updates complete!")
}

run()
