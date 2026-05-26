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
        .select('*')
        .ilike('name', '%sonobudoyo%')

    if (error || !data) {
        console.error("Error:", error?.message)
        return
    }

    console.log(JSON.stringify(data, null, 2))
}

check()
