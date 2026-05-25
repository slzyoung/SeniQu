import * as fs from 'fs';
import * as path from 'path';

const citiesDir = path.join(__dirname, '../../frontend/src/features/gallery/data/cities');

function run() {
    console.log('🚀 Starting frontend city and region URL update...');
    if (!fs.existsSync(citiesDir)) {
        console.error(`❌ Cities directory not found: ${citiesDir}`);
        return;
    }

    const files = fs.readdirSync(citiesDir);
    for (const file of files) {
        if (!file.endsWith('.ts')) continue;
        const cityId = path.basename(file, '.ts');
        const filePath = path.join(citiesDir, file);

        console.log(`Processing file: ${file} (cityId: ${cityId})`);
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace all local city image paths and unsplash URLs with the optimized CDN URLs
        const localImagePattern = /"image":\s*"(\/images\/city\/[^"]+|https:\/\/images\.unsplash\.com\/[^"]+)"/g;
        
        let count = 0;
        const newContent = content.replace(localImagePattern, (match) => {
            count++;
            return `"image": "https://cdn.seniqu.art/assets/static/cities/${cityId}.webp"`;
        });

        if (count > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ Updated ${file}: replaced ${count} image URLs with R2 CDN URL.`);
        } else {
            console.warn(`⚠️ No image URLs replaced in ${file}`);
        }
    }
    console.log('🎉 Done updating frontend city URLs!');
}

run();
