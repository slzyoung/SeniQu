import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Palembang",
    "description": "Kota tertua di Indonesia, bekas pusat Kemaharajaan Sriwijaya yang megah di tepi Sungai Musi, kaya akan situs purbakala.",
    "image": "/images/city/palembang.jpg",
    "lat": -2.9909,
    "lng": 104.7565,
    "radius": 25000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Palembang",
        "keywords": [
            "palembang",
            "ilir",
            "ulu",
            "sako",
            "plaju",
            "seberang",
            "ampera",
            "kemaro",
            "siguntang"
        ],
        "description": "Jembatan Ampera, Benteng Kuto Besak, dan Museum Balaputra Dewa.",
        "image": "/images/city/palembang.jpg"
    }
];
