import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Padang",
    "description": "Pusat budaya Minangkabau di pesisir barat Sumatra dengan arsitektur rumah gadang yang indah dan museum Adityawarman.",
    "image": "https://cdn.seniqu.art/assets/static/cities/padang.webp?v=local",
    "lat": -0.9471,
    "lng": 100.4172,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Padang",
        "description": "Jantung budaya Minang pesisir dengan Museum Adityawarman dan pelabuhan tua Muaro.",
        "keywords": [
            "padang kota",
            "padang barat",
            "padang timur",
            "padang utara",
            "padang selatan",
            "kuranji",
            "adityawarman",
            "gadang",
            "muaro"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/padang.webp?v=local"
    },
    {
        "id": "sekitarnya",
        "name": "Pariaman & Minangkabau",
        "description": "Kawasan penyangga budaya Minangkabau dengan pantai-pantai eksotis.",
        "keywords": [
            "pariaman",
            "lubuk alung",
            "sicincin",
            "anai"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/padang.webp?v=local"
    }
];
