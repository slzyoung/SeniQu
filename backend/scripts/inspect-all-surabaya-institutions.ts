import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .or('city.eq.Surabaya,city.ilike.%surabaya%');

    if (error) {
        console.error('Error fetching institutions:', error);
        return;
    }

    console.log(`Found ${data?.length || 0} institutions in Surabaya:`);
    data?.forEach(inst => {
        console.log(`- ID: ${inst.id}\n  Name: ${inst.name}\n  Slug: ${inst.slug}\n  Type: ${inst.type}\n  Address: ${inst.address}\n  Lat/Lng: ${inst.location || 'null'}\n  Cover: ${inst.cover_image_url}\n`);
    });
}

check();
