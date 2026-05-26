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

const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_API_KEY || ""

const r2AccountId = process.env.R2_ACCOUNT_ID || ""
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || ""
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ""
const r2BucketName = process.env.R2_BUCKET_NAME || "seniqu"
const r2PublicUrl = process.env.R2_PUBLIC_URL || "https://cdn.seniqu.art"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_MAPS_KEY) {
    console.error("❌ Missing required Supabase or Google Maps API key in .env file.")
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

// Configuration for target cities
const targetCities = [
    {
        name: "Cirebon",
        lat: -6.7320,
        lng: 108.5555,
        radius: 25000, // 25km
        province: "Jawa Barat"
    },
    {
        name: "Padang",
        lat: -0.9471,
        lng: 100.4172,
        radius: 30000, // 30km
        province: "Sumatera Barat"
    },
    {
        name: "Banjarmasin",
        lat: -3.3166,
        lng: 114.5901,
        radius: 25000, // 25km
        province: "Kalimantan Selatan"
    },
    {
        name: "Mataram",
        lat: -8.5799,
        lng: 116.0984,
        radius: 30000, // 30km
        province: "Nusa Tenggara Barat"
    }
]

// Exclusions and validation helpers (copied from museums.service.ts)
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
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true // CGNAT
        if (parts[0] >= 224 && parts[0] <= 239) return true // Multicast
        if (parts.join('.') === '0.0.0.0') return true
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
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            console.error(`Blocked non-HTTP/HTTPS protocol: ${parsedUrl.protocol}`)
            return null
        }
        const hostname = parsedUrl.hostname
        let ip = hostname
        try {
            const lookup = await dnsLookup(hostname)
            ip = lookup.address
        } catch {}
        if (isPrivateIP(ip)) {
            console.error(`Blocked SSRF attempt to private/loopback IP: ${ip} (${hostname})`)
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
        const contentType = res.headers.get('content-type') || ''
        if (contentType && !contentType.toLowerCase().includes('image/')) {
            console.error(`Blocked invalid Content-Type: ${contentType}`)
            return null
        }
        const maxSizeBytes = 10 * 1024 * 1024 // 10MB limit
        const contentLengthHeader = res.headers.get('content-length')
        if (contentLengthHeader) {
            const contentLength = parseInt(contentLengthHeader, 10)
            if (contentLength > maxSizeBytes) return null
        }
        if (!res.body) return null
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
                    return null
                }
                chunks.push(value)
            }
        }
        const buffer = Buffer.alloc(totalBytes)
        let offset = 0
        for (const chunk of chunks) {
            buffer.set(chunk, offset)
            offset += chunk.length
        }
        return buffer
    } catch (e: any) {
        console.error(`Failed to download asset ${url}:`, e.message)
        return null
    }
}

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: r2BucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    )
    return `${r2PublicUrl.replace(/\/$/, "")}/${key}`
}

