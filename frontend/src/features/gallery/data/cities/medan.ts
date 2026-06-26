import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Medan",
    "description": "Metropolitan Sumatra Utara yang kaya akan peninggalan Kesultanan Deli, arsitektur kolonial, dan keragaman budaya etnis Nusantara.",
    "image": "https://cdn.seniqu.art/assets/static/cities/medan.webp",
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
        "image": "https://cdn.seniqu.art/assets/static/cities/medan.webp"
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
        "image": "https://cdn.seniqu.art/assets/static/cities/medan.webp"
    }
];
