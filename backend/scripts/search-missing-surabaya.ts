import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const terms = ['sampoerna', 'mangrove', 'harmoni', 'ciputra', 'natura', 'suramadu', 'jembatan merah', 'kenjeran'];
    for (const term of terms) {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .ilike('name', `%${term}%`);

        if (error) {
            console.error(`Error searching for ${term}:`, error);
            continue;
        }

        console.log(`\nMatches for "${term}" (${data?.length || 0}):`);
        data?.forEach(inst => {
            console.log(`- Name: ${inst.name}, Slug: ${inst.slug}, Verified: ${inst.is_verified}, Cover: ${inst.cover_image_url}`);
        });
    }
}

check();