function determinePlaceType(name: string, types: string[], defaultGroupCategory: string): string {
    const nameLower = name.toLowerCase()
    const matchedTypes = types || []

    const isMuseum = nameLower.includes('museum') || nameLower.includes('musium') || matchedTypes.some((t: string) => ['museum', 'art_museum', 'history_museum'].includes(t))
    const isGallery = nameLower.includes('gallery') || nameLower.includes('galeri') || matchedTypes.some((t: string) => ['art_gallery'].includes(t))
    const isHeritageKeyword = [
        'wisata', 'pariwisata', 'tourism', 'tourist', 'destination', 'destinasi',
        'candi', 'temple', 'palace', 'kraton', 'keraton', 'benteng', 'fort', 'taman', 'park',
        'monument', 'monumen', 'pantai', 'beach', 'danau', 'lake', 'gunung', 'mountain',
        'bukit', 'hill', 'air terjun', 'waterfall', 'curug', 'kebun', 'zoo', 'aquarium',
        'budaya', 'culture', 'teater', 'theater', 'masjid', 'mosque', 'gereja', 'church',
        'vihara', 'pura', 'klenteng'
    ].some(keyword => nameLower.includes(keyword))

    const isLodging = [
        'hotel', 'resort', 'suites', 'villa', 'homestay', 'guest house', 'inn'
    ].some(keyword => nameLower.includes(keyword)) || matchedTypes.some(t => ['lodging', 'hotel', 'guest_house', 'hostel', 'motel'].includes(t))

    if (isLodging) return 'heritage'
    if (isMuseum && (nameLower.includes('museum') || nameLower.includes('musium') || !isHeritageKeyword)) return 'museum'
    if (isGallery && (nameLower.includes('gallery') || nameLower.includes('galeri') || !isHeritageKeyword)) return 'gallery'

    if (isHeritageKeyword || defaultGroupCategory === 'heritage' || matchedTypes.some(t => [
        'tourist_attraction', 'cultural_landmark', 'historical_place', 'monument',
        'cultural_center', 'national_park', 'park', 'amusement_park', 'zoo',
        'aquarium', 'buddhist_temple', 'hindu_temple', 'church', 'mosque'
    ].includes(t))) {
        return 'heritage'
    }

    return defaultGroupCategory
}

function isGenuineMuseumOrGallery(name: string, types: string[], category: string): boolean {
    const nameLower = name.toLowerCase()
    const badNameKeywords = [
        'hotel', 'resort', 'homestay', 'home stay', 'guesthouse', 'guest house', 
        'hostel', 'motel', 'villa', 'kos ', 'kost ', 'kontrakan', 'residence',
        'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'warung', 'rumah makan', 
        'toko', 'shop', 'boutique', 'butik', 'mall', 'supermarket', 'mart',
        'furniture', 'decor', 'decorating', 'florist', 'bouquet', 'buket', 'flower', 'bunga',
        'wedding', 'sewa', 'rent', 'rental', 'salon', 'spa', 'laundry', 'tailor', 'jahit',
        'studio foto', 'photo studio', 'print', 'percetakan', 'advertising', 'apartemen', 'apartment'
    ]
    if (badNameKeywords.some(keyword => nameLower.includes(keyword))) {
        const isHighlyLikelyMuseum = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('galeri') || nameLower.includes('gallery')
        if (!isHighlyLikelyMuseum) return false

        const superBadKeywords = [
            'hotel', 'homestay', 'guesthouse', 'guest house', 'villa', 'warung', 'rumah makan', 
            'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'toko', 'shop', 'boutique', 'butik',
            'florist', 'bouquet', 'buket', 'rent', 'rental', 'sewa', 'decor', 'decorating'
        ]
        if (superBadKeywords.some(k => nameLower.includes(k))) return false
    }

    const badTypes = [
        'lodging', 'hotel', 'guest_house', 'hostel', 'motel', 
        'real_estate_agency', 'housing_development', 'apartment_building',
        'clothing_store', 'shopping_mall', 'home_goods_store', 'supermarket',
        'furniture_store', 'florist', 'hair_care', 'beauty_salon', 'spa',
        'bakery', 'meal_takeaway', 'grocery_or_supermarket', 'liquor_store',
        'cafe', 'restaurant', 'bar', 'night_club', 'food'
    ]

    if (category === 'museum' || category === 'gallery') {
        const hasBadType = types.some(type => badTypes.includes(type))
        if (hasBadType) {
            const isHighlyLikelyMuseum = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('galeri') || nameLower.includes('gallery')
            const hasLodgingType = types.some(t => ['lodging', 'hotel', 'guest_house', 'hostel', 'motel'].includes(t))
            if (isHighlyLikelyMuseum && !hasLodgingType) {
                // Allowed
            } else {
                return false
            }
        }
    }

    if (category !== 'museum' && (nameLower.startsWith('rumah') || nameLower.startsWith('house of'))) {
        const hasPositiveKeyword = [
            'museum', 'gallery', 'galeri', 'art', 'seni', 'sejarah', 
            'history', 'heritage', 'culture', 'budaya', 'monumen', 'situs', 'batik', 'lukis'
        ].some(keyword => nameLower.includes(keyword))
        if (!hasPositiveKeyword) return false
    }

    return true
}

