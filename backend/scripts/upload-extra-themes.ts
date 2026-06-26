/**
 * Upload additional generated AI theme images to R2 CDN
 */
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const EXTRA_THEMES = [
  { src: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/oil_painting_theme_1781530646785.png', key: 'ai/themes/oil_painting.png' },
  { src: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/digital_art_theme_1781530661075.png', key: 'ai/themes/digital_art.png' },
  { src: '/home/wii-ros/.gemini/antigravity/brain/29b41cc3-e2ee-431f-baf9-c7d280109ef1/batik_heritage_theme_1781530675586.png', key: 'ai/themes/batik_heritage.png' },
];

async function main() {
  for (const t of EXTRA_THEMES) {
    const buf = fs.readFileSync(t.src);
    console.log(`📤 Uploading ${path.basename(t.src)} (${(buf.length/1024).toFixed(1)} KB) → ${t.key}`);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: t.key,
      Body: buf,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log(`   ✅ ${PUBLIC_URL}/${t.key}`);
  }
  console.log('\nDone!');
}
main().catch(console.error);
