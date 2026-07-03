import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: collections } = await supabase.from('collections').select('*');
  console.log('--- COLLECTIONS ---');
  console.log(JSON.stringify(collections, null, 2));

  const { data: photoCollections } = await supabase.from('photo_collections').select('*');
  console.log('--- PHOTO COLLECTIONS ---');
  console.log(JSON.stringify(photoCollections, null, 2));
}

check();
