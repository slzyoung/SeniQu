/**
 * Upload Surabaya region images to Cloudflare R2 CDN and index them in the database
 */
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const IMAGES_TO_UPLOAD = [
  {
    src: '/home/wii-ros/Documents/Project/seniqu-webapp/frontend/public/images/city/surabayapusat.jpeg',
    key: 'cities/surabayapusat.jpeg',
    mime: 'image/jpeg',
    regionName: 'Surabaya Pusat',
    slug: 'surabaya-pusat-heritage',
    description: 'Pusat bersejarah Kota Surabaya yang mencakup Monumen Kapal Selam, Museum Sepuluh Nopember, dan kawasan cagar budaya Genteng/Tegalsari.',
    lat: -7.2600,
    lng: 112.7425
  },
  {
    src: '/home/wii-ros/Documents/Project/seniqu-webapp/frontend/public/images/city/surabaya_barat.jpg',
    key: 'cities/surabaya_barat.jpg',
    mime: 'image/jpeg',
    regionName: 'Surabaya Barat',
    slug: 'surabaya-barat-heritage',
    description: 'Kawasan modern Surabaya Barat yang memadukan arsitektur perkotaan kontemporer dengan taman hijau terbuka dan destinasi rekreasi keluarga.',
    lat: -7.2800,
    lng: 112.6500
  },
  {
    src: '/home/wii-ros/Documents/Project/seniqu-webapp/frontend/public/images/city/surabaya_utara.jpeg',
    key: 'cities/surabaya_utara.jpeg',
    mime: 'image/jpeg',
    regionName: 'Surabaya Utara',
    slug: 'surabaya-utara-heritage',
    description: 'Kawasan maritim bersejarah di utara Surabaya yang menghubungkan Selat Madura dengan pelabuhan legendaris dan Jembatan Suramadu.',
    lat: -7.2100,
    lng: 112.7300
  }
];

async function main() {
  console.log('🚀 Starting Surabaya region CDN upload & database indexing...\n');

  // 1. Get admin user id for the owner_id column
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@seniqu.com')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('❌ Could not find admin user (admin@seniqu.com) to own the institutions:', userError?.message);
    process.exit(1);
  }
  const ownerId = users[0].id;
  console.log(`👤 Owner ID resolved to admin user: ${ownerId}\n`);

  const urls: Record<string, string> = {};

  // 2. Upload each image to R2 CDN
  for (const img of IMAGES_TO_UPLOAD) {
    if (!fs.existsSync(img.src)) {
      console.error(`❌ Source file not found: ${img.src}`);
      continue;
    }

    const buf = fs.readFileSync(img.src);
    console.log(`📤 Uploading ${path.basename(img.src)} (${(buf.length/1024).toFixed(1)} KB) → ${img.key}`);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: img.key,
      Body: buf,
      ContentType: img.mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const publicUrl = `${PUBLIC_URL}/${img.key}`;
    console.log(`   ✅ R2 URL: ${publicUrl}`);
    urls[img.slug] = publicUrl;

    // 3. Insert or update the institution in Supabase database
    console.log(`💾 Indexing metadata in database for: ${img.regionName}`);
    
    // We construct the PostGIS Point representation
    // format: Point(longitude latitude) -> Point(lng lat)
    const pointWkt = `POINT(${img.lng} ${img.lat})`;

    // First check if it exists
    const { data: existing, error: findError } = await supabase
      .from('institutions')
      .select('id')
      .eq('slug', img.slug)
      .limit(1);

    if (findError) {
      console.error(`   ❌ Error finding institution ${img.slug}:`, findError.message);
      continue;
    }

    const locationWkt = `POINT(${img.lng} ${img.lat})`;

    if (existing && existing.length > 0) {
      // Update
      const { error: updateError } = await supabase
        .from('institutions')
        .update({
          name: img.regionName,
          description: img.description,
          cover_image_url: publicUrl,
          type: 'heritage',
          city: 'Surabaya',
          province: 'East Java',
          country: 'Indonesia',
          is_verified: true,
          rating: 4.5,
          location: locationWkt
        })
        .eq('slug', img.slug);

      if (updateError) {
        console.error(`   ❌ Error updating ${img.slug}:`, updateError.message);
      } else {
        console.log(`   ✅ Successfully updated database record in institutions table.`);
      }
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('institutions')
        .insert({
          owner_id: ownerId,
          name: img.regionName,
          slug: img.slug,
          description: img.description,
          type: 'heritage',
          city: 'Surabaya',
          province: 'East Java',
          country: 'Indonesia',
          cover_image_url: publicUrl,
          is_verified: true,
          rating: 4.5,
          location: locationWkt
        });

      if (insertError) {
        console.error(`   ❌ Error inserting ${img.slug}:`, insertError.message);
      } else {
        console.log(`   ✅ Successfully inserted database record in institutions table.`);
      }
    }
  }

  console.log('\n🎉 Surabaya region CDN upload & database indexing completed!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