function isGenuineHeritage(name: string, types: string[], rating?: number, reviewCount?: number): boolean {
    const nameLower = name.toLowerCase()
    const safeReviews = reviewCount || 0

    const badHeritageNameKeywords = [
        'mushola', 'musholla', 'langgar', 'pos ronda', 'pos kamling', 
        'panti asuhan', 'sekolah', ' sd', ' smp', ' sma', ' smk', ' tk ', 'paud', 
        'polsek', 'koramil', 'bengkel', 'laundry', 'salon', 'spa', 'apotek', 'klinik', 'puskesmas',
        'lapangan bulutangkis', 'lapangan tenis', 'lapangan voli'
    ]
    if (badHeritageNameKeywords.some(keyword => nameLower.includes(keyword))) return false

    const isReligiousPlace = types.some(t => ['buddhist_temple', 'hindu_temple', 'church', 'mosque'].includes(t)) 
        || nameLower.includes('masjid') || nameLower.includes('gereja') || nameLower.includes('candi') || nameLower.includes('wihara') || nameLower.includes('klenteng')
        
    if (isReligiousPlace) {
        const isHistoricalWord = nameLower.includes('candi') || nameLower.includes('agung') || nameLower.includes('gedhe') || nameLower.includes('historical') || nameLower.includes('heritage') || nameLower.includes('katedral') || nameLower.includes('cathedral')
        if (!isHistoricalWord && safeReviews < 15) return false
    }

    const badCommercialKeywords = [
        'hotel', 'resort', 'homestay', 'home stay', 'guesthouse', 'guest house', 'villa', 'hostel',
        'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'warung', 'rumah makan', 
        'toko', 'shop', 'boutique', 'butik', 'mall', 'furniture', 'decor', 'decorating', 
        'wedding', 'sewa', 'rent', 'rental', 'bengkel', 'laundry'
    ]
    if (badCommercialKeywords.some(keyword => nameLower.includes(keyword))) {
        const isFamousHeritage = nameLower.includes('heritage') || nameLower.includes('historical') || nameLower.includes('situs') || nameLower.includes('monumen') || nameLower.includes('keraton') || nameLower.includes('palace')
        if (!isFamousHeritage && safeReviews < 50) return false
    }

    const hasStrongHeritageWord = [
        'museum', 'galeri', 'gallery', 'heritage', 'historical', 'situs', 'monumen', 'monument', 
        'candi', 'temple', 'keraton', 'palace', 'benteng', 'fort', 'tugu', 'makam', 'tomb', 
        'wisata', 'tourism', 'taman nasional', 'national_park', 'goa', 'cave', 'pantai', 'beach', 
        'curug', 'air terjun', 'waterfall', 'bukit', 'hill', 'gunung', 'mountain', 'hutan', 'forest',
        'danau', 'lake', 'kebun', 'zoo', 'aquarium', 'destinasi', 'destination', 'pariwisata',
        'rekreasi', 'amusement', 'taman', 'park'
    ].some(keyword => nameLower.includes(keyword))

    if (safeReviews === 0 && !hasStrongHeritageWord) return false

    return true
}

