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
    lampung: lampungMetadata
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
    lampung: lampungRegions
};

/**
 * Robust, exclusive place-classification helper.
 * Ensures that Museum, Gallery, and Heritage categories are mutually exclusive.
 */
export function classifyPlace(place: { type?: string; name?: string; address?: string }): 'museum' | 'gallery' | 'heritage' {
    const type = (place.type || '').toLowerCase();
    const name = (place.name || '').toLowerCase();
    const address = (place.address || '').toLowerCase();

    // 1. Museum (Highest priority to avoid overlap)
    const isMuseum = type === 'museum' || 
                     type.includes('museum') || 
                     name.includes('museum') || 
                     name.includes('museo');
    
    if (isMuseum) {
        return 'museum';
    }

    // 2. Gallery (Art-focused, excluding museums)
    const isGallery = type === 'gallery' || 
                      type.includes('gallery') || 
                      type.includes('art') || 
                      name.includes('galeri') || 
                      name.includes('gallery') || 
                      name.includes('art') || 
                      name.includes('studio seni') ||
                      name.includes('sanggar');
    
    if (isGallery) {
        return 'gallery';
    }

    // 3. Heritage (Historical, Religious, Tourism destinations, and fallback)
    return 'heritage';
}

