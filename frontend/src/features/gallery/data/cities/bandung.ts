import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Bandung",
    "description": "Paris van Java yang kaya akan arsitektur warisan kolonial Art Deco, komunitas seni rupa kontemporer, dan industri kreatif anak muda.",
    "image": "https://cdn.seniqu.art/assets/static/cities/bandung.webp",
    "lat": -6.9175,
    "lng": 107.6191,
    "radius": 35000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Bandung",
        "keywords": [
            "kota bandung",
            "dago",
            "braga",
            "cihampelas",
            "laksana",
            "astanaanyar",
            "sukajadi",
            "regol",
            "lengkong",
            "sumur bandung",
            "cibeunying",
            "coblong",
            "geologi"
        ],
        "description": "Museum Geologi, Jalan Braga, Selasar Sunaryo.",
        "image": "https://cdn.seniqu.art/assets/static/cities/bandung.webp"
    },
    {
        "id": "barat",
        "name": "Bandung Barat",
        "keywords": [
            "bandung barat",
            "lembang",
            "padalarang",
            "cipatat",
            "parongpong",
            "maribaya",
            "stone garden"
        ],
        "description": "Wisata alam pegunungan Lembang dan Observatorium Bosscha.",
        "image": "https://cdn.seniqu.art/assets/static/cities/bandung.webp"
    },
    {
        "id": "kabupaten",
        "name": "Kabupaten Bandung",
        "keywords": [
            "kabupaten bandung",
            "soreang",
            "ciwidey",
            "pangalengan",
            "rancaekek",
            "baleendah",
            "dayeuhkolot"
        ],
        "description": "Kawah Putih Ciwidey, perkebunan teh, dan cagar budaya Priangan.",
        "image": "https://cdn.seniqu.art/assets/static/cities/bandung.webp"
    }
];
