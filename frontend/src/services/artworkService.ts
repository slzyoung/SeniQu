/**
 * Artwork Service
 * Handles artwork fetching, creation, and management
 */

import { apiGet, apiPost, apiPut } from '../lib/api';
// import { API_ENDPOINTS } from '../lib/constants';
import { Artwork, PaginatedResponse } from '../lib/types';

export interface ArtworkFilters {
    page?: number;
    limit?: number;
    category?: string;
    region?: string;
    artistId?: string;
    search?: string;
}

export interface CreateArtworkData {
    title: string;
    description: string;
    medium: string;
    dimensions: string;
    year: number;
    price?: number;
    images: string[];
    isNFT: boolean;
}

class ArtworkService {
    private static instance: ArtworkService;

    private constructor() { }

    static getInstance(): ArtworkService {
        if (!ArtworkService.instance) {
            ArtworkService.instance = new ArtworkService();
        }
        return ArtworkService.instance;
    }

    /**
     * Get all published artworks with pagination and filters
     */
    async getArtworks(filters: ArtworkFilters = {}): Promise<PaginatedResponse<Artwork>> {
        const response = await apiGet<{ artworks: Artwork[]; total: number }>('/artworks', { params: filters });
        return {
            data: response.artworks,
            meta: {
                total: response.total,
                page: filters.page || 1,
                pageSize: filters.limit || 20,
                totalPages: Math.ceil(response.total / (filters.limit || 20))
            }
        };
    }

    /**
     * Get artwork by ID
     */
    async getArtworkById(id: string): Promise<Artwork> {
        return apiGet<Artwork>(`/artworks/${id}`);
    }

    /**
     * Create new artwork
     */
    async createArtwork(data: CreateArtworkData): Promise<Artwork> {
        return apiPost<Artwork>('/artworks', data);
    }

    /**
     * Update artwork
     */
    async updateArtwork(id: string, data: Partial<CreateArtworkData>): Promise<Artwork> {
        return apiPut<Artwork>(`/artworks/${id}`, data);
    }

    /**
     * Publish artwork
     */
    async publishArtwork(id: string): Promise<Artwork> {
        return apiPost<Artwork>(`/artworks/${id}/publish`);
    }

    /**
     * Verify artwork (Admin/Institution)
     */
    async verifyArtwork(id: string): Promise<Artwork> {
        return apiPost<Artwork>(`/artworks/${id}/verify`);
    }
}

export const artworkService = ArtworkService.getInstance();
