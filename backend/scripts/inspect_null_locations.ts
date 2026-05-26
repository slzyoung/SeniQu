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
        .select('id, name, city, location, slug')

    if (error || !data) {
        console.error("Error fetching records:", error?.message)
        return
    }

    const nullLoc = data.filter(i => !i.location)
    console.log(`Total institutions in DB: ${data.length}`)
    console.log(`Institutions with NULL location: ${nullLoc.length}`)
    
    console.log("\nSample NULL location records (first 10):")
    nullLoc.slice(0, 10).forEach(i => {
        console.log(`- ${i.name} (${i.city || 'No City'}) [Slug: ${i.slug}]`)
    })
}

check()
