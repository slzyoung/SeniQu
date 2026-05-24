import { CityMetadata, RegionDetail } from '../types';

export const metadata: CityMetadata = {
    "name": "Yogyakarta",
    "description": "Jantung kebudayaan Jawa yang melestarikan tradisi keraton, candi-candi megah abad pertengahan, dan pusat kreasi seni klasik Nusantara.",
    "image": "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80",
    "lat": -7.7956,
    "lng": 110.3695,
    "radius": 40000
};

export const regions: RegionDetail[] = [
    {
        "id": "kota",
        "name": "Kota Yogyakarta",
        "description": "Jantung Kesultanan Yogyakarta Hadiningrat dengan sejarah keraton yang hidup.",
        "keywords": [
            "kota yogyakarta",
            "kraton",
            "malioboro",
            "gondomanan",
            "danurejan",
            "jetis",
            "tegalrejo",
            "kotagede",
            "umbulharjo",
            "wirobrajan",
            "mantrijeron",
            "mergangsan",
            "pakualaman",
            "gondokusuman",
            "ngampilan",
            "gedongtengen",
            "vredeburg"
        ],
        "image": "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800&q=80"
    },
    {
        "id": "sleman",
        "name": "Sleman",
        "keywords": [
            "sleman",
            "depok",
            "kaliurang",
            "prambanan",
            "ngaglik",
            "mlati",
            "gamping",
            "seyegan",
            "godean",
            "kalasan",
            "cangkringan",
            "affandi"
        ],
        "description": "Situs megah candi Hindu bersejarah di lereng Gunung Merapi.",
        "image": "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80"
    },
    {
        "id": "bantul",
        "name": "Bantul",
        "keywords": [
            "bantul",
            "kasongan",
            "imogiri",
            "parangtritis",
            "sewon",
            "banguntapan",
            "pleret",
            "piyungan",
            "jetis bantul",
            "sanden",
            "sonobudoyo"
        ],
        "description": "Pusat seni kerajinan gerabah tradisional dan pantai legendaris Ratu Selatan.",
        "image": "https://images.unsplash.com/photo-1601999109332-542b18dbec57?w=800&q=80"
    },
    {
        "id": "gunungkidul",
        "name": "Gunungkidul",
        "keywords": [
            "gunungkidul",
            "gunung kidul",
            "wonosari",
            "playen",
            "patuk",
            "semanu",
            "karangmojo",
            "baron",
            "indrayanti"
        ],
        "description": "Cagar warisan geologi karst purba dan jajaran pantai berpasir putih.",
        "image": "https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?w=800&q=80"
    },
    {
        "id": "kulonprogo",
        "name": "Kulon Progo",
        "keywords": [
            "kulon progo",
            "kulonprogo",
            "wates",
            "sentolo",
            "kalibiru",
            "nanggulan"
        ],
        "description": "Keindahan alam pegunungan Menoreh dan cagar budaya agraris.",
        "image": "https://images.unsplash.com/photo-1571731956672-f2b94d7db0cb?w=800&q=80"
    }
];
