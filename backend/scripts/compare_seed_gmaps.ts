import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const duplicates = [
        { name: "Museum Nasional", seedSlug: "museum-nasional", gmapsSlug: "g-ChIJi_JxtdT1aS4R7Vhgb1ZBFaQ" },
        { name: "Museum MACAN", seedSlug: "macan-museum", gmapsSlug: "g-ChIJV_3rrx33aS4R9vCzPVkjlvE" },
        { name: "National Gallery", seedSlug: "national-gallery-indonesia", gmapsSlug: "g-ChIJpZUM-zL0aS4RqDE5R5aunFo" },
        { name: "Ullen Sentalu", seedSlug: "ullen-sentalu-museum", gmapsSlug: "g-ChIJuQp5_QJeei4RcSZ5sDVg_qM" },
        { name: "Museum Sonobudoyo", seedSlug: "museum-sonobudoyo-74", gmapsSlug: "g-ChIJTwoHg49Xei4R7sU-xBpDEJ0" }
    ]

    for (const dup of duplicates) {
        // Fetch seed
        const { data: seedData } = await supabase.from('institutions').select('*').eq('slug', dup.seedSlug).single()
        // Fetch gmaps
        const { data: gmapsData } = await supabase.from('institutions').select('*').eq('slug', dup.gmapsSlug).single()

        console.log(`\n=== Comparison for ${dup.name} ===`)
        if (seedData) {
            const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('institution_id', seedData.id)
            console.log(`SEED: ID: ${seedData.id} | Slug: ${seedData.slug} | Verified: ${seedData.is_verified} | Coords: ${seedData.location !== null} | Artworks: ${count}`)
        } else {
            console.log(`SEED record ${dup.seedSlug} not found!`)
        }

        if (gmapsData) {
            const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('institution_id', gmapsData.id)
            console.log(`GMAPS: ID: ${gmapsData.id} | Slug: ${gmapsData.slug} | Verified: ${gmapsData.is_verified} | Coords: ${gmapsData.location !== null} | Artworks: ${count}`)
        } else {
            console.log(`GMAPS record ${dup.gmapsSlug} not found!`)
        }
    }
}

check()
