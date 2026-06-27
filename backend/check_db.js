const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables are missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- FETCHING ALL ARTWORKS ---');
  const { data: artworks, error: artError } = await supabase
    .from('artworks')
    .select('*');

  if (artError) {
    console.error('Artworks query error:', artError);
  } else {
    console.log(`Found ${artworks.length} artworks total.`);
    artworks.slice(0, 5).forEach(art => {
      console.log(`ID: ${art.id} | Title: "${art.title}" | Region: "${art.region}" | Institution ID: "${art.institution_id}" | Status: "${art.status}" | Verified: ${art.is_verified}`);
    });
  }

  console.log('\n--- FETCHING ALL INSTITUTIONS ---');
  const { data: insts, error: instError } = await supabase
    .from('institutions')
    .select('*');

  if (instError) {
    console.error('Institutions query error:', instError);
  } else {
    console.log(`Found ${insts.length} institutions total.`);
    insts.slice(0, 5).forEach(inst => {
      console.log(`ID: ${inst.id} | Name: "${inst.name}" | City: "${inst.city}" | Verified: ${inst.is_verified}`);
    });
  }
}

main();