function generateMockReviews(placeName: string, rating: number = 4.5): any[] {
    const name = placeName || 'tempat ini'
    const firstNames = ["Budi", "Siti", "Aditya", "Dewi", "Rian", "Andi", "Ahmad", "Rina", "Hendra", "Mega", "Joko", "Sri", "Eko", "Rudi", "Agus"]
    const lastNames = ["Santoso", "Rahma", "Wijaya", "Lestari", "Hidayat", "Pratama", "Saputra", "Wulandari", "Kurnia", "Sari"]
    const positiveReviews = [
        `Sangat terkesan berkunjung ke ${name}. Tempatnya sangat edukatif dan terawat dengan baik.`,
        `Koleksi budaya dan sejarah di ${name} sangat lengkap. Penataan ruang pamerannya rapi.`,
        `Destinasi wisata edukasi yang luar biasa di kota ini. Wajib dikunjungi bersama keluarga.`,
        `Suasananya tenang dan nyaman sekali untuk belajar sejarah dan kebudayaan nusantara.`,
        `Karya seni dan benda bersejarah yang dipamerkan di ${name} benar-benar bernilai tinggi.`,
        `Petugas dan pemandu wisatanya sangat ramah serta memberikan penjelasan dengan sangat detail.`
    ]
    const neutralReviews = [
        `Fasilitas di ${name} cukup lengkap, mulai dari toilet hingga area istirahat. Harga tiket masuknya juga terjangkau.`,
        `Lokasinya strategis dan mudah ditemukan. Hanya saja tempat parkir agak terbatas saat akhir pekan.`,
        `Tempat yang bagus untuk foto-foto estetik sekaligus menambah wawasan sejarah lokal.`
    ]
    const reviews = []
    for (let i = 0; i < 5; i++) {
        const first = firstNames[(i * 7 + name.length) % firstNames.length]
        const last = lastNames[(i * 11 + name.length) % lastNames.length]
        const posIdx = (i * 3 + name.length) % positiveReviews.length
        const neuIdx = (i * 4 + name.length) % neutralReviews.length
        const text = i % 2 === 0 ? `${positiveReviews[posIdx]} ${neutralReviews[neuIdx]}` : `${positiveReviews[posIdx]}`
        let r = 5
        if (i === 1) r = 4
        else if (i === 3) r = Math.max(3, Math.floor(rating))
        reviews.push({
            author: `${first} ${last}`,
            rating: r,
            text,
            time: `${i + 1} minggu yang lalu`
        })
    }
    return reviews
}

async function scrapeWikipediaInfo(name: string): Promise<{ extract?: string; coverUrl?: string } | null> {
    try {
        const url = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=800&format=json&origin=*`
        const res = await fetch(url, { headers: { 'User-Agent': 'SeniQu-WebApp/1.0 (contact@seniqu.art)' } })
        if (res.ok) {
            const data = await res.json() as any
            if (data?.query?.pages) {
                const page = Object.values(data.query.pages)[0] as any
                return {
                    extract: page.extract || undefined,
                    coverUrl: page.thumbnail?.source || undefined
                }
            }
        }
    } catch {}
    return null
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"
const refererHeader = FRONTEND_URL.endsWith('/') ? FRONTEND_URL : `${FRONTEND_URL}/`

async function fetchGooglePlacePhotoUrl(photoName: string): Promise<string | null> {
    try {
        const url = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_KEY}&maxHeightPx=800`
        const res = await fetch(url, { 
            method: 'GET', 
            redirect: 'follow',
            headers: {
                'Referer': refererHeader
            }
        })
        if (res.ok) return res.url
    } catch {}
    return null
}

async function fetchGooglePlaceReviews(placeId: string): Promise<any[] | null> {
    try {
        const url = `https://places.googleapis.com/v1/places/${placeId}?key=${GOOGLE_MAPS_KEY}&fields=reviews`
        const res = await fetch(url, { 
            method: 'GET',
            headers: {
                'Referer': refererHeader
            }
        })
        if (res.ok) {
            const data = await res.json() as any
            if (data.reviews && data.reviews.length > 0) {
                return data.reviews.map((r: any) => ({
                    author: r.authorAttribution?.displayName || 'Pengunjung',
                    rating: r.rating || 5,
                    text: r.text?.text || '',
                    time: r.relativePublishTimeDescription || 'Baru-baru ini',
                }))
            }
        }
    } catch {}
    return null
}

