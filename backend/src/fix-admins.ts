import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdmins() {
  console.log("Fixing email verification for existing admin/artist accounts...");
  
  const { data, error } = await supabase
    .from('users')
    .update({ is_email_verified: true, is_verified: true })
    .in('role', ['admin', 'super_admin', 'artist'])
    .eq('is_email_verified', false)
    .select('id, email, role');

  if (error) {
    console.error("Error updating users:", error);
  } else {
    console.log(`Successfully updated ${data?.length || 0} users.`);
    console.log(data);
  }
}

fixAdmins().catch(console.error);
