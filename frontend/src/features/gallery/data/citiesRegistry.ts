import { CityMetadata, RegionDetail } from './types';

import { metadata as jakartaMetadata, regions as jakartaRegions } from './cities/jakarta';
import { metadata as yogyakartaMetadata, regions as yogyakartaRegions } from './cities/yogyakarta';
import { metadata as baliMetadata, regions as baliRegions } from './cities/bali';
import { metadata as bandungMetadata, regions as bandungRegions } from './cities/bandung';
import { metadata as surabayaMetadata, regions as surabayaRegions } from './cities/surabaya';
import { metadata as semarangMetadata, regions as semarangRegions } from './cities/semarang';
import { metadata as medanMetadata, regions as medanRegions } from './cities/medan';
import { metadata as makassarMetadata, regions as makassarRegions } from './cities/makassar';
import { metadata as palembangMetadata, regions as palembangRegions } from './cities/palembang';
import { metadata as soloMetadata, regions as soloRegions } from './cities/solo';
import { metadata as malangMetadata, regions as malangRegions } from './cities/malang';
import { metadata as balikpapanMetadata, regions as balikpapanRegions } from './cities/balikpapan';
import { metadata as samarindaMetadata, regions as samarindaRegions } from './cities/samarinda';
import { metadata as manadoMetadata, regions as manadoRegions } from './cities/manado';
import { metadata as pontianakMetadata, regions as pontianakRegions } from './cities/pontianak';
import { metadata as acehMetadata, regions as acehRegions } from './cities/aceh';
import { metadata as lampungMetadata, regions as lampungRegions } from './cities/lampung';
import { metadata as cirebonMetadata, regions as cirebonRegions } from './cities/cirebon';
import { metadata as padangMetadata, regions as padangRegions } from './cities/padang';
import { metadata as banjarmasinMetadata, regions as banjarmasinRegions } from './cities/banjarmasin';
import { metadata as mataramMetadata, regions as mataramRegions } from './cities/mataram';

export * from './types';

export const CITY_WHITELIST: Record<string, CityMetadata> = {
    jakarta: jakartaMetadata,
    yogyakarta: yogyakartaMetadata,
    bali: baliMetadata,
    bandung: bandungMetadata,
    surabaya: surabayaMetadata,
    semarang: semarangMetadata,
    medan: medanMetadata,
    makassar: makassarMetadata,
    palembang: palembangMetadata,
    solo: soloMetadata,
    malang: malangMetadata,
    balikpapan: balikpapanMetadata,
    samarinda: samarindaMetadata,
    manado: manadoMetadata,
    pontianak: pontianakMetadata,
    aceh: acehMetadata,
    lampung: lampungMetadata,
    cirebon: cirebonMetadata,
    padang: padangMetadata,
    banjarmasin: banjarmasinMetadata,
    mataram: mataramMetadata
};

export const CITY_REGIONS_MAP: Record<string, RegionDetail[]> = {
    jakarta: jakartaRegions,
    yogyakarta: yogyakartaRegions,
    bali: baliRegions,
    bandung: bandungRegions,
    surabaya: surabayaRegions,
    semarang: semarangRegions,
    medan: medanRegions,
    makassar: makassarRegions,
    palembang: palembangRegions,
    solo: soloRegions,
    malang: malangRegions,
    balikpapan: balikpapanRegions,
    samarinda: samarindaRegions,
    manado: manadoRegions,
    pontianak: pontianakRegions,
    aceh: acehRegions,
    lampung: lampungRegions,
    cirebon: cirebonRegions,
    padang: padangRegions,
    banjarmasin: banjarmasinRegions,
    mataram: mataramRegions
};

/**
 * Robust, exclusive place-classification helper.
 * Ensures that Museum, Gallery, and Heritage categories are mutually exclusive.
 */
export function classifyPlace(place: { type?: string; name?: string; address?: string }): 'museum' | 'gallery' | 'heritage' | null {
    const type = (place.type || '').toLowerCase();
    const name = (place.name || '').toLowerCase();
    const address = (place.address || '').toLowerCase();

    const nameLower = name.toLowerCase();

    // 1. Strict name and type validation to filter out non-genuine places
    const isMuseumName = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('museo');
    const isGalleryName = nameLower.includes('gallery') || nameLower.includes('galeri') || nameLower.includes('art');
    const isHighlyLikelyArtOrMuseum = isMuseumName || isGalleryName;

    // Bad keywords for transit, lodging, eatery, retail, services, local infrastructure
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
        
        // Even if it has "museum" or "gallery", filter out commercial combinations (e.g. "Hotel Museum", "Gallery Cafe")
        const superBadKeywords = [
            'hotel', 'homestay', 'guesthouse', 'guest house', 'villa', 'warung', 'rumah makan', 
            'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'toko', 'shop', 'boutique', 'butik',
            'florist', 'bouquet', 'buket', 'rent', 'rental', 'sewa', 'decor', 'decorating'
        ];
        if (superBadKeywords.some(keyword => nameLower.includes(keyword))) {
            return null;
        }
    }

    // 2. Museum (Highest priority to avoid overlap)
    const isMuseum = type === 'museum' || 
                     type.includes('museum') || 
                     isMuseumName;
    
    if (isMuseum) {
        return 'museum';
    }

    // 3. Gallery (Art-focused, excluding museums)
    const isGallery = type === 'gallery' || 
                      type.includes('gallery') || 
                      type.includes('art') || 
                      isGalleryName || 
                      nameLower.includes('studio seni') ||
                      nameLower.includes('sanggar');
    
    if (isGallery) {
        return 'gallery';
    }

    // 4. Heritage (Historical, Religious, Tourism destinations, and fallback)
    return 'heritage';
}


