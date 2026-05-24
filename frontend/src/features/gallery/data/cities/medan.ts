import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Medan",
    "description": "Metropolitan Sumatra Utara yang kaya akan peninggalan Kesultanan Deli, arsitektur kolonial, dan keragaman budaya etnis Nusantara.",
    "image": "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&q=80",
    "lat": 3.5952,
    "lng": 98.6722,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Medan",
        "keywords": [
            "medan",
            "kesawan",
            "maimun",
            "petisah",
            "belawan",
            "sunggal",
            "helvetia",
            "barat",
            "timur",
            "selatan",
            "polonia"
        ],
        "description": "Istana Maimun, Masjid Raya Al-Mashun, dan kawasan bersejarah Kesawan.",
        "image": "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80"
    },
    {
        "id": "deliserdang",
        "name": "Deli Serdang",
        "keywords": [
            "deli serdang",
            "lubuk pakam",
            "tanjung morawa",
            "pancur batu",
            "tembung"
        ],
        "description": "Kawasan penyangga metropolitan Medan dengan situs bersejarah Melayu Deli.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
    }
];
