/**
 * Cleanup Duplicates Script v2 — Strict Mode
 * 
 * Deletes ALL "g-ChI*" institution records when a corresponding curated record 
 * (via PLACE_ID_TO_SEED_SLUG) exists in the database.
 * 
 * Usage: npx ts-node scripts/cleanup-duplicates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Google Place ID → curated slug mapping (mirrors museums.service.ts) */
const PLACE_ID_TO_SEED_SLUG: Record<string, string> = {
  'ChIJTwoHg49Xei4R7sU-xBpDEJ0': 'museum-sonobudoyo-74',
  'ChIJi_JxtdT1aS4R7Vhgb1ZBFaQ': 'museum-nasional',
  'ChIJV_3rrx33aS4R9vCzPVkjlvE': 'macan-museum',
  'ChIJpZUM-zL0aS4RqDE5R5aunFo': 'national-gallery-indonesia',
  'ChIJuQp5_QJeei4RcSZ5sDVg_qM': 'ullen-sentalu-museum',
  'ChIJla-K1d8p1i0REM_An7XviuQ': 'museum-mpu-purwa',
  'ChIJ1YTFHCko1i0RAity7NV-lEQ': 'museum-brawijaya',
  'ChIJT27dkkEp1i0RDObCeqONtSs': 'museum-musik-indonesia',
  'ChIJfc_03_Al1i0RU2LnHo9wE-0': 'museum-panji',
  'ChIJEyzN0y2HeC4ROB080owDlTI': 'museum-angkut',
  'ChIJYy1NuCuBeC4RP96afYPzlLU': 'museum-satwa-jawa-timur-park-2',
  'ChIJx7Y_1tSAeC4RRRVDlDRa_-U': 'the-bagong-adventure-museum-tubuh',
  'ChIJQSL5xeb71y0RXLfWmD5s3G0': 'sadikin-pard-gallery',
  'ChIJ6Z13tzSHeC4RrIyhQJ7UjyY': 'galeri-raos-batu',
  'ChIJpdN9cieDeC4RL6fVx0_EVzM': 'oemah-boedaya-slamet',
  'ChIJizzSwrCAeC4RLPgOBBjOgXA': 'oemah-boedaya-slamet',
  'ChIJuQcd1iqHeC4RgJdHUq1IqFk': 'jawa-timur-park-1',
  'ChIJyYo8W5Ip1i0RlLTNdG6H_bE': 'seroomah',
  'ChIJOaclQjQp1i0R1WowgQ3IhZI': 'epic-tattoo-studio',
  'ChIJVceZEUuBeC4R-qmGnOpPypo': 'flockink-tattoo-studio',
  'ChIJNVIILZ2CeC4RWN26myj1Rxg': 'istana-boneka-wilis',
  'ChIJRSPR7nGCeC4R2j5H2JdoBY4': 'istana-boneka-gajayana',
  'ChIJlbu7KZKBeC4RhQ_f2lOboog': 'istana-boneka-batu',
  'ChIJUdaQnkKBeC4RUaxe_sokFZo': 'batu-economis-park',
  'ChIJ3__ZfFMp1i0RZf7DgqJQR2E': 'kampung-warna-warni-jodipan',
  'ChIJx2CsGxgo1i0RtBA4m_YOH-c': 'alun-alun-malang',
  'ChIJrZ8aoyIo1i0RjOHX0gpmp10': 'masjid-agung-jami-kota-malang',
  'ChIJlVd8Ui8o1i0RpagwoIHbj08': 'katedral-santa-perawan-maria-dari-gunung-karmel-malang',
  'ChIJx6Buzt8p1i0RR5V5o4crP1s': 'taman-krida-budaya-jawa-timur',
  'ChIJVxN4YY6BeC4R1d1EueGiN7o': 'taman-rekreasi-sengkaling',
  'ChIJ569mZIYp1i0RABy8uVtD5EE': 'malang-night-paradise',
  'ChIJG6qe4p-BeC4R6UG0ILWljWM': 'milenial-glow-garden',
  'ChIJ23IsPzCBeC4RIex3GhfXPpU': 'batu-night-spectacular',
  'ChIJV6nzSBiBeC4RzeN-XrMTABs': 'jawa-timur-park-3',
  'ChIJ_____9aAeC4Rd_3Uf_hgZfM': 'jawa-timur-park-2',
  'ChIJdQ9eOOgp1i0Rkgk8RNUDpC8': 'hawai-waterpark',
  'ChIJdQCp2Sco1i0RZcIIQN5ZjZE': 'idjen-boulevard',
  'ChIJWZVoXMAp1i0RUMBQA8QsFvM': 'masjid-sabilillah-malang',
  'ChIJuQHavjcr1i0R5PW4p0-0-y8': 'rumah-seni-budaya-singhasari',
  'ChIJxcUvTGAq1i0RR2Kgu6mXo9c': 'museum-singhasari',
  'ChIJZ6ifOFkp1i0RubO4-SCZ_6g': 'museum-ganesya',
  'ChIJqRO4umCCeC4R6qcMvXohbks': 'museum-zoologi-frater-vianney',
  'ChIJh5QNLnZ-eC4RQCvB8atMgLg': 'taman-rekreasi-selecta',
  'ChIJUZoMLDeBeC4R-j3PXXf-mMI': 'alun-alun-kota-wisata-batu',
  'ChIJPxDw5HaCeC4RDUReGbgs6RQ': 'jembatan-soekarno-hatta-malang',
  'ChIJb2P6J4cp1i0RKOlBijtKgMQ': 'lapangan-rampal',
  'ChIJ03FL41gn1i0R3o621DRhYnM': 'islamic-center-kota-malang',
  'ChIJ3-anZmyCeC4RW8r6-oaITCs': 'taman-singha-merjosari',
  'ChIJvWqpXyop1i0RECn5leQUQUw': 'kampoeng-heritage-kajoetangan',
};

