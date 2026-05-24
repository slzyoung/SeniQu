import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Makassar",
    "description": "Gerbang Indonesia Timur yang bersejarah dengan Benteng Rotterdam, tradisi bahari suku Phinisi, dan museum cagar budaya Kerajaan Gowa-Tallo.",
    "image": "/images/city/makassar.jpg",
    "lat": -5.1476,
    "lng": 119.414,
    "radius": 30000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Makassar",
        "keywords": [
            "makassar",
            "panakkukang",
            "ujung pandang",
            "wajo",
            "bontoala",
            "mariso",
            "mamajang",
            "tallo",
            "tamalate",
            "somba opu"
        ],
        "description": "Benteng Rotterdam, Pantai Losari, dan Museum Kota Makassar.",
        "image": "/images/city/makassar.jpg"
    },
    {
        "id": "gowa",
        "name": "Gowa",
        "keywords": [
            "gowa",
            "sungguminasa",
            "malino"
        ],
        "description": "Museum Balla Lompoa bekas istana Kerajaan Gowa dan makam Sultan Hasanuddin.",
        "image": "/images/city/makassar.jpg"
    }
];
