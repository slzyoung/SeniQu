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

async function check() {
    const { data, error } = await supabase
        .from('institutions')
        .select('id, name, city, cover_image_url, type');

    if (error) {
        console.error('Error fetching institutions:', error.message);
        return;
    }

    const others = data.filter(i => i.cover_image_url && !i.cover_image_url.includes('unsplash.com') && !i.cover_image_url.includes('cdn.seniqu.art'));

    console.log(`Sample of Other cover images (total ${others.length}):`);
    console.table(others.slice(0, 20).map(i => ({ name: i.name, url: i.cover_image_url })));
}

check();
