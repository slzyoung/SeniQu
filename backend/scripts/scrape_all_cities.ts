import axios from 'axios';

const CITIES = [
    { name: 'Jakarta', lat: -6.2088, lng: 106.8456, radius: 45000 },
    { name: 'Yogyakarta', lat: -7.7956, lng: 110.3695, radius: 40000 },
    { name: 'Bali', lat: -8.4095, lng: 115.1889, radius: 70000 },
    { name: 'Bandung', lat: -6.9175, lng: 107.6191, radius: 35000 },
    { name: 'Surabaya', lat: -7.2575, lng: 112.7521, radius: 35000 },
    { name: 'Semarang', lat: -6.9932, lng: 110.4203, radius: 25000 }
];

async function seed() {
    console.log("--- Seeding and Scraping All Cities (Offline-First) ---");
    for (const city of CITIES) {
        console.log(`\nTriggering scrape for ${city.name}...`);
        try {
            const url = `http://localhost:3001/api/v1/museums/search-nearby?lat=${city.lat}&lng=${city.lng}&radius=${city.radius}`;
            const res = await axios.get(url);
            if (res.data && res.data.success) {
                const count = res.data.data.places ? res.data.data.places.length : 0;
                console.log(`✅ Success for ${city.name}! Returned ${count} places.`);
            } else {
                console.log(`❌ Failed for ${city.name}: Invalid response structure`);
            }
        } catch (e: any) {
            console.error(`❌ Error scraping ${city.name}:`, e.message);
        }
        // Small delay to allow async ingestion to process
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("\nAll cities triggered. Background ingestion will complete shortly.");
}

seed();
