import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Cirebon",
    "description": "Kota Wali dengan akulturasi budaya Sunda, Jawa, Arab, dan Tiongkok serta keraton bersejarah dan sentra batik Megamendung.",
    "image": "https://cdn.seniqu.art/assets/static/cities/cirebon.webp?v=local",
    "lat": -6.7320,
    "lng": 108.5555,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Cirebon",
        "description": "Pusat administrasi dengan peninggalan Keraton Kasepuhan, Kanoman, dan Kacirebonan.",
        "keywords": [
            "cirebon kota",
            "kejaksan",
            "lemahwungkuk",
            "harjamukti",
            "pekalipan",
            "kesambi",
            "kasepuhan",
            "kanoman",
            "kacirebonan"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/cirebon.webp?v=local"
    },
    {
        "id": "kabupaten",
        "name": "Kabupaten Cirebon",
        "description": "Sentra batik Trusmi tradisional dan situs bersejarah Sunan Gunung Jati.",
        "keywords": [
            "cirebon kabupaten",
            "trusmi",
            "weru",
            "plumbon",
            "sumber",
            "gunung jati",
            "astana",
            "palimanan"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/cirebon.webp?v=local"
    }
];
