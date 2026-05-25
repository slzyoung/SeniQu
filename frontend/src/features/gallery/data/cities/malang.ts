import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Malang",
    "description": "Kota peristirahatan berhawa sejuk di Jawa Timur dengan arsitektur peninggalan kolonial, kampung tematik seni rupa kreatif, dan museum transportasi.",
    "image": "https://cdn.seniqu.art/assets/static/cities/malang.webp",
    "lat": -7.9839,
    "lng": 112.6214,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Malang",
        "keywords": [
            "malang kota",
            "klojen",
            "blimbing",
            "lowokwaru",
            "sukun",
            "kedungkandang"
        ],
        "description": "Balai Kota Malang, kawasan cagar budaya Ijen, dan galeri seni kreatif.",
        "image": "https://cdn.seniqu.art/assets/static/cities/malang.webp"
    },
    {
        "id": "batu",
        "name": "Kota Batu",
        "keywords": [
            "batu",
            "bumiayu",
            "junrejo",
            "bumiaji"
        ],
        "description": "Museum Angkut, galeri seni kontemporer, dan situs purbakala Songgoriti.",
        "image": "https://cdn.seniqu.art/assets/static/cities/malang.webp"
    }
];
