import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as sharp from 'sharp';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'seniqu';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.seniqu.art';

const cities = [
    { id: 'aceh', source: '../../frontend/public/images/city/aceh.JPG' },
    { id: 'bali', source: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80' },
    { id: 'balikpapan', source: '../../frontend/public/images/city/balikpapan.jpg' },
    { id: 'bandung', source: '../../frontend/public/images/city/bandung.jpg' },
    { id: 'jakarta', source: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1200&q=80' },
    { id: 'lampung', source: '../../frontend/public/images/city/lampung.jpg' },
    { id: 'makassar', source: '../../frontend/public/images/city/makassar.jpg' },
    { id: 'malang', source: '../../frontend/public/images/city/malang.jpg' },
    { id: 'manado', source: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80' },
    { id: 'medan', source: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&q=80' },
    { id: 'palembang', source: '../../frontend/public/images/city/palembang.jpg' },
    { id: 'pontianak', source: '../../frontend/public/images/city/pontianak.jpeg' },
    { id: 'samarinda', source: '../../frontend/public/images/city/samarinda.jpeg' },
    { id: 'semarang', source: '../../frontend/public/images/city/semarang.jpg' },
    { id: 'solo', source: '../../frontend/public/images/city/solo.jpg' },
    { id: 'surabaya', source: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=80' },
    { id: 'yogyakarta', source: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80' },
];

async function run() {
    console.log('🚀 Starting city cover image upload to R2...');
    for (const city of cities) {
        try {
            let buffer: Buffer;
            if (city.source.startsWith('http')) {
                console.log(`🌐 Fetching external image for ${city.id}: ${city.source}`);
                const res = await fetch(city.source);
                if (!res.ok) throw new Error(`HTTP status ${res.status}`);
                buffer = Buffer.from(await res.arrayBuffer());
            } else {
                const localPath = path.join(__dirname, city.source);
                console.log(`📁 Reading local image for ${city.id}: ${localPath}`);
                if (!fs.existsSync(localPath)) {
                    console.warn(`⚠️ Local file not found: ${localPath}. Skipping...`);
                    continue;
                }
                buffer = fs.readFileSync(localPath);
            }

            console.log(`🖼️ Optimizing image using Sharp...`);
            const optimized = await sharp(buffer)
                .resize({ width: 1200, height: 800, fit: 'cover' })
                .webp({ quality: 80 })
                .toBuffer();

            const key = `assets/static/cities/${city.id}.webp`;
            console.log(`📤 Uploading to R2: bucket=${R2_BUCKET_NAME}, key=${key}`);
            
            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: optimized,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
            }));

            const finalUrl = `${R2_PUBLIC_URL}/${key}`;
            console.log(`✅ Success: ${city.id} -> ${finalUrl}`);
        } catch (err: any) {
            console.error(`❌ Failed to process ${city.id}: ${err.message}`);
        }
    }
    console.log('🎉 Done!');
}

run();
