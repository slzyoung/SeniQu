const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !supabaseUrl || !supabaseKey) {
  console.error('Error: Environment variables are missing!');
  process.exit(1);
}

// R2 Client configuration
const s3 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'auto',
});

// Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// Target folders to scan
const FOLDERS = [
  {
    prefix: 'Bali/Museum/MUSEUM PASIFIKA/',
    institutionName: 'Museum Pasifika',
    city: 'Bali',
    province: 'Bali',
    type: 'museum',
    region: 'Bali'
  },
  {
    prefix: 'DKI JAKARTA/Jakarta Barat/Museum/Museum Bank Indonesia/',
    institutionName: 'Museum Bank Indonesia',
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    type: 'museum',
    region: 'DKI JAKARTA'
  },
  {
    prefix: 'DKI JAKARTA/Jakarta Pusat/Galeri/Galeri Nasional Indonesia/',
    institutionName: 'Galeri Nasional Indonesia',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    type: 'gallery',
    region: 'DKI JAKARTA'
  },
  {
    prefix: 'DKI JAKARTA/Jakarta Timur/Museum/Museum Paseban/',
    institutionName: 'Museum Paseban',
    city: 'Jakarta Timur',
    province: 'DKI Jakarta',
    type: 'museum',
    region: 'DKI JAKARTA'
  },
  {
    prefix: 'Jawa Tengah/Semarang/Galery/Semarang Contemporary Art Gallery/',
    institutionName: 'Semarang Contemporary Art Gallery',
    city: 'Semarang',
    province: 'Jawa Tengah',
    type: 'gallery',
    region: 'Jawa Tengah'
  },
  {
    prefix: 'Jawa Tengah/Tegal/Museum/Museum Semedo/',
    institutionName: 'Museum Semedo',
    city: 'Tegal',
    province: 'Jawa Tengah',
    type: 'museum',
    region: 'Jawa Tengah'
  },
  {
    prefix: 'Yogyakarta/Museum/Museum Sonobudoyo/',
    institutionName: 'Museum Sonobudoyo',
    city: 'Yogyakarta',
    province: 'Yogyakarta',
    type: 'museum',
    region: 'Yogyakarta'
  }
];

