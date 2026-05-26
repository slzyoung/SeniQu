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

async function inspect() {
    console.log("--- Inspecting DB Image URLs ---");

    // 1. Inspect institutions (museums)
    const { data: insts, error: err1 } = await supabase
        .from('institutions')
        .select('name, cover_image_url, logo_url')
        .neq('cover_image_url', null)
        .limit(5);

    if (err1) {
        console.error('Error for institutions:', err1.message);
    } else {
        console.log('\nInstitutions cover_image_url:');
        console.table(insts);
    }

    // 2. Inspect artworks
    const { data: arts, error: err2 } = await supabase
        .from('artworks')
        .select('title, primary_image_url')
        .limit(5);

    if (err2) {
        console.error('Error for artworks:', err2.message);
    } else {
        console.log('\nArtworks primary_image_url:');
        console.table(arts);
    }

    // 3. Inspect users (profiles)
    const { data: users, error: err3 } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .neq('avatar_url', null)
        .limit(5);

    if (err3) {
        console.error('Error for users:', err3.message);
    } else {
        console.log('\nUsers avatar_url:');
        console.table(users);
    }
}

inspect();
