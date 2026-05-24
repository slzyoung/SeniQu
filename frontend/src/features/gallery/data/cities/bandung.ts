import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Bandung",
    "description": "Paris van Java yang kaya akan arsitektur warisan kolonial Art Deco, komunitas seni rupa kontemporer, dan industri kreatif anak muda.",
    "image": "/images/city/bandung.jpg",
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
        "image": "https://images.unsplash.com/photo-1626266842868-07977ab7e2c8?w=800&q=80"
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
        "image": "https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&q=80"
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
        "image": "https://images.unsplash.com/photo-1582294435985-78e72750e395?w=800&q=80"
    }
];
