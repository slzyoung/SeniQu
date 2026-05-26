import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('name, city, cover_image_url')

    if (error || !institutions) {
        console.error("Error:", error?.message)
        return
    }

    const needsCover = institutions.filter(i => !i.cover_image_url || !i.cover_image_url.includes("cdn.seniqu.art"))

    console.log(`Total needing cover image: ${needsCover.length}`)
    needsCover.slice(0, 10).forEach(i => {
        console.log(`- "${i.name}" (${i.city}) [Current: ${i.cover_image_url}]`)
    })
}

test()
