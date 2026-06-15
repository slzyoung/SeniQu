import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Surabaya",
    "description": "Kota Pahlawan dengan situs sejarah perjuangan kemerdekaan, museum maritim legendaris, serta arsitektur cagar budaya yang terawat indah.",
    "image": "https://cdn.seniqu.art/assets/static/cities/surabaya.webp",
    "lat": -7.2575,
    "lng": 112.7521,
    "radius": 35000
};

export const regions: RegionDetail[] = [
    {
        "id": "pusat",
        "name": "Surabaya Pusat",
        "keywords": [
            "pusat",
            "genteng",
            "tegalsari",
            "bubutan",
            "simokerto",
            "tugu pahlawan"
        ],
        "description": "Monumen Kapal Selam dan Museum Sepuluh Nopember.",
        "image": "https://cdn.seniqu.art/cities/surabayapusat.jpeg",
        "lat": -7.2620,
        "lng": 112.7420
    },
    {
        "id": "selatan",
        "name": "Surabaya Selatan",
        "keywords": [
            "selatan",
            "wonokromo",
            "wonocolo",
            "wiyung",
            "karangpilang",
            "jambangan",
            "gayungan",
            "sawahan",
            "dukuh pakis",
            "zoo"
        ],
        "description": "Pusat cagar budaya House of Sampoerna dan Kebun Binatang.",
        "image": "https://cdn.seniqu.art/assets/static/cities/surabaya.webp",
        "lat": -7.2950,
        "lng": 112.7380
    },
    {
        "id": "timur",
        "name": "Surabaya Timur",
        "keywords": [
            "timur",
            "gubeng",
            "gunung anyar",
            "sukolilo",
            "tambaksari",
            "mulyorejo",
            "rungkut",
            "tenggilis mejoyo"
        ],
        "description": "Hutan Mangrove Wonorejo dan kawasan galeri seni Mulyorejo.",
        "image": "https://cdn.seniqu.art/cities/surabaya_timur.jpeg",
        "lat": -7.2800,
        "lng": 112.7800
    },
    {
        "id": "barat",
        "name": "Surabaya Barat",
        "keywords": [
            "barat",
            "benowo",
            "pakal",
            "asemrowo",
            "sukomanunggal",
            "tandes",
            "sambikerep",
            "lakarsantri"
        ],
        "description": "Kawasan modern dan Ciputra Waterpark.",
        "image": "https://cdn.seniqu.art/cities/surabaya_barat.jpg",
        "lat": -7.2750,
        "lng": 112.6750
    },
    {
        "id": "utara",
        "name": "Surabaya Utara",
        "keywords": [
            "utara",
            "bulak",
            "kenjeran",
            "semampir",
            "pabean cantian",
            "krembangan",
            "jembatan suramadu"
        ],
        "description": "Kawasan maritim Selat Madura dan Jembatan Suramadu.",
        "image": "https://cdn.seniqu.art/cities/surabaya_utara.jpeg",
        "lat": -7.2100,
        "lng": 112.7300
    }
];
