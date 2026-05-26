import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function list() {
    const cities = ['Jakarta', 'Yogyakarta', 'Bali', 'Bandung', 'Surabaya', 'Semarang'];
    console.log("--- Top Places per City requiring Google Reviews ---");

    for (const city of cities) {
        const { data, error } = await supabase
            .from('institutions')
            .select('id, name, city, google_place_id, rating')
            .ilike('city', `%${city}%`)
            .limit(3);

        if (error) {
            console.error(`Error for ${city}:`, error.message);
            continue;
        }

        console.log(`\nCity: ${city}`);
        console.table(data);
    }
}

list();
