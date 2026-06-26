/**
 * Audit Script - Verify curated institutions have proper metadata
 * 
 * Checks that all PLACE_ID_TO_SEED_SLUG target records exist in the database
 * and have proper cover images (not null, not dummy/borobudur).
 * 
 * Usage: npx ts-node scripts/audit-institutions.ts
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

// All curated slugs from PLACE_ID_TO_SEED_SLUG
const CURATED_SLUGS: string[] = [
  'museum-sonobudoyo-74',
  'museum-nasional',
  'macan-museum',
  'national-gallery-indonesia',
  'ullen-sentalu-museum',
  'museum-mpu-purwa',
  'museum-brawijaya',
  'museum-musik-indonesia',
  'museum-panji',
  'museum-angkut',
  'museum-satwa-jawa-timur-park-2',
  'the-bagong-adventure-museum-tubuh',
  'sadikin-pard-gallery',
  'galeri-raos-batu',
  'oemah-boedaya-slamet',
  'jawa-timur-park-1',
  'seroomah',
  'epic-tattoo-studio',
  'flockink-tattoo-studio',
  'istana-boneka-wilis',
  'istana-boneka-gajayana',
  'istana-boneka-batu',
  'batu-economis-park',
  'kampung-warna-warni-jodipan',
  'alun-alun-malang',
  'masjid-agung-jami-kota-malang',
  'katedral-santa-perawan-maria-dari-gunung-karmel-malang',
  'taman-krida-budaya-jawa-timur',
  'taman-rekreasi-sengkaling',
  'malang-night-paradise',
  'milenial-glow-garden',
  'batu-night-spectacular',
  'jawa-timur-park-3',
  'jawa-timur-park-2',
  'hawai-waterpark',
  'idjen-boulevard',
  'masjid-sabilillah-malang',
  'rumah-seni-budaya-singhasari',
  'museum-singhasari',
  'museum-ganesya',
  'museum-zoologi-frater-vianney',
  'taman-rekreasi-selecta',
  'alun-alun-kota-wisata-batu',
  'jembatan-soekarno-hatta-malang',
  'lapangan-rampal',
  'islamic-center-kota-malang',
  'taman-singha-merjosari',
  'kampoeng-heritage-kajoetangan',
];

async function main() {
  console.log('🔍 Auditing curated institution records...\n');

  const { data: institutions, error } = await supabase
    .from('institutions')
    .select('id, name, slug, type, city, cover_image_url, description, reviews, rating')
    .in('slug', CURATED_SLUGS);

  if (error) {
    console.error('❌ Failed to fetch institutions:', error.message);
    process.exit(1);
  }

  const slugMap = new Map(institutions.map(i => [i.slug, i]));

  let missingCount = 0;
  let noCoverCount = 0;
  let dummyCoverCount = 0;
  let noDescCount = 0;
  let okCount = 0;

  console.log('━'.repeat(100));
  console.log('  Status │ Slug                                                            │ Cover │ Type');
  console.log('━'.repeat(100));

  for (const slug of CURATED_SLUGS) {
    const inst = slugMap.get(slug);

    if (!inst) {
      console.log(`  ❌ MISS │ ${slug.padEnd(60)} │       │`);
      missingCount++;
      continue;
    }

    const hasCover = !!inst.cover_image_url;
    const isDummyCover = inst.cover_image_url?.includes('borobudur') || inst.cover_image_url?.includes('unsplash');
    const hasDesc = inst.description && inst.description.length > 50 && !inst.description.startsWith('Tempat bersejarah/budaya:');

    let status = '✅ OK  ';
    const issues: string[] = [];

    if (!hasCover) {
      status = '⚠️  WARN';
      issues.push('NO_COVER');
      noCoverCount++;
    } else if (isDummyCover) {
      status = '⚠️  WARN';
      issues.push('DUMMY_COVER');
      dummyCoverCount++;
    }

    if (!hasDesc) {
      if (status === '✅ OK  ') status = '⚠️  WARN';
      issues.push('NO_DESC');
      noDescCount++;
    }

    if (issues.length === 0) okCount++;

    const coverShort = hasCover
      ? (isDummyCover ? 'DUMMY' : (inst.cover_image_url.includes('cdn.seniqu') ? 'CDN' : 'WIKI'))
      : 'NONE';

    console.log(`  ${status} │ ${slug.padEnd(60)} │ ${coverShort.padEnd(5)} │ ${inst.type}`);
    if (issues.length > 0) {
      console.log(`         │ ${'  Issues: ' + issues.join(', ')}`.padEnd(60));
    }
  }

  console.log('━'.repeat(100));
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ OK:            ${okCount}`);
  console.log(`  ❌ Missing:       ${missingCount}`);
  console.log(`  ⚠️  No cover:      ${noCoverCount}`);
  console.log(`  ⚠️  Dummy cover:   ${dummyCoverCount}`);
  console.log(`  ⚠️  No description: ${noDescCount}`);
  console.log(`  📊 Total curated: ${CURATED_SLUGS.length}`);

  // Also check for any institutions with null cover_image_url in Malang/Batu
  console.log('\n\n🔍 Checking Malang/Batu institutions without cover images...\n');

  const { data: malangInsts, error: malangErr } = await supabase
    .from('institutions')
    .select('id, name, slug, type, city, cover_image_url')
    .or('city.ilike.%Malang%,city.ilike.%Batu%')
    .is('cover_image_url', null)
    .order('name');

  if (malangErr) {
    console.error('❌ Failed to query Malang/Batu:', malangErr.message);
  } else if (malangInsts.length === 0) {
    console.log('  ✅ All Malang/Batu institutions have cover images!');
  } else {
    console.log(`  Found ${malangInsts.length} institutions without cover images:`);
    for (const inst of malangInsts) {
      console.log(`    🖼️  "${inst.name}" [${inst.slug}] (${inst.city}) - type: ${inst.type}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
