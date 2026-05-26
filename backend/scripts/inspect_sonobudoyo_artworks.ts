import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    // 1. Fetch Sonobudoyo
    const { data: sonobudoyos, error: err1 } = await supabase
        .from('institutions')
        .select('id, name, slug, location, city, type')
        .ilike('name', '%sonobudoyo%')

    if (err1 || !sonobudoyos) {
        console.error("Error fetching Sonobudoyo:", err1?.message)
        return
    }

    console.log(`=== Sonobudoyo Records in DB (${sonobudoyos.length}) ===`)
    for (const s of sonobudoyos) {
        const { count, error } = await supabase
            .from('artworks')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', s.id) // wait, is owner_id the foreign key? Or is it gallery_id / institution_id? Let's check columns first or try both.
            
        console.log(`ID: ${s.id} | Slug: ${s.slug} | City: ${s.city} | Location: ${s.location} | Artwork Count Check: ${count ?? 0} (Error: ${error?.message || 'none'})`)
    }
    
    // Let's print columns of artworks table
    const { data: artCols, error: err2 } = await supabase
        .from('artworks')
        .select('*')
        .limit(1)
        
    if (artCols && artCols.length > 0) {
        console.log("\nSample artwork columns:", Object.keys(artCols[0]))
    }
}

check()
