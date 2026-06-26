import axios from 'axios';

// Mock the classifyPlace function from frontend
function classifyPlace(place: any): 'museum' | 'gallery' | 'heritage' | null {
    const type = (place.type || '').toLowerCase();
    const name = (place.name || '').toLowerCase();
    const nameLower = name;

    const isMuseumName = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('museo');
    const isGalleryName = nameLower.includes('gallery') || nameLower.includes('galeri') || nameLower.includes('art');
    const isHighlyLikelyArtOrMuseum = isMuseumName || isGalleryName;

    const badKeywords = [
        'stasiun', 'station', 'halte', 'terminal', 'bandara', 'airport', 'mrt', 'lrt', 'krl', 'kereta', 'bus', 'pelabuhan', 'port', 'shelter',
        'hotel', 'resort', 'villa', 'homestay', 'home stay', 'guesthouse', 'guest house', 'hostel', 'motel', 'lodging', 'kos ', 'kost ', 'kontrakan', 'apartment', 'apartemen', 'inn',
        'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'warung', 'rumah makan', 'eatery', 'dapur', 'bakery', 'boba', 'gelato', 'angkringan', 'kedai', 'culinary', 'kuliner', 'bar', 'lounge', 'food court', 'foodcourt',
        'toko', 'shop', 'store', 'boutique', 'butik', 'mall', 'plaza', 'supermarket', 'mart', 'furniture', 'decor', 'decorating', 'florist', 'bouquet', 'buket', 'flower', 'bunga', 'wedding', 'sewa', 'rent', 'rental', 'salon', 'spa', 'laundry', 'tailor', 'jahit', 'bengkel', 'repair', 'showroom', 'studio foto', 'photo studio', 'printing', 'percetakan', 'advertising', 'market', 'pasar',
        'sekolah', 'sd ', 'smp ', 'sma ', 'smk ', 'tk ', 'paud', 'panti asuhan', 'polsek', 'polres', 'koramil', 'kantor', 'office', 'klinik', 'puskesmas', 'apotek', 'hospital', 'rumah sakit', 'desa', 'kelurahan', 'kecamatan', 'kabupaten', 'rt ', 'rw ', 'pos ronda', 'pos kamling', 'lapangan bulutangkis', 'lapangan tenis', 'lapangan voli', 'lapangan futsal', 'gym', 'fitness',
        'universitas', 'kampus', 'ugm', 'itb', 'ui ', 'undip', 'unpad', 'unair'
    ];

    if (badKeywords.some(keyword => nameLower.includes(keyword))) {
        if (!isHighlyLikelyArtOrMuseum) {
            return null;
        }
        const superBadKeywords = [
            'hotel', 'homestay', 'guesthouse', 'guest house', 'villa', 'warung', 'rumah makan', 
            'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'toko', 'shop', 'boutique', 'butik',
            'florist', 'bouquet', 'buket', 'rent', 'rental', 'sewa', 'decor', 'decorating'
        ];
        if (superBadKeywords.some(keyword => nameLower.includes(keyword))) {
            return null;
        }
    }

    const isMuseum = type === 'museum' || type.includes('museum') || isMuseumName;
    if (isMuseum) return 'museum';

    const isGallery = type === 'gallery' || type.includes('gallery') || type.includes('art') || isGalleryName || nameLower.includes('studio seni') || nameLower.includes('sanggar');
    if (isGallery) return 'gallery';

    return 'heritage';
}

