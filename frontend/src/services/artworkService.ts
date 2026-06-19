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
    isArt: boolean;
    artworkType?: 'physical' | 'digital';
    poaCertificate?: any;
    isForSale?: boolean;
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
        const response: any = await apiGet('/artworks', { params: filters });
        
        console.debug('[ArtworkService] Raw API response:', JSON.stringify(response)?.substring(0, 500));

        let extractedArtworks: any[] = [];
        let extractedTotal = 0;
        let extractedTotalPages = 1;

        // Handle multiple possible response formats from the backend
        if (Array.isArray(response)) {
            // Format 1: Direct array
            extractedArtworks = response;
            extractedTotal = response.length;
        } else if (response?.artworks && Array.isArray(response.artworks)) {
            // Format 2: { artworks: [...], total: N } — current backend format
            extractedArtworks = response.artworks;
            extractedTotal = response.total || response.artworks.length;
            extractedTotalPages = Math.ceil(extractedTotal / (filters.limit || 20));
        } else if (response?.data && Array.isArray(response.data)) {
            // Format 3: { data: [...], meta: {...} }
            extractedArtworks = response.data;
            extractedTotal = response.total || response.meta?.total || response.data.length;
            extractedTotalPages = response.meta?.totalPages || 1;
        } else if (response?.data?.artworks && Array.isArray(response.data.artworks)) {
            // Format 4: { data: { artworks: [...], total: N } } — nested wrapper
            extractedArtworks = response.data.artworks;
            extractedTotal = response.data.total || response.data.artworks.length;
            extractedTotalPages = Math.ceil(extractedTotal / (filters.limit || 20));
        } else if (response && typeof response === 'object') {
            // Format 5: Single object (shouldn't happen for list, but be safe)
            console.warn('[ArtworkService] Unexpected response format:', response);
        }

        // Normalize artwork data: handle various image formats from backend
        const normalizedArtworks: Artwork[] = extractedArtworks.map(a => this.normalizeArtwork(a));

        console.debug(`[ArtworkService] Extracted ${normalizedArtworks.length} artworks, total: ${extractedTotal}`);

        return {
            data: normalizedArtworks,
            meta: {
                total: extractedTotal,
                page: filters.page || 1,
                pageSize: filters.limit || 20,
                totalPages: extractedTotalPages,
            }
        };
    }

    async getArtworkById(id: string): Promise<Artwork> {
        const response = await apiGet<any>(`/artworks/${id}`);
        
        // Unwrap backend interceptor envelope ({ success: true, data: T }) if present
        const artworkData = response?.data && !Array.isArray(response.data) && response.data.id 
            ? response.data 
            : response;
            
        return this.normalizeArtwork(artworkData);
    }

    /**
     * Helper to normalize backend artwork data to frontend format
     */
    private normalizeArtwork(artwork: any): Artwork {
        if (!artwork) return artwork;

        // Parse images field - it may be a JSON string like "[]" from the DB
        let parsedImages: any[] = [];
        if (typeof artwork.images === 'string') {
            try { parsedImages = JSON.parse(artwork.images); } catch { parsedImages = []; }
        } else if (Array.isArray(artwork.images)) {
            parsedImages = artwork.images;
        }

        // Build the primary image URL from available fields
        const primaryUrl = artwork.primaryImageUrl || artwork.primary_image_url || artwork.imageUrl || artwork.image_url || '';

        // If parsed images are empty but we have a primary URL, create the images array
        const finalImages = (parsedImages && parsedImages.length > 0)
            ? parsedImages
            : primaryUrl
                ? [{ id: artwork.id, url: primaryUrl, isPrimary: true }]
                : [];

        return {
            ...artwork,
            images: finalImages,
            // Normalize artist data from backend JOIN format
            artist: artwork.artist || { id: artwork.artistId || artwork.artist_id, displayName: 'Unknown Artist', avatar: artwork.artist?.avatarUrl || artwork.artist?.avatar_url },
        } as Artwork;
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

    /**
     * Record a transaction
     */
    async recordTransaction(data: {
        sellerId?: string;
        artworkId?: string;
        artworkTitle: string;
        artworkImage?: string;
        amount: number;
        currency?: string;
        txHash: string;
        status?: string;
    }): Promise<any> {
        return apiPost('/artworks/transaction', data);
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(): Promise<any[]> {
        return apiGet('/artworks/transactions/history');
    }
}

export const artworkService = ArtworkService.getInstance();
