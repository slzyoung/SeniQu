import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Balikpapan",
    "description": "Pintu gerbang Kalimantan Timur yang modern dan bersih, memadukan cagar alam tropis lindung dengan museum pertambangan minyak bumi.",
    "image": "/images/city/balikpapan.jpg",
    "lat": -1.2654,
    "lng": 116.8312,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Balikpapan",
        "keywords": [
            "balikpapan",
            "tengah",
            "barat",
            "timur",
            "utara",
            "selatan"
        ],
        "description": "Monumen Perjuangan Rakyat (MONPERA) dan pusat konservasi alam.",
        "image": "/images/city/balikpapan.jpg"
    }
];
