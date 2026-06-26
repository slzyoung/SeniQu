import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const lat = -7.2575;
    const lng = 112.7521;
    const radiusKm = 35;

    const { data, error } = await supabase.rpc('find_nearby_institutions', {
        lat,
        lng,
        radius_km: radiusKm
    });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`RPC returned ${data?.length || 0} places:`);
    data?.forEach((x: any) => {
        console.log(`- ${x.name} (${x.city})`);
    });
}

check();
