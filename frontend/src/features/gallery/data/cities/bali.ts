import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Bali",
    "description": "Pulau seribu pura yang menyajikan keselarasan alam, upacara adat spiritual, museum seni rupa klasik, serta galeri seni modern internasional.",
    "image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80",
    "lat": -8.4095,
    "lng": 115.1889,
    "radius": 70000
};

export const regions: RegionDetail[] = [
    {
        "id": "badung",
        "name": "Badung (Canggu/Kuta)",
        "keywords": [
            "badung",
            "canggu",
            "kuta",
            "mengwi",
            "nusadua",
            "nusa dua",
            "jimbaran",
            "uluwatu",
            "seminyak",
            "petitenget",
            "legian"
        ],
        "description": "Pura Luhur Uluwatu yang bertengger di atas tebing samudera.",
        "image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80"
    },
    {
        "id": "gianyar",
        "name": "Gianyar (Ubud)",
        "keywords": [
            "gianyar",
            "ubud",
            "sukawati",
            "tampaksiring",
            "tegallalang",
            "celuk",
            "mas Bali"
        ],
        "description": "Jantung spiritual, seni lukis, dan budaya klasik Bali di Ubud.",
        "image": "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80"
    },
    {
        "id": "denpasar",
        "name": "Denpasar",
        "keywords": [
            "denpasar",
            "sanur",
            "renon",
            "panjer",
            "kesiman",
            "museum bali"
        ],
        "description": "Pusat pemerintahan bersejarah dengan monumen perjuangan rakyat Bali.",
        "image": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80"
    },
    {
        "id": "tabanan",
        "name": "Tabanan",
        "keywords": [
            "tabanan",
            "bedugul",
            "tanah lot",
            "ulun danu"
        ],
        "description": "Pura ikonik di atas batu karang laut lepas Pantai Tanah Lot.",
        "image": "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800&q=80"
    },
    {
        "id": "klungkung",
        "name": "Klungkung",
        "keywords": [
            "klungkung",
            "nusa penida",
            "nusa lembongan",
            "kertha gosa"
        ],
        "description": "Tebing karang dinosaurus eksotis dan warisan kerajaan Klungkung.",
        "image": "https://images.unsplash.com/photo-1554481923-a6918bd997bc?w=800&q=80"
    }
];
