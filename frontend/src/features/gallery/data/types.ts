export interface CityMetadata {
    name: string;
    description: string;
    image: string;
    lat: number;
    lng: number;
    radius: number;
}

export interface RegionDetail {
    id: string;
    name: string;
    keywords: string[];
    description: string;
    image: string; // Iconic Landmark Image
}
