/**
 * Artist Service - Frontend
 * Enterprise-grade service for artist dashboard and operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { PaginatedResponse } from '../lib/types';

// ============================================
// TYPES
// ============================================

export interface ArtistStats {
    totalArtworks: number;
    publishedArtworks: number;
    draftArtworks: number;
    totalViews: number;
    totalLikes: number;
    totalSales: number;
    totalRevenue: number;
    totalFollowers: number;
    averageRating: number;
}

export interface ArtistAnalytics {
    views: { date: string; value: number }[];
    likes: { date: string; value: number }[];
    sales: { date: string; value: number }[];
    revenue: { date: string; value: number }[];
}

export interface ArtistPerformance {
    topArtworks: {
        id: string;
        title: string;
        views: number;
        likes: number;
        sales: number;
        imageUrl?: string;
    }[];
    engagementRate: number;
    conversionRate: number;
    averageViewsPerArtwork: number;
}

export interface ArtworkWithStats {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    thumbnailUrl?: string;
    category: string;
    status: string;
    views: number;
    likes: number;
    createdAt: string;
    isArt: boolean;
}

export interface CreateArtworkDto {
    title: string;
    description: string;
    category: string;
    region?: string;
    era?: string;
    medium?: string;
    dimensions?: string;
    imageUrl: string;
    status?: string;
    price?: number;
    isForSale?: boolean;
    artworkType?: 'physical' | 'digital';
    poaCertificate?: any;
}

export interface ArtistProfile {
    id: string;
    email: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    role: string;
    is_verified: boolean;
    is_premium: boolean;
    wallet_address?: string;
    created_at: string;
    stats: ArtistStats;
}

// ============================================
// SERVICE
// ============================================

class ArtistService {
    private static instance: ArtistService;

    private constructor() { }

    static getInstance(): ArtistService {
        if (!ArtistService.instance) {
            ArtistService.instance = new ArtistService();
        }
        return ArtistService.instance;
    }

    // ============================================
    // DASHBOARD & STATS
    // ============================================

    async getStats(): Promise<ArtistStats> {
        return apiGet<ArtistStats>('/artist/stats');
    }

    async getAnalytics(period = '30d'): Promise<ArtistAnalytics> {
        return apiGet<ArtistAnalytics>('/artist/analytics', { params: { period } });
    }

    async getPerformance(): Promise<ArtistPerformance> {
        return apiGet<ArtistPerformance>('/artist/performance');
    }

    // ============================================
    // ARTWORKS MANAGEMENT
    // ============================================

    async getMyArtworks(
        page = 1,
        limit = 20,
        filters?: { status?: string; category?: string }
    ): Promise<PaginatedResponse<ArtworkWithStats>> {
        return apiGet<PaginatedResponse<ArtworkWithStats>>('/artist/artworks', {
            params: { page, limit, ...filters }
        });
    }

    async createArtwork(data: CreateArtworkDto): Promise<ArtworkWithStats> {
        return apiPost<ArtworkWithStats>('/artist/artworks', data);
    }

    async updateArtwork(id: string, data: Partial<CreateArtworkDto>): Promise<ArtworkWithStats> {
        return apiPut<ArtworkWithStats>(`/artist/artworks/${id}`, data);
    }

    async deleteArtwork(id: string): Promise<void> {
        return apiDelete(`/artist/artworks/${id}`);
    }

    async publishArtwork(id: string): Promise<ArtworkWithStats> {
        return apiPost<ArtworkWithStats>(`/artist/artworks/${id}/publish`);
    }

    // ============================================
    // PROFILE
    // ============================================

    async getProfile(): Promise<ArtistProfile> {
        return apiGet<ArtistProfile>('/artist/profile');
    }

    async updateProfile(data: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
        socialLinks?: { twitter?: string; instagram?: string; website?: string };
    }): Promise<any> {
        return apiPut('/artist/profile', data);
    }

    // ============================================
    // ENGAGEMENT
    // ============================================

    async getFollowers(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
        return apiGet<PaginatedResponse<any>>('/artist/followers', {
            params: { page, limit }
        });
    }

    async getRecentActivity(limit = 10): Promise<any[]> {
        return apiGet<any[]>('/artist/activity', { params: { limit } });
    }

    // ============================================
    // PUBLIC ARTIST ENDPOINTS
    // ============================================

    async getArtistById(id: string): Promise<ArtistProfile> {
        return apiGet<ArtistProfile>(`/artists/${id}`);
    }

    async getArtistArtworks(artistId: string, page = 1, limit = 20): Promise<PaginatedResponse<ArtworkWithStats>> {
        return apiGet<PaginatedResponse<ArtworkWithStats>>(`/artists/${artistId}/artworks`, {
            params: { page, limit }
        });
    }
}

export const artistService = ArtistService.getInstance();
