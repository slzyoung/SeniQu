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
        .select('name, is_verified, city, province')
        .eq('is_verified', true);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total verified institutions in entire database: ${data?.length || 0}`);
    data?.forEach((x, i) => {
        console.log(`${i+1}. ${x.name} (${x.city}, ${x.province})`);
    });
}

check();
