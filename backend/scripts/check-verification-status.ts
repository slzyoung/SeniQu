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
        .select('id, name, is_verified, slug')
        .ilike('name', '%Surabaya%');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total Surabaya institutions found: ${data?.length || 0}`);
    const verified = data?.filter(x => x.is_verified === true) || [];
    const unverified = data?.filter(x => x.is_verified !== true) || [];
    
    console.log(`Verified count: ${verified.length}`);
    console.log(`Unverified count: ${unverified.length}`);
    
    console.log('\nSample unverified:');
    unverified.slice(0, 10).forEach(x => {
        console.log(`- ${x.name} (${x.is_verified})`);
    });
}

check();
