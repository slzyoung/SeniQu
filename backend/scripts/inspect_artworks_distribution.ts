import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('artworks')
        .select('id, title, institution_id')

    if (error || !data) {
        console.error("Error fetching artworks:", error?.message)
        return
    }

    console.log(`Total artworks in DB: ${data.length}`)
    const group: Record<string, number> = {}
    data.forEach(art => {
        const instId = art.institution_id || 'NULL'
        group[instId] = (group[instId] || 0) + 1
    })

    console.log("Artworks grouped by institution_id:")
    for (const [instId, count] of Object.entries(group)) {
        if (instId !== 'NULL') {
            const { data: inst } = await supabase
                .from('institutions')
                .select('name, slug')
                .eq('id', instId)
                .single()
            console.log(`- Institution: ${inst?.name || 'Unknown'} (Slug: ${inst?.slug}) [ID: ${instId}]: ${count} artworks`)
        } else {
            console.log(`- NULL institution_id: ${count} artworks`)
        }
    }
}

check()
