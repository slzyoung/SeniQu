import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const ids = [
        "ca6ac138-bfa2-46cd-b81c-b3bc64ea5801",
        "0a0ab91e-d9c9-4731-9805-896fdb4f02e5",
        "d546ca11-981a-4fa4-b601-d748bc099ca4",
        "7f640702-0368-4ef1-beab-56b072a19049"
    ]

    for (const id of ids) {
        const { count, error } = await supabase
            .from('artworks')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', id)
            
        console.log(`Institution ID: ${id} | Artworks count: ${count ?? 0} (Error: ${error?.message || 'none'})`)
    }
}

check()
