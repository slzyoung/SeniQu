import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

function parseWKB(hex: string): { lat: number; lng: number } | null {
    if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return null
    try {
        const buf = Buffer.from(hex, 'hex')
        if (buf.length >= 21) {
            const byteOrder = buf.readUInt8(0)
            const isLittleEndian = byteOrder === 1
            const geomType = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1)
            const hasSrid = (geomType & 0x20000000) !== 0
            const offset = hasSrid ? 9 : 5
            if (buf.length >= offset + 16) {
                const lng = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset)
                const lat = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8)
                return { lat, lng }
            }
        }
    } catch (e: any) {
        console.error("WKB parsing error:", e.message)
    }
    return null
}

async function run() {
    const duplicates = [
        { name: "Museum Nasional", seedSlug: "museum-nasional", gmapsSlug: "g-ChIJi_JxtdT1aS4R7Vhgb1ZBFaQ" },
        { name: "National Gallery of Indonesia", seedSlug: "national-gallery-indonesia", gmapsSlug: "g-ChIJpZUM-zL0aS4RqDE5R5aunFo" }
    ]

    for (const dup of duplicates) {
        console.log(`\nProcessing ${dup.name}...`)
        
        // Fetch seed
        const { data: seed, error: seedErr } = await supabase.from('institutions').select('*').eq('slug', dup.seedSlug).single()
        // Fetch gmaps
        const { data: gmaps, error: gmapsErr } = await supabase.from('institutions').select('*').eq('slug', dup.gmapsSlug).single()

        if (seedErr || !seed) {
            console.error(`Seed record ${dup.seedSlug} not found:`, seedErr?.message)
            continue
        }

        if (gmapsErr || !gmaps) {
            console.error(`GMaps record ${dup.gmapsSlug} not found:`, gmapsErr?.message)
            continue
        }

        // Get coordinates from GMaps if seed location is null
        let coords = parseWKB(seed.location)
        if (!coords && gmaps.location) {
            coords = parseWKB(gmaps.location)
        }

        const mergedLocation = coords ? `POINT(${coords.lng} ${coords.lat})` : null
        const mergedCover = seed.cover_image_url && seed.cover_image_url.includes("cdn.seniqu.art") 
            ? seed.cover_image_url 
            : (gmaps.cover_image_url || seed.cover_image_url)

        const mergedReviews = gmaps.reviews && gmaps.reviews.length > 0 ? gmaps.reviews : seed.reviews
        const mergedRating = gmaps.rating || seed.rating
        
        // Handle street carefully (do not use long seed.description)
        let mergedStreet = seed.street || gmaps.street || "";
        if (!mergedStreet && gmaps.description && gmaps.description.length < 250) {
            mergedStreet = gmaps.description;
        }

        console.log(`- Merged coordinates: ${coords ? `Lat: ${coords.lat}, Lng: ${coords.lng}` : 'NONE'}`)
        console.log(`- Merging cover image: ${mergedCover}`)
        
        // Update seed record
        const { error: updateErr } = await supabase
            .from('institutions')
            .update({
                location: mergedLocation,
                cover_image_url: mergedCover,
                reviews: mergedReviews,
                rating: mergedRating,
                street: mergedStreet || null,
                is_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', seed.id)

        if (updateErr) {
            console.error(`- Failed to update seed record:`, updateErr.message)
            continue
        }
        console.log(`- Seed record updated successfully.`)

        // Delete duplicate GMaps record
        const { error: deleteErr } = await supabase
            .from('institutions')
            .delete()
            .eq('id', gmaps.id)

        if (deleteErr) {
            console.error(`- Failed to delete GMaps duplicate record:`, deleteErr.message)
        } else {
            console.log(`- GMaps duplicate record deleted.`)
        }
    }
}

run()