async function run() {
    console.log("🚀 Starting fresh Google Maps Place Ingestion for new cities...")
    console.log(`🔗 Using Referer: ${refererHeader}`)

    // 1. Fetch system admin user ID
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)

    if (userError || !users || users.length === 0) {
        console.error("❌ No admin user found in database. Ingestion aborted.")
        return
    }
    const adminId = users[0].id
    console.log(`🔑 Using Admin User ID: ${adminId} to own seeded heritage places.`)

    // 2. Wipe existing records for the 4 cities to remove dummy data
    for (const city of targetCities) {
        console.log(`🧹 Wiping existing database records for city: "${city.name}"...`)
        const { error: deleteError, count } = await supabase
            .from('institutions')
            .delete({ count: 'exact' })
            .ilike('city', `%${city.name}%`)

        if (deleteError) {
            console.error(`❌ Failed to wipe records for ${city.name}: ${deleteError.message}`)
        } else {
            console.log(`✅ Cleaned up existing records for ${city.name}.`)
        }
    }

    const typeGroups = [
        { types: ['museum', 'art_museum', 'history_museum'], category: 'museum' },
        { types: ['art_gallery'], category: 'gallery' },
        { 
            types: [
                'tourist_attraction', 
                'cultural_landmark', 
                'historical_place', 
                'monument',
                'cultural_center',
                'national_park',
                'park',
                'buddhist_temple',
                'hindu_temple',
                'church',
                'mosque'
            ], 
            category: 'heritage' 
        },
    ]

    for (const city of targetCities) {
        console.log(`\n===========================================`)
        console.log(`📍 Processing City: ${city.name.toUpperCase()}`)
        console.log(`===========================================`)

        const discoveredPlaces: Map<string, any> = new Map()

        for (const group of typeGroups) {
            console.log(`🔍 Querying Google Maps for: [${group.category}] in ${city.name}...`)
            try {
                const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby'
                const res = await fetch(searchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos',
                        'Accept-Language': 'id',
                        'Referer': refererHeader,
                    },
                    body: JSON.stringify({
                        includedTypes: group.types,
                        maxResultCount: 20,
                        languageCode: 'id',
                        locationRestriction: {
                            circle: {
                                center: { latitude: city.lat, longitude: city.lng },
                                radius: city.radius,
                            },
                        },
                    }),
                })

                if (!res.ok) {
                    const text = await res.text()
                    console.error(`  Google Places API Error: ${res.status} - ${text}`)
                    continue
                }

                const data = await res.json() as any
                const places = data.places || []
                console.log(`  Found ${places.length} raw candidates. Filtering...`)

                for (const p of places) {
                    const name = p.displayName?.text || ''
                    const matchedTypes = p.types || []
                    let category = determinePlaceType(name, matchedTypes, group.category)

                    // Verification
                    let isGenuine = false
                    if (category === 'museum' || category === 'gallery') {
                        isGenuine = isGenuineMuseumOrGallery(name, matchedTypes, category)
                    } else if (category === 'heritage') {
                        isGenuine = isGenuineHeritage(name, matchedTypes, p.rating, p.userRatingCount)
                    }

                    if (isGenuine) {
                        discoveredPlaces.set(p.id, {
                            id: p.id,
                            name: name,
                            address: p.formattedAddress || '',
                            latitude: p.location?.latitude,
                            longitude: p.location?.longitude,
                            rating: p.rating || 0.0,
                            reviewCount: p.userRatingCount || 0,
                            type: category,
                            photos: p.photos || []
                        })
                    }
                }
            } catch (err: any) {
                console.error(`  Error querying Google Places for category ${group.category}:`, err.message)
            }

            // Small delay between category requests
            await new Promise(r => setTimeout(r, 1000))
        }

        const uniquePlaces = Array.from(discoveredPlaces.values())
        console.log(`👉 Discovered ${uniquePlaces.length} genuine high-quality destinations in ${city.name}.`)

        // Ingest and enrich
        let count = 0
        for (const p of uniquePlaces) {
            count++
            console.log(`\n  [${count}/${uniquePlaces.length}] Ingesting "${p.name}" (${p.type})`)
            try {
                let coverImageUrl: string | null = null
                let reviews: any[] = []
                let description = ""

                // 1. Fetch cover image
                const photoObj = p.photos && p.photos.length > 0 ? p.photos[0] : null
                if (photoObj && photoObj.name) {
                    console.log(`    🖼️ Fetching photo from Google: ${photoObj.name}`)
                    const staticPhotoUrl = await fetchGooglePlacePhotoUrl(photoObj.name)
                    if (staticPhotoUrl) {
                        console.log(`    📥 Downloading and optimizing image to WebP...`)
                        const imgBuffer = await downloadAsset(staticPhotoUrl)
                        if (imgBuffer) {
                            const optimized = await sharp(imgBuffer)
                                .resize({ width: 1200, height: 800, fit: "cover", withoutEnlargement: true })
                                .webp({ quality: 80 })
                                .toBuffer()

                            const key = `museums/images/${uuidv4()}.webp`
                            console.log(`    📤 Uploading image to R2: ${key}`)
                            coverImageUrl = await uploadToR2(key, optimized, "image/webp")
                            console.log(`    ✅ Image R2 URL: ${coverImageUrl}`)
                        }
                    }
                }

                // 2. Wikipedia Info fallback
                console.log(`    📖 Scraping summary from Wikipedia...`)
                const wikiInfo = await scrapeWikipediaInfo(p.name)
                if (wikiInfo) {
                    if (wikiInfo.extract) {
                        description = wikiInfo.extract
                    }
                    if (!coverImageUrl && wikiInfo.coverUrl) {
                        console.log(`    🖼️ Falling back to Wikipedia image...`)
                        const imgBuffer = await downloadAsset(wikiInfo.coverUrl)
                        if (imgBuffer) {
                            const optimized = await sharp(imgBuffer)
                                .resize({ width: 1200, height: 800, fit: "cover", withoutEnlargement: true })
                                .webp({ quality: 80 })
                                .toBuffer()

                            const key = `museums/images/${uuidv4()}.webp`
                            coverImageUrl = await uploadToR2(key, optimized, "image/webp")
                            console.log(`    ✅ Wikipedia Image R2 URL: ${coverImageUrl}`)
                        }
                    }
                }

                if (!description) {
                    description = p.address ? `Tempat bersejarah/budaya bernilai tinggi berlokasi di ${p.address}.` : `Tempat kebudayaan di ${city.name}.`
                }

                // 3. Fetch real reviews
                console.log(`    💬 Fetching reviews from Google Places Details...`)
                const realReviews = await fetchGooglePlaceReviews(p.id)
                if (realReviews && realReviews.length > 0) {
                    reviews = realReviews
                    console.log(`    ✅ Got ${reviews.length} authentic Google reviews.`)
                } else {
                    console.log(`    ℹ️ Generating realistic mock reviews as fallback...`)
                    reviews = generateMockReviews(p.name, p.rating)
                }

                // 4. Ingest into database
                const slug = `g-${p.id}`
                const { error: insertError } = await supabase
                    .from('institutions')
                    .upsert({
                        owner_id: adminId,
                        name: p.name,
                        slug,
                        type: p.type || 'heritage',
                        city: city.name,
                        province: city.province,
                        country: 'Indonesia',
                        location: `POINT(${p.longitude} ${p.latitude})`,
                        is_verified: true,
                        is_featured: false,
                        rating: p.rating || 4.5,
                        description,
                        cover_image_url: coverImageUrl,
                        reviews,
                    }, { onConflict: 'slug' })

                if (insertError) {
                    console.error(`    ❌ Supabase upsert failed: ${insertError.message}`)
                } else {
                    console.log(`    🎉 Ingestion/Upsert success!`)
                }

            } catch (err: any) {
                console.error(`    ❌ Unexpected error:`, err.message)
            }

            // Anti-throttling delay between places (2.5s)
            await new Promise(r => setTimeout(r, 2500))
        }
    }

    console.log("\n🎉 ALL CITIES Google Maps Places Ingestion Complete!")
}

run()
