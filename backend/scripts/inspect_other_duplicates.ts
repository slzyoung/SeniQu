import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const names = [
        "Museum Nasional",
        "MACAN Museum",
        "Museum MACAN",
        "National Gallery",
        "Galeri Nasional",
        "Sanggar Agung",
        "Ullen Sentalu"
    ]

    for (const name of names) {
        const { data, error } = await supabase
            .from('institutions')
            .select('id, name, slug, location, is_verified, cover_image_url')
            .ilike('name', `%${name}%`)

        if (error) {
            console.error(`Error searching ${name}:`, error.message)
            continue
        }

        console.log(`\n=== Matches for "${name}" (${data?.length || 0}) ===`)
        data?.forEach(inst => {
            console.log(`ID: ${inst.id} | Name: ${inst.name} | Slug: ${inst.slug} | Verified: ${inst.is_verified} | Has Location: ${inst.location !== null}`)
        })
    }
}

check()
