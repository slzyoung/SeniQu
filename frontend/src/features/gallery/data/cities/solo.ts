import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Solo (Surakarta)",
    "description": "Pusat pelestarian dinasti Mataram Islam dengan dua istana kerajaan yang aktif, kerajinan batik legendaris, dan pasar antik Triwindu.",
    "image": "/images/city/solo.jpg",
    "lat": -7.5755,
    "lng": 110.8243,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Surakarta",
        "keywords": [
            "surakarta",
            "solo",
            "laweyan",
            "pasar kliwon",
            "jebres",
            "banjarsari",
            "serengan",
            "keraton",
            "mangkunegaran"
        ],
        "description": "Keraton Surakarta Hadiningrat dan Pura Mangkunegaran.",
        "image": "/images/city/solo.jpg"
    },
    {
        "id": "karanganyar",
        "name": "Karanganyar",
        "keywords": [
            "karanganyar",
            "tawangmangu",
            "cetho",
            "sukuh"
        ],
        "description": "Candi Sukuh, Candi Cetho di lereng Gunung Lawu.",
        "image": "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80"
    }
];
