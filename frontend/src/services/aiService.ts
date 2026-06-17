/**
 * AI Service - Enterprise Grade
 * API service for AI-powered features
 */

import { apiGet, apiPost, uploadFile } from '../lib/api';
import api from '../lib/api';

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

// Curation Types
export interface HeritageCurationResult {
    id: string;
    user_id: string;
    image_url: string;
    curation_name: string;
    original_era: string;
    historical_significance: string;
    restoration_steps: Array<{ step: number; title: string; description: string }>;
    color_palette: string[];
    curation_description: string;
    audio_script: string;
    valuation_estimate: string;
    metadata: {
        Title?: string;
        Creator?: string;
        Subject?: string;
        Description?: string;
        Publisher?: string;
        Contributor?: string;
        Date?: string;
        Type?: string;
        Format?: string;
        Identifier?: string;
        Source?: string;
        Language?: string;
        Relation?: string;
        Coverage?: string;
        Rights?: string;
    };
    is_public: boolean;
    created_at: string;
    users?: {
        username: string;
        display_name: string;
        avatar_url: string;
    };
}

export interface CurationQuota {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
}

// Heritage Scan Types
export interface HeritageScanResult {
    id: string;
    name: string;
    origin: string;
    century: string;
    type: string;
    confidence: number;
    description: string;
    audioScript: string;
    patternMeaning: string;
    tags: string[];
    genres: Array<{ name: string; confidence: number }>;
    style: string;
    medium: string;
    collection: string;
    imageUrl: string;
    quota: {
        used: number;
        limit: number;
        remaining: number;
    };
}

export interface ScanQuota {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
}

export interface HeritageScanHistoryItem {
    id: string;
    user_id: string;
    image_url: string;
    heritage_name: string;
    heritage_type: string;
    confidence: number;
    result: HeritageScanResult;
    created_at: string;
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
        const uploadResult = await uploadFile(file, 'general', onProgress);

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

    // ==========================================
    // HERITAGE SCAN (Gemini AI)
    // ==========================================

    /**
     * Scan a heritage artifact image using Gemini 2.5 Flash.
     * Sends image as multipart/form-data to backend.
     */
    scanHeritage: async (
        file: File,
        onProgress?: (progress: number) => void,
    ): Promise<HeritageScanResult> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/ai/heritage-scan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 60s timeout for AI processing
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return response.data?.data || response.data;
    },

    /**
     * Get user's remaining daily scan quota.
     */
    getScanQuota: async (): Promise<ScanQuota> => {
        const res = await apiGet<any>('/ai/heritage-scan/quota');
        return res?.data || res;
    },

    /**
     * Get user's heritage scan history.
     */
    getScanHistory: async (limit = 20): Promise<HeritageScanHistoryItem[]> => {
        const res = await apiGet<any>('/ai/heritage-scan/history', { params: { limit } });
        return res?.data || res;
    },

    // ==========================================
    // HERITAGE CURATION & RESTORATION
    // ==========================================

    /**
     * Upload an image to perform AI curation and restoration.
     */
    curateHeritage: async (
        file: File,
        onProgress?: (progress: number) => void,
    ): Promise<HeritageCurationResult> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/ai/heritage-curation', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 90000, // 90s timeout for complex AI curation + restoration steps
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return response.data?.data || response.data;
    },

    /**
     * Get user's remaining daily curation quota.
     */
    getCurationQuota: async (): Promise<CurationQuota> => {
        const res = await apiGet<any>('/ai/heritage-curation/quota');
        return res?.data || res;
    },

    /**
     * Get user's heritage curation history.
     */
    getCurationHistory: async (): Promise<HeritageCurationResult[]> => {
        const res = await apiGet<any>('/ai/heritage-curation/history');
        return res?.data || res;
    },

    /**
     * Get community masterpiece public curations feed.
     */
    getPublicCurations: async (): Promise<HeritageCurationResult[]> => {
        const res = await apiGet<any>('/ai/heritage-curation/public');
        return res?.data || res;
    },

    /**
     * Publish a curation to make it public.
     */
    publishCuration: async (id: string): Promise<HeritageCurationResult> => {
        const res = await api.patch<any>(`/ai/heritage-curation/${id}/publish`);
        return res.data?.data || res.data;
    },
}