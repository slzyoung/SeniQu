import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Semarang",
    "description": "Kota pelabuhan bersejarah yang memadukan cagar budaya kolonial Belanda (Kota Lama), Pecinan kuno, dan klenteng spiritual legendaris.",
    "image": "https://cdn.seniqu.art/assets/static/cities/semarang.webp",
    "lat": -6.9932,
    "lng": 110.4203,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Semarang",
        "keywords": [
            "semarang tengah",
            "semarang timur",
            "semarang barat",
            "semarang utara",
            "semarang selatan",
            "candisari",
            "gajahmungkur",
            "tembalang",
            "banyumanik",
            "gunungpati",
            "ngaliyan",
            "mijen",
            "tugu",
            "pedurungan",
            "genuk",
            "gayamsari",
            "lawang sewu",
            "sam poo kong"
        ],
        "description": "Kota Lama, Lawang Sewu, dan Klenteng Sam Poo Kong.",
        "image": "https://cdn.seniqu.art/assets/static/cities/semarang.webp"
    },
    {
        "id": "kabupaten",
        "name": "Kabupaten Semarang",
        "keywords": [
            "kabupaten semarang",
            "ungaran",
            "ambarawa",
            "bandungan",
            "salatiga",
            "bawen",
            "tuntang",
            "jambu",
            "gedong songo"
        ],
        "description": "Candi Gedong Songo dan Museum Ambarawa.",
        "image": "https://cdn.seniqu.art/assets/static/cities/semarang.webp"
    }
];
