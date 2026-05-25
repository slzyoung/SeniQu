import * as dotenv from 'dotenv';
import * as path from 'path';
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

const assets = [
    // Hero Slides
    { key: 'assets/static/hero/bromo.webp', source: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1800&q=85', type: 'hero' },
    { key: 'assets/static/hero/borobudur.webp', source: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1800&q=85', type: 'hero' },
    { key: 'assets/static/hero/bali.webp', source: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1800&q=85', type: 'hero' },
    { key: 'assets/static/hero/bandung.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Gedung_Sate_Oktober_2024_-_Rahmatdenas.jpg/1280px-Gedung_Sate_Oktober_2024_-_Rahmatdenas.jpg', type: 'hero' },
    { key: 'assets/static/hero/jakarta.webp', source: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1800&q=85', type: 'hero' },
    
    // Demo Artwork Images
    { key: 'assets/static/demo/monalisa.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', type: 'demo' },
    { key: 'assets/static/demo/starrynight.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/1280px-VanGogh-starry_night_ballance1.jpg', type: 'demo' },
    { key: 'assets/static/demo/starrynight_detail.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', type: 'demo' },
    { key: 'assets/static/demo/venus.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg', type: 'demo' },
    { key: 'assets/static/demo/pearlearring.webp', source: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg', type: 'demo' }
];

async function run() {
    console.log('🚀 Starting remaining static assets upload to R2 with User-Agent...');
    for (const asset of assets) {
        try {
            console.log(`🌐 Fetching external image: ${asset.source}`);
            const res = await fetch(asset.source, {
                headers: {
                    'User-Agent': 'SeniQuApp/1.0 (contact@seniqu.art; NestJS Backend Asset Importer)'
                }
            });
            if (!res.ok) throw new Error(`HTTP status ${res.status}`);
            const buffer = Buffer.from(await res.arrayBuffer());

            console.log(`🖼️ Optimizing ${asset.key} via Sharp...`);
            let width = asset.type === 'hero' ? 1800 : 1200;
            const optimized = await sharp(buffer)
                .resize({ width, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();

            console.log(`📤 Uploading to R2: key=${asset.key}`);
            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: asset.key,
                Body: optimized,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
            }));

            console.log(`✅ Success: ${asset.key} -> ${R2_PUBLIC_URL}/${asset.key}`);
        } catch (err: any) {
            console.error(`❌ Failed to process ${asset.key}: ${err.message}`);
        }
    }
    console.log('🎉 Done uploading remaining static images!');
}

run();
