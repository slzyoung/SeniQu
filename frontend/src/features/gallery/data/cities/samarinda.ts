import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Samarinda",
    "description": "Ibu kota Kalimantan Timur di sepanjang Sungai Mahakam yang legendaris, terkenal dengan kampung tenun tradisional dan cagar budaya Dayak.",
    "image": "/images/city/samarinda.jpeg",
    "lat": -0.5016,
    "lng": 117.1537,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Samarinda",
        "keywords": [
            "samarinda",
            "ulu",
            "ilir",
            "seberang",
            "utara",
            "sungai pinang"
        ],
        "description": "Masjid Raya Darussalam dan pusat kerajinan tenun kain Sarung Samarinda.",
        "image": "/images/city/samarinda.jpeg"
    }
];
