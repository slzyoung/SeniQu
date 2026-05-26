import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Banjarmasin",
    "description": "Kota Seribu Sungai dengan pasar terapung tradisional, peninggalan Kesultanan Banjar, dan pusat batu permata Martapura.",
    "image": "https://cdn.seniqu.art/assets/static/cities/banjarmasin.webp",
    "lat": -3.3166,
    "lng": 114.5901,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Banjarmasin",
        "description": "Kawasan bersejarah Banjar sepanjang sungai Martapura dengan Museum Wasaka.",
        "keywords": [
            "banjarmasin",
            "wasaka",
            "kuin",
            "sabilal muhtadin",
            "banjar barat",
            "banjar timur",
            "banjar utara",
            "banjar selatan"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/banjarmasin.webp"
    },
    {
        "id": "martapura",
        "name": "Martapura",
        "description": "Kota serambi makkah Kalimantan Selatan dan pusat kerajinan intan permata.",
        "keywords": [
            "martapura",
            "banjarbaru",
            "cempaka"
        ],
        "image": "https://cdn.seniqu.art/assets/static/cities/banjarmasin.webp"
    }
];
