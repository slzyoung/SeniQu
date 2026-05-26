import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('institutions')
        .select('id, name, city, location, slug, type')

    if (error || !data) {
        console.error("Error fetching records:", error?.message)
        return
    }

    const gmaps = data.filter(i => i.slug?.startsWith('g-'))
    const osm = data.filter(i => i.slug?.startsWith('osm-'))
    const custom = data.filter(i => !i.slug?.startsWith('g-') && !i.slug?.startsWith('osm-'))

    console.log(`Total institutions: ${data.length}`)
    console.log(`Google Maps (g-): ${gmaps.length}`)
    console.log(`OpenStreetMap (osm-): ${osm.length}`)
    console.log(`Custom/Seed: ${custom.length}`)

    console.log("\nSample Custom/Seed records (first 15):")
    custom.slice(0, 15).forEach(i => {
        let coordsStr = "NULL"
        if (i.location) {
            coordsStr = typeof i.location === 'string' ? i.location : JSON.stringify(i.location)
        }
        console.log(`- Name: ${i.name} | City: ${i.city} | Location: ${coordsStr} | Slug: ${i.slug}`)
    })
}

check()
