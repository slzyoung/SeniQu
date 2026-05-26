import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const googleMapsKey = process.env.GOOGLE_MAPS_KEY || process.env.FRONTEND_GOOGLE_MAPS_KEY || ""
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"
const refererHeader = frontendUrl.endsWith('/') ? frontendUrl : `${frontendUrl}/`

async function test() {
    console.log("Testing Google Places Text Search API...")
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText'
    try {
        const searchRes = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
                'Accept-Language': 'id',
                'Referer': refererHeader
            },
            body: JSON.stringify({
                textQuery: "Museum Nasional Jakarta",
                languageCode: 'id',
                maxResultCount: 1,
            })
        })

        console.log("Status:", searchRes.status)
        const data = await searchRes.json()
        console.log("Response:", JSON.stringify(data, null, 2))
    } catch (e: any) {
        console.error("Error:", e.message)
    }
}

test()
