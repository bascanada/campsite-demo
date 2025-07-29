export interface CampsiteSummary {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    path: string;
}

export interface CampsiteDetail {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    continent: string;
    country: string;
    region: string;
    amenities: string[];
    images: string[];
    reviews: { author: string; date: string; rating: number; comment: string; }[];
    description: string; // Markdown content
    path: string;
}
