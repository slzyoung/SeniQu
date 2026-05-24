import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Jakarta",
    "description": "Pusat kebudayaan modern Indonesia yang memadukan sejarah kolonial Kota Tua dengan perkembangan seni kontemporer kelas dunia.",
    "image": "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1200&q=80",
    "lat": -6.2088,
    "lng": 106.8456,
    "radius": 45000
};

export const regions: RegionDetail[] = [
    {
        "id": "pusat",
        "name": "Jakarta Pusat",
        "description": "Jantung bersejarah dan administratif kota dengan monumen ikonik nasional.",
        "keywords": [
            "pusat",
            "menteng",
            "gambir",
            "senen",
            "tanah abang",
            "sawah besar",
            "kemayoran",
            "cempaka putih",
            "johar baru"
        ],
        "image": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c26e?w=800&q=80"
    },
    {
        "id": "barat",
        "name": "Jakarta Barat",
        "description": "Pusat warisan kolonial dan pesona Kota Tua yang legendaris.",
        "keywords": [
            "barat",
            "grogol",
            "palmerah",
            "kembangan",
            "kebon jeruk",
            "tambora",
            "taman sari",
            "cengkareng",
            "kalideres",
            "kota tua",
            "fatahillah"
        ],
        "image": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80"
    },
    {
        "id": "selatan",
        "name": "Jakarta Selatan",
        "description": "Sentra galeri seni kontemporer modern dan gaya hidup urban kreatif.",
        "keywords": [
            "selatan",
            "kebayoran",
            "cilandak",
            "jagakarsa",
            "pasar minggu",
            "pancoran",
            "mampang",
            "tebet",
            "setiabudi",
            "pesanggrahan",
            "kemang",
            "pondok indah"
        ],
        "image": "https://images.unsplash.com/photo-1570544820287-0b11ae3ee3eb?w=800&q=80"
    },
    {
        "id": "utara",
        "name": "Jakarta Utara",
        "description": "Gerbang maritim kuno dan pelabuhan bersejarah Sunda Kelapa.",
        "keywords": [
            "utara",
            "penjaringan",
            "tanjung priok",
            "koja",
            "cilincing",
            "kelapa gading",
            "pademangan",
            "ancol",
            "pluit",
            "sunda kelapa",
            "bahari"
        ],
        "image": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80"
    },
    {
        "id": "timur",
        "name": "Jakarta Timur",
        "description": "Representasi keanekaragaman arsitektur dan budaya Nusantara.",
        "keywords": [
            "timur",
            "jatinegara",
            "duren sawit",
            "kramat jati",
            "makasar",
            "ciracas",
            "pasar rebo",
            "cipayung",
            "cakung",
            "pulo gadung",
            "rawamangun",
            "mini indonesia"
        ],
        "image": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80"
    }
];
