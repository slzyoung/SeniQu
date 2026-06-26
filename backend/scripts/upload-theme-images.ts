/**
 * Upload AI theme/style cover images to R2 CDN
 * 
 * Usage: npx ts-node scripts/upload-theme-images.ts
 * 
 * Reads images from frontend/public/images/ai_image/ and uploads
 * them to the R2 CDN under ai/themes/ path.
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error('Missing R2 env vars. Check .env file.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const IMAGE_DIR = path.resolve(__dirname, '../../frontend/public/images/ai_image');

interface ThemeImage {
  filename: string;
  r2Key: string;
  mimeType: string;
}

const THEME_IMAGES: ThemeImage[] = [
  { filename: 'fantasy_world.jpg', r2Key: 'ai/themes/fantasy_world.jpg', mimeType: 'image/jpeg' },
  { filename: 'anime_potrait.jpg', r2Key: 'ai/themes/anime_portrait.jpg', mimeType: 'image/jpeg' },
  { filename: 'cyberpunk.jpg', r2Key: 'ai/themes/cyberpunk.jpg', mimeType: 'image/jpeg' },
  { filename: 'watercolor.jpg', r2Key: 'ai/themes/watercolor.jpg', mimeType: 'image/jpeg' },
  { filename: 'oil_painting.jpg', r2Key: 'ai/themes/oil_painting.jpg', mimeType: 'image/jpeg' },
  { filename: 'digital_art.jpg', r2Key: 'ai/themes/digital_art.jpg', mimeType: 'image/jpeg' },
  { filename: 'batik_heritage.jpg', r2Key: 'ai/themes/batik_heritage.jpg', mimeType: 'image/jpeg' },
];

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log('=== Uploading AI Theme Images to R2 CDN ===\n');
  
  const results: Record<string, string> = {};

  for (const theme of THEME_IMAGES) {
    const filePath = path.join(IMAGE_DIR, theme.filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠  File not found: ${filePath}, skipping.`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const sizeKB = (buffer.length / 1024).toFixed(1);
    
    console.log(`📤 Uploading ${theme.filename} (${sizeKB} KB) → ${theme.r2Key}`);
    
    try {
      const url = await uploadToR2(theme.r2Key, buffer, theme.mimeType);
      console.log(`   ✅ ${url}`);
      results[theme.filename] = url;
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n=== Upload Results ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\nDone! Copy these URLs to update ai.service.ts featured styles.');
}

main().catch(console.error);
