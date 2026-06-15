import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { count, error } = await supabase
        .from('institutions')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`True count of verified institutions: ${count}`);
}

check();
