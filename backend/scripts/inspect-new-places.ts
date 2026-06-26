import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const names = [
        'Hutan Mangrove Wonorejo', 'Kenjeran Park', 'Taman Harmoni', 
        'Ciputra Waterpark', 'Graha Natura Park', 'Vin Autism Gallery',
        'House of Sampoerna', 'Jembatan Merah', 'Surabaya North Quay', 'Jembatan Suramadu'
    ];

    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .in('name', names);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data?.length || 0} matching institutions in DB:`);
    data?.forEach(x => {
        console.log(`- Name: ${x.name}\n  Location: ${x.location}\n  Verified: ${x.is_verified}\n  City: ${x.city}\n  Cover: ${x.cover_image_url}\n`);
    });
}

check();
