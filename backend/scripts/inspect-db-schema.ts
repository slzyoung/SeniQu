import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    // Query list of institutions to see one of their owner_id values
    const { data, error } = await supabase
        .from('institutions')
        .select('id, name, owner_id')
        .limit(5);

    if (error) {
        console.error('Error fetching sample institutions:', error);
        return;
    }

    console.log('Sample institutions with owners:');
    data?.forEach(inst => {
        console.log(`- ID: ${inst.id}, Name: ${inst.name}, OwnerID: ${inst.owner_id}`);
    });
}

check();
