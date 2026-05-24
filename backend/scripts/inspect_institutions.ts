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
    console.log("--- Inspecting Institutions Table ---");
    const { data, error } = await supabase
        .from('institutions')
        .select('id, name, city, province, type, is_verified');

    if (error) {
        console.error("Error fetching institutions:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No institutions found in database.");
        return;
    }

    console.log(`Total institutions in DB: ${data.length}`);
    
    // Group by City and Type
    const groups: Record<string, Record<string, number>> = {};
    for (const inst of data) {
        const city = inst.city || 'Unknown';
        const type = inst.type || 'Unknown';
        if (!groups[city]) groups[city] = {};
        if (!groups[city][type]) groups[city][type] = 0;
        groups[city][type]++;
    }

    console.log("\nBreakdown by City and Type:");
    console.table(groups);

    // List some items
    console.log("\nSample records (first 10):");
    console.table(data.slice(0, 10).map(i => ({ name: i.name, city: i.city, type: i.type, is_verified: i.is_verified })));
}

inspect();
