import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Manado",
    "description": "Kota bahari Sulawesi Utara yang terkenal dengan kerukunan antar umat beragama, wisata terumbu karang Bunaken, dan cagar warisan waruga.",
    "image": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
    "lat": 1.4748,
    "lng": 124.8421,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Manado",
        "keywords": [
            "manado",
            "sario",
            "wenang",
            "tuminting",
            "malalayang",
            "mapanget"
        ],
        "description": "Monumen Yesus Memberkati, Klenteng Ban Hin Kiong, dan cagar budaya Sulut.",
        "image": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80"
    }
];
