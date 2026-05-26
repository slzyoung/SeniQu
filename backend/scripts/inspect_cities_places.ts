import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Checking database records for new cities...");
    const targetCities = ["cirebon", "padang", "banjarmasin", "mataram"];
    
    for (const city of targetCities) {
        const { data, error } = await supabase
            .from("institutions")
            .select("id, name, city, cover_image_url, type, reviews")
            .ilike("city", `%${city}%`);
            
        if (error) {
            console.error(`Error checking ${city}:`, error.message);
            continue;
        }
        
        console.log(`\nCity: ${city}`);
        console.log(`Found ${data?.length || 0} records.`);
        if (data && data.length > 0) {
            data.slice(0, 5).forEach((p) => {
                console.log(`  - Name: "${p.name}" [${p.type}]`);
                console.log(`    Cover Image: ${p.cover_image_url || 'None'}`);
                console.log(`    Reviews Count: ${p.reviews?.length || 0}`);
            });
        }
    }
}

run();