// Fallback user / owner ID
const SEED_USER_ID = '3421303e-6aad-4e0b-b343-7c9255c369f9';

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function cleanTitle(key, instName) {
  const fileName = key.split('/').pop().split('.')[0];
  
  // Clean date patterns e.g. 20260308_131836 or IMG_20260324_124854_825
  if (/^\d{8}_\d{6}$/.test(fileName)) {
    const parts = fileName.split('_');
    return `${instName} Asset #${parts[1]}`;
  }
  if (/^IMG_\d{8}_\d{6}_\d+$/.test(fileName)) {
    const parts = fileName.split('_');
    return `${instName} Preservation #${parts[2]}`;
  }
  if (/^IMG_\d+$/.test(fileName)) {
    const parts = fileName.split('_');
    return `${instName} Asset #${parts[1]}`;
  }
  
  // Replace underscores/dashes with spaces and capitalize
  return fileName
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function main() {
  console.log('Starting S3/R2 scanning and indexing...');

  for (const config of FOLDERS) {
    console.log(`\n--- PROCESSING: ${config.institutionName} ---`);
    
    // 1. Fetch files in R2 matching this prefix
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: config.prefix,
        MaxKeys: 100
      });
      
      const response = await s3.send(command);
      if (!response.Contents || response.Contents.length === 0) {
        console.log(`No objects found in prefix: ${config.prefix}. Skipping.`);
        continue;
      }
      
      // Filter out folder placeholders and non-images
      const imageFiles = response.Contents.filter(item => {
        const key = item.Key.toLowerCase();
        return key !== config.prefix.toLowerCase() && 
               (key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.png') || key.endsWith('.webp') || key.endsWith('.heic'));
      });
      
      console.log(`Found ${imageFiles.length} valid images in R2 bucket.`);
      if (imageFiles.length === 0) continue;
      
      // Take up to 20 files
      const targetFiles = imageFiles.slice(0, 20);
      console.log(`Selected first ${targetFiles.length} files to index.`);
      
      // 2. Find or create institution in database
      let instId = null;
      const { data: existingInsts, error: fetchError } = await supabase
        .from('institutions')
        .select('id')
        .ilike('name', `%${config.institutionName}%`);
        
      if (fetchError) {
        console.error(`Error querying institution ${config.institutionName}:`, fetchError);
        continue;
      }
      
      const existingInst = existingInsts && existingInsts.length > 0 ? existingInsts[0] : null;
      
      if (existingInst) {
        instId = existingInst.id;
        console.log(`Found existing institution in DB with ID: ${instId}`);
      } else {
        console.log(`Institution ${config.institutionName} not found in DB. Creating...`);
        const slug = makeSlug(config.institutionName);
        const { data: newInst, error: insertInstError } = await supabase
          .from('institutions')
          .insert({
            owner_id: SEED_USER_ID,
            name: config.institutionName,
            slug,
            description: `A collection preserved from ${config.institutionName} situated in ${config.city}.`,
            type: config.type,
            city: config.city,
            province: config.province,
            is_verified: true,
            is_featured: true,
            cover_image_url: `https://cdn.seniqu.art/${targetFiles[0].Key}`
          })
          .select('id')
          .single();
          
        if (insertInstError) {
          console.error(`Error creating institution ${config.institutionName}:`, insertInstError);
          continue;
        }
        
        instId = newInst.id;
        console.log(`Created institution with ID: ${instId}`);
      }
      
      // 3. Index artworks under this institution
      for (const item of targetFiles) {
        const title = cleanTitle(item.Key, config.institutionName);
        const imageUrl = `https://cdn.seniqu.art/${item.Key}`;
        
        // Check if already indexed
        const { data: existingArt, error: artCheckError } = await supabase
          .from('artworks')
          .select('id')
          .eq('title', title)
          .eq('institution_id', instId)
          .maybeSingle();
          
        if (artCheckError) {
          console.error(`Error checking artwork:`, artCheckError);
          continue;
        }
        
        if (existingArt) {
          console.log(`Artwork "${title}" already exists in DB. Skipping.`);
          continue;
        }
        
        // Generate pseudo certificate hash
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(item.Key).digest('hex');
        
        const slug = makeSlug(title) + '-' + Math.floor(100000 + Math.random() * 900000);
        
        // Insert into artworks
        const { data: newArt, error: artInsertError } = await supabase
          .from('artworks')
          .insert({
            artist_id: SEED_USER_ID,
            institution_id: instId,
            title,
            slug,
            description: `Karya seni bersejarah dari ${config.institutionName} yang dipreservasi ke penyimpanan terdistribusi Cloudflare R2 CDN regional.`,
            genres: ['Heritage', 'Historical'],
            medium: 'Digital Preservation',
            year_created: 2026,
            primary_image_url: imageUrl,
            images: {
              medium_url: imageUrl,
              thumbnail_url: imageUrl,
              additional_images: [imageUrl],
              poa_certificate: {
                r2Path: item.Key,
                hash,
                timestamp: new Date().toISOString(),
                algorithm: 'sha256'
              }
            },
            is_art: true,
            status: 'published',
            region: config.region
          })
          .select('id')
          .single();
          
        if (artInsertError) {
          console.error(`Error inserting artwork "${title}":`, artInsertError);
        } else {
          console.log(`Indexed artwork: "${title}" | ID: ${newArt.id}`);
        }
      }
      
    } catch (err) {
      console.error(`Failed to process prefix ${config.prefix}:`, err);
    }
  }

  console.log('\nIndexing and synchronization complete!');
}

main();