const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const surabayaRegions = [
    { id: 'pusat', name: 'Surabaya Pusat', lat: -7.2620, lng: 112.7420, keywords: ["pusat", "genteng", "tegalsari", "bubutan", "simokerto", "tugu pahlawan"] },
    { id: 'selatan', name: 'Surabaya Selatan', lat: -7.2950, lng: 112.7380, keywords: ["selatan", "wonokromo", "wonocolo", "wiyung", "karangpilang", "jambangan", "gayungan", "sawahan", "dukuh pakis", "zoo"] },
    { id: 'timur', name: 'Surabaya Timur', lat: -7.2800, lng: 112.7800, keywords: ["timur", "gubeng", "gunung anyar", "sukolilo", "tambaksari", "mulyorejo", "rungkut", "tenggilis mejoyo"] },
    { id: 'barat', name: 'Surabaya Barat', lat: -7.2750, lng: 112.6750, keywords: ["barat", "benowo", "pakal", "asemrowo", "sukomanunggal", "tandes", "sambikerep", "lakarsantri"] },
    { id: 'utara', name: 'Surabaya Utara', lat: -7.2100, lng: 112.7300, keywords: ["utara", "bulak", "kenjeran", "semampir", "pabean cantian", "krembangan", "jembatan suramadu"] }
];

function cleanStrForRegionMatching(str: any): string {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase()
        .replace(/jawa timur/g, '') // remove provincial false positive triggers
        .replace(/indonesia/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const getMatchingRegionId = (place: any, regionsList: any[]): string | null => {
    if (!place || !regionsList || regionsList.length === 0) return null;

    const cleanName = cleanStrForRegionMatching(place.name);
    const cleanAddress = cleanStrForRegionMatching(place.address);
    const cleanCity = cleanStrForRegionMatching(place.city);

    for (const reg of regionsList) {
        const matches = reg.keywords.some((keyword: string) => {
            const kw = keyword.toLowerCase().trim();
            if (!kw) return false;
            return cleanName.includes(kw) || cleanAddress.includes(kw) || cleanCity.includes(kw);
        });
        if (matches) {
            return reg.id;
        }
    }

    const lat = typeof place.latitude === 'number' ? place.latitude : 0;
    const lng = typeof place.longitude === 'number' ? place.longitude : 0;
    if (lat !== 0 && lng !== 0) {
        const regionsWithCoords = regionsList.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number');
        if (regionsWithCoords.length > 0) {
            let closestRegion = regionsWithCoords[0];
            let minDist = getHaversineDistance(lat, lng, closestRegion.lat!, closestRegion.lng!);

            for (let i = 1; i < regionsWithCoords.length; i++) {
                const dist = getHaversineDistance(lat, lng, regionsWithCoords[i].lat!, regionsWithCoords[i].lng!);
                if (dist < minDist) {
                    minDist = dist;
                    closestRegion = regionsWithCoords[i];
                }
            }
            return closestRegion.id;
        }
    }

    return null;
};

async function run() {
    const response = await axios.get('http://127.0.0.1:3001/api/v1/museums/search-nearby?lat=-7.2575&lng=112.7521&radius=35000');
    const places = response.data.data.places;
    
    console.log(`Analyzing ${places.length} places returned in fallback mode:`);
    
    const regionCounts: Record<string, number> = { pusat: 0, selatan: 0, timur: 0, barat: 0, utara: 0, none: 0 };
    const classCounts: Record<string, number> = { museum: 0, gallery: 0, heritage: 0, ignored: 0 };

    places.forEach((p: any) => {
        const regId = getMatchingRegionId(p, surabayaRegions) || 'none';
        const category = classifyPlace(p);
        
        regionCounts[regId]++;
        if (category) {
            classCounts[category]++;
        } else {
            classCounts.ignored++;
        }
        
        console.log(`- ${p.name} [Type: ${p.type}]`);
        console.log(`  Lat: ${p.latitude}, Lng: ${p.longitude}`);
        console.log(`  Address: ${p.address}`);
        console.log(`  Resolved Region: ${regId}`);
        console.log(`  Classification: ${category || 'IGNORED'}`);
    });
    
    console.log('\n--- FALLBACK REGION COUNTS ---');
    console.log(regionCounts);
    console.log('\n--- FALLBACK CLASSIFICATION COUNTS ---');
    console.log(classCounts);
}

run().catch(err => {
    console.error(err);
});
