import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Surabaya",
    "description": "Kota Pahlawan dengan situs sejarah perjuangan kemerdekaan, museum maritim legendaris, serta arsitektur cagar budaya yang terawat indah.",
    "image": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=80",
    "lat": -7.2575,
    "lng": 112.7521,
    "radius": 35000
};

export const regions: RegionDetail[] = [
    {
        "id": "pusat",
        "name": "Surabaya Pusat",
        "keywords": [
            "pusat",
            "genteng",
            "tegalsari",
            "bubutan",
            "simokerto",
            "tugu pahlawan"
        ],
        "description": "Monumen Kapal Selam dan Museum Sepuluh Nopember.",
        "image": "https://images.unsplash.com/photo-1628088306391-1631c7324f2b?w=800&q=80"
    },
    {
        "id": "selatan",
        "name": "Surabaya Selatan",
        "keywords": [
            "selatan",
            "wonokromo",
            "wonocolo",
            "wiyung",
            "karangpilang",
            "jambangan",
            "gayungan",
            "sawahan",
            "dukuh pakis",
            "zoo"
        ],
        "description": "Pusat cagar budaya House of Sampoerna dan Kebun Binatang.",
        "image": "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80"
    },
    {
        "id": "timur",
        "name": "Surabaya Timur",
        "keywords": [
            "timur",
            "gubeng",
            "gunung anyar",
            "sukolilo",
            "tambaksari",
            "mulyorejo",
            "rungkut",
            "tenggilis mejoyo"
        ],
        "description": "Hutan Mangrove Wonorejo dan kawasan galeri seni Mulyorejo.",
        "image": "https://images.unsplash.com/photo-1611604548018-d56bfd85c621?w=800&q=80"
    },
    {
        "id": "barat",
        "name": "Surabaya Barat",
        "keywords": [
            "barat",
            "benowo",
            "pakal",
            "asemrowo",
            "sukomanunggal",
            "tandes",
            "sambikerep",
            "lakarsantri"
        ],
        "description": "Kawasan modern dan Ciputra Waterpark.",
        "image": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80"
    },
    {
        "id": "utara",
        "name": "Surabaya Utara",
        "keywords": [
            "utara",
            "bulak",
            "kenjeran",
            "semampir",
            "pabean cantian",
            "krembangan",
            "jembatan suramadu"
        ],
        "description": "Kawasan maritim Selat Madura dan Jembatan Suramadu.",
        "image": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80"
    }
];