// Build the set of "g-" slugs that correspond to curated records
const DUPLICATE_SLUGS = Object.keys(PLACE_ID_TO_SEED_SLUG).map(placeId => `g-${placeId}`);

async function main() {
  console.log('🔍 Scanning for ALL "g-ChI*" duplicate institution records...\n');

  // 1. Find all institutions with "g-" slugs that map to curated records
  const { data: duplicates, error } = await supabase
    .from('institutions')
    .select('id, name, slug, cover_image_url, type, city')
    .in('slug', DUPLICATE_SLUGS);

  if (error) {
    console.error('❌ Failed to fetch institutions:', error.message);
    process.exit(1);
  }

  if (!duplicates || duplicates.length === 0) {
    console.log('✅ No "g-ChI*" duplicates found. Database is clean!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate "g-ChI*" record(s) to delete:\n`);

  for (const dup of duplicates) {
    const placeId = dup.slug.substring(2);
    const curatedSlug = PLACE_ID_TO_SEED_SLUG[placeId] || '???';
    console.log(`  🗑  "${dup.name}" [${dup.slug}]`);
    console.log(`     → Curated: ${curatedSlug} | Cover: ${dup.cover_image_url ? 'YES' : 'NO'} | City: ${dup.city}`);
  }

  // 2. Delete them
  console.log(`\n🧹 Deleting ${duplicates.length} duplicate records...\n`);

  const idsToDelete = duplicates.map(d => d.id);

  // Delete in batches of 50 to avoid payload limits
  const batchSize = 50;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error: deleteError } = await supabase
      .from('institutions')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`  ❌ Failed to delete batch ${i / batchSize + 1}: ${deleteError.message}`);
    } else {
      console.log(`  ✅ Deleted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  // 3. Verification
  const { count } = await supabase
    .from('institutions')
    .select('id', { count: 'exact', head: true });

  // Re-check: any remaining g-ChI* duplicates?
  const { data: remaining } = await supabase
    .from('institutions')
    .select('slug')
    .in('slug', DUPLICATE_SLUGS);

  console.log(`\n📊 Results:`);
  console.log(`  Total institutions remaining: ${count}`);
  console.log(`  Remaining g-ChI* duplicates: ${remaining?.length ?? 0}`);
  console.log('✅ Cleanup complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
