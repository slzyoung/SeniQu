import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing DB credentials.")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    const { data, error } = await supabase
        .from("institutions")
        .select("id, name, rating, reviews")
        .limit(10)

    if (error) {
        console.error("Error fetching institutions:", error.message)
        return
    }

    console.log("=== DB REVIEWS INSPECTION ===")
    for (const inst of data) {
        console.log(`\n📍 Name: ${inst.name} | Rating: ${inst.rating}`)
        const reviews = inst.reviews
        if (!reviews) {
            console.log("  ⚠️  Reviews: null")
        } else if (Array.isArray(reviews)) {
            console.log(`  📝  Total Reviews in DB: ${reviews.length}`)
            reviews.slice(0, 2).forEach((r: any, idx: number) => {
                console.log(`    [${idx + 1}] Author: ${r.author || r.authorAttribution?.displayName || 'N/A'}`)
                console.log(`        Rating: ${r.rating} | Time: ${r.time || r.relativePublishTimeDescription || 'N/A'}`)
                console.log(`        Text: "${r.text ? r.text.substring(0, 100) : 'empty'}..."`)
            })
        } else {
            console.log("  ⚠️  Reviews: Unknown type", typeof reviews)
        }
    }
}

run()
