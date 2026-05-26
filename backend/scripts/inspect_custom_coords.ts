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
    const { data, error } = await supabase
        .from('institutions')
        .select('*')

    if (error || !data) {
        console.error("Error:", error?.message)
        return
    }

    const custom = data.filter(i => !i.slug?.startsWith('g-') && !i.slug?.startsWith('osm-'))

    console.log(`=== CUSTOM SEED RECORDS DETAILS ===`)
    for (const c of custom) {
        const coords = parseWKB(c.location)
        console.log(`\nName: ${c.name}`)
        console.log(`Slug: ${c.slug}`)
        console.log(`City: ${c.city}`)
        console.log(`Street: ${c.street}`)
        console.log(`Type: ${c.type}`)
        console.log(`Location Hex: ${c.location}`)
        console.log(`Parsed Coords: ${coords ? `Lat: ${coords.lat}, Lng: ${coords.lng}` : 'NULL'}`)
    }
}

run()
