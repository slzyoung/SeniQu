import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_rpc_source', { rpc_name: 'find_nearby_institutions' });
    if (error) {
        // Alternatively, query via pg_proc
        const { data: procData, error: procError } = await supabase.rpc('execute_sql', {
            sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'find_nearby_institutions';"
        });
        if (procError) {
            console.error('procError:', procError);
            return;
        }
        console.log('Function source:', procData);
        return;
    }
    console.log('Function source:', data);
}

check();
