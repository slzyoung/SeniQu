import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Pontianak",
    "description": "Kota Khatulistiwa di muara Sungai Kapuas, terkenal dengan tugu ekuator, Istana Kadriyah Kesultanan Pontianak, dan museum Kalimantan Barat.",
    "image": "/images/city/pontianak.jpeg",
    "lat": -0.0263,
    "lng": 109.3425,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Pontianak",
        "keywords": [
            "pontianak",
            "selatan",
            "timur",
            "barat",
            "utara",
            "kota",
            "ekuator",
            "kadriyah"
        ],
        "description": "Tugu Khatulistiwa, Istana Kadriyah, dan Museum Negeri Kalimantan Barat.",
        "image": "/images/city/pontianak.jpeg"
    }
];
