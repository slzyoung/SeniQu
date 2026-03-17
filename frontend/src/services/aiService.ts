/**
 * AI Service - Enterprise Grade
 * API service for AI-powered features
 */

import { apiGet, apiPost, uploadFile } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface GenreDetectionResult {
    id: string;
    genres: Array<{
        name: string;
        confidence: number;
        description?: string;
    }>;
    style?: string;
    period?: string;
    medium?: string;
    mood?: string[];
    colors?: string[];
    overallConfidence: number;
    processingTime: number;
    createdAt: string;
}

export interface ArtworkRecommendation {
    id: string;
    artworkId: string;
    score: number;
    reason: string;
    artwork: {
        id: string;
        title: string;
        primaryImageUrl: string;
        artist?: {
            id: string;
            displayName: string;
        };
        genres: string[];
        medium?: string;
        price?: number;
        isArt: boolean;
    };
}

export interface CurationRequest {
    preferences?: {
        genres?: string[];
        styles?: string[];
        priceRange?: {
            min?: number;
            max?: number;
        };
        medium?: string[];
        excludeOwned?: boolean;
    };
    context?: 'collection' | 'purchase' | 'discovery' | 'similar';
    referenceArtworkId?: string;
    limit?: number;
}

export interface CurationResult {
    id: string;
    recommendations: ArtworkRecommendation[];
    totalMatches: number;
    processingTime: number;
    curatedAt: string;
}

export interface AIDetectionHistory {
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    result: GenreDetectionResult;
    createdAt: string;
}

// ============================================
// SERVICE
// ============================================

export const aiService = {
    // ==========================================
    // GENRE DETECTION
    // ==========================================

    detectGenre: async (file: File, onProgress?: (progress: number) => void): Promise<GenreDetectionResult> => {
        // Upload image first
        const uploadResult = await uploadFile('/ai/upload', file, onProgress);

        // Then analyze
        return apiPost('/ai/detect-genre', { imageUrl: uploadResult.url });
    },

    detectGenreFromUrl: async (imageUrl: string): Promise<GenreDetectionResult> => {
        return apiPost('/ai/detect-genre', { imageUrl });
    },

    getDetectionHistory: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: AIDetectionHistory[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }> => {
        return apiGet('/ai/detection-history', { params });
    },

    // ==========================================
    // AI CURATION
    // ==========================================

    getCurated: async (request: CurationRequest): Promise<CurationResult> => {
        return apiPost('/ai/curate', request);
    },

    getSimilar: async (artworkId: string, limit?: number): Promise<ArtworkRecommendation[]> => {
        return apiGet(`/ai/similar/${artworkId}`, { params: { limit: limit || 10 } });
    },

    getPersonalized: async (limit?: number): Promise<ArtworkRecommendation[]> => {
        return apiGet('/ai/personalized', { params: { limit: limit || 20 } });
    },

    // ==========================================
    // GENRE INFORMATION
    // ==========================================

    getGenres: async (): Promise<Array<{
        name: string;
        description: string;
        examples: string[];
        popularity: number;
    }>> => {
        return apiGet('/ai/genres');
    },

    getGenreInfo: async (genreName: string): Promise<{
        name: string;
        description: string;
        history: string;
        characteristics: string[];
        famousArtists: string[];
        exampleArtworks: Array<{
            id: string;
            title: string;
            imageUrl: string;
        }>;
    }> => {
        return apiGet(`/ai/genres/${genreName}`);
    },

    // ==========================================
    // ANALYSIS FEEDBACK
    // ==========================================

    submitFeedback: async (detectionId: string, feedback: {
        isAccurate: boolean;
        correctGenres?: string[];
        comments?: string;
    }): Promise<void> => {
        return apiPost(`/ai/detection/${detectionId}/feedback`, feedback);
    },
};

export default aiService;
