import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .limit(1)

    if (error || !data || data.length === 0) {
        console.error("Error fetching record:", error?.message)
        return
    }

    console.log("=== INSTITUTIONS SCHEMA ===")
    console.log(JSON.stringify(data[0], null, 2))
}

test()
