import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing env vars");
        return;
    }
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        });
        const data: any = await response.json();
        
        console.log("=== Artworks Properties ===");
        if (data.definitions && data.definitions.artworks) {
            console.log(Object.keys(data.definitions.artworks.properties));
        } else {
            console.log("No definitions.artworks found");
        }

        console.log("\n=== AI Artworks Properties ===");
        if (data.definitions && data.definitions.ai_artworks) {
            console.log(Object.keys(data.definitions.ai_artworks.properties));
        } else {
            console.log("No definitions.ai_artworks found");
        }
    } catch (err: any) {
        console.error("Failed to fetch schema:", err.message);
    }
}

run();
