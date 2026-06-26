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
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in institutions table:');
        console.log(Object.keys(data[0]));
    }
}

check();
