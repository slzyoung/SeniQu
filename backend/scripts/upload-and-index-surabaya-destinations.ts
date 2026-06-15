import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

const DESTINATIONS = [
  // --- Surabaya Timur ---
  {
    name: 'Hutan Mangrove Wonorejo',
    slug: 'hutan-mangrove-wonorejo',
    type: 'heritage',
    lat: -7.3117,
    lng: 112.8220,
    description: 'Kawasan ekowisata mangrove Wonorejo di timur Surabaya dengan jembatan kayu melintasi hutan bakau yang asri, habitat burung migran, dan perahu wisata.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/mangrove_wonorejo_1781533670055.png',
    key: 'museums/images/hutan-mangrove-wonorejo.png'
  },
  {
    name: 'Kenjeran Park',
    slug: 'kenjeran-park-heritage',
    type: 'heritage',
    lat: -7.2525,
    lng: 112.7969,
    description: 'Taman rekreasi pantai Kenjeran dengan arsitektur pagoda khas Tionghoa (Pagoda Tian Ti), patung Kwan Im raksasa, dan pemandangan Selat Madura.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/kenjeran_park_1781533681976.png',
    key: 'museums/images/kenjeran-park.png'
  },
  {
    name: 'Taman Harmoni',
    slug: 'taman-harmoni-keputih',
    type: 'heritage',
    lat: -7.2952,
    lng: 112.8035,
    description: 'Taman kota yang indah di Keputih, Surabaya Timur, terkenal dengan hutan bambu rindang bergaya Jepang serta taman bunga berwarna-warni.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/taman_harmoni_1781533695381.png',
    key: 'museums/images/taman-harmoni.png'
  },
  // --- Surabaya Barat ---
  {
    name: 'Ciputra Waterpark',
    slug: 'ciputra-waterpark-surabaya',
    type: 'heritage',
    lat: -7.2920,
    lng: 112.6420,
    description: 'Taman rekreasi air bertema petualangan Sinbad yang megah di kawasan perumahan elit CitraLand Surabaya Barat.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/ciputra_waterpark_1781533712748.png',
    key: 'museums/images/ciputra-waterpark.png'
  },
  {
    name: 'Graha Natura Park',
    slug: 'graha-natura-park-heritage',
    type: 'heritage',
    lat: -7.2755,
    lng: 112.6671,
    description: 'Taman hijau modern di Surabaya Barat dengan danau buatan yang tenang, jogging track rindang, dan arsitektur lanskap kontemporer.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/graha_natura_park_1781533736981.png',
    key: 'museums/images/graha-natura-park.png'
  },
  {
    name: 'Vin Autism Gallery',
    slug: 'vin-autism-gallery-art',
    type: 'gallery',
    lat: -7.2950,
    lng: 112.6546,
    description: 'Galeri seni rupa di Surabaya Barat yang memamerkan karya lukis luar biasa dari anak-anak berkebutuhan khusus.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/vin_autism_gallery_1781533750576.png',
    key: 'museums/images/vin-autism-gallery.png'
  },
  // --- Surabaya Utara ---
  {
    name: 'House of Sampoerna',
    slug: 'house-of-sampoerna-museum',
    type: 'museum',
    lat: -7.2307,
    lng: 112.7340,
    description: 'Museum sejarah kretek legendaris di Surabaya Utara dengan gedung kolonial Belanda yang megah dan terawat indah.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/house_of_sampoerna_1781533761968.png',
    key: 'museums/images/house-of-sampoerna.png'
  },
  {
    name: 'Jembatan Merah',
    slug: 'jembatan-merah-heritage',
    type: 'heritage',
    lat: -7.2355,
    lng: 112.7350,
    description: 'Jembatan bersejarah di Surabaya Utara yang menjadi saksi pertempuran heroik Arek-Arek Suroboyo melawan tentara sekutu pada November 1945.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/jembatan_merah_1781533775871.png',
    key: 'museums/images/jembatan-merah.png'
  },
  {
    name: 'Surabaya North Quay',
    slug: 'surabaya-north-quay-maritime',
    type: 'heritage',
    lat: -7.1969,
    lng: 112.7322,
    description: 'Destinasi wisata maritim modern di atap Terminal Gapura Surya Nusantara Pelabuhan Tanjung Perak, menawarkan pemandangan kapal pesiar dan sunset Selat Madura.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/surabaya_north_quay_1781533800467.png',
    key: 'museums/images/surabaya-north-quay.png'
  },
  {
    name: 'Jembatan Suramadu',
    slug: 'jembatan-suramadu-landmark',
    type: 'heritage',
    lat: -7.1950,
    lng: 112.7820,
    description: 'Jembatan tol nasional terpanjang di Indonesia yang menghubungkan Pulau Jawa (Surabaya) dan Pulau Madura.',
    localImage: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/suramadu_bridge_1781533814087.png',
    key: 'museums/images/suramadu-bridge.png'
  }
];

async function main() {
  console.log('🚀 Starting Surabaya destinations update/upload process...');

  for (const dest of DESTINATIONS) {
    if (!fs.existsSync(dest.localImage)) {
      console.error(`❌ Local image not found: ${dest.localImage}`);
      continue;
    }

    const buf = fs.readFileSync(dest.localImage);
    console.log(`📤 Uploading image for ${dest.name} → R2 (${(buf.length/1024).toFixed(1)} KB)`);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: dest.key,
      Body: buf,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const cdnUrl = `${PUBLIC_URL}/${dest.key}`;
    console.log(`   ✅ R2 CDN URL: ${cdnUrl}`);

    // Check if the place already exists by name or slug
    const { data: existing, error: findError } = await supabase
      .from('institutions')
      .select('id')
      .or(`name.eq."${dest.name}",slug.eq."${dest.slug}"`)
      .maybeSingle();

    if (findError) {
      console.error(`❌ Error finding ${dest.name}:`, findError.message);
      continue;
    }

    const wktLocation = `POINT(${dest.lng} ${dest.lat})`;
    const instData = {
      name: dest.name,
      slug: dest.slug,
      type: dest.type,
      description: dest.description,
      cover_image_url: cdnUrl,
      city: 'Surabaya',
      province: 'Jawa Timur',
      is_verified: true,
      rating: 4.8,
      location: wktLocation,
      owner_id: '8153fce9-d95b-484b-88ce-156491540645'
    };

    if (existing) {
      console.log(`🔄 Updating existing institution ID: ${existing.id}`);
      const { error: updateError } = await supabase
        .from('institutions')
        .update(instData)
        .eq('id', existing.id);

      if (updateError) {
        console.error(`❌ Failed to update ${dest.name}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated successfully.`);
      }
    } else {
      console.log(`➕ Inserting new institution...`);
      const { error: insertError } = await supabase
        .from('institutions')
        .insert(instData);

      if (insertError) {
        console.error(`❌ Failed to insert ${dest.name}:`, insertError.message);
      } else {
        console.log(`   ✅ Inserted successfully.`);
      }
    }
  }

  console.log('\n🎉 Surabaya destinations update/upload completed successfully!');
}

main().catch(console.error);
