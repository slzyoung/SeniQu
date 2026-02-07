/**
 * AI Hooks - Enterprise Grade
 * React Query hooks for AI-powered features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService, CurationRequest } from '../services/aiService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { getAccessToken } from '../lib/api';

// ============================================
// QUERY KEYS
// ============================================

export const aiKeys = {
    all: ['ai'] as const,
    genres: () => [...aiKeys.all, 'genres'] as const,
    genreInfo: (name: string) => [...aiKeys.all, 'genre', name] as const,
    detectionHistory: (params?: Record<string, unknown>) => [...aiKeys.all, 'detection-history', params] as const,
    similar: (artworkId: string) => [...aiKeys.all, 'similar', artworkId] as const,
    personalized: () => [...aiKeys.all, 'personalized'] as const,
    curation: (request: CurationRequest) => [...aiKeys.all, 'curation', request] as const,
};

// ============================================
// AUTH CHECK HELPER
// ============================================

function isAuthTokenReady(): boolean {
    return !!getAccessToken();
}

// ============================================
// GENRE HOOKS
// ============================================

export function useGenres() {
    return useQuery({
        queryKey: aiKeys.genres(),
        queryFn: () => aiService.getGenres(),
        staleTime: 1000 * 60 * 60, // 1 hour - genres rarely change
    });
}

export function useGenreInfo(genreName: string) {
    return useQuery({
        queryKey: aiKeys.genreInfo(genreName),
        queryFn: () => aiService.getGenreInfo(genreName),
        enabled: !!genreName,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

// ============================================
// DETECTION HOOKS
// ============================================

export function useDetectionHistory(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.detectionHistory(params),
        queryFn: () => aiService.getDetectionHistory(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

export function useDetectGenre() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
            aiService.detectGenre(file, onProgress),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiKeys.detectionHistory() });
            toast.success('Analysis Complete', 'Genre detection finished successfully.');
        },
        onError: (error: Error) => {
            toast.error('Analysis Failed', error.message || 'Could not analyze the image.');
        },
    });
}

export function useDetectGenreFromUrl() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (imageUrl: string) => aiService.detectGenreFromUrl(imageUrl),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiKeys.detectionHistory() });
            toast.success('Analysis Complete', 'Genre detection finished successfully.');
        },
        onError: (error: Error) => {
            toast.error('Analysis Failed', error.message || 'Could not analyze the image.');
        },
    });
}

// ============================================
// CURATION HOOKS
// ============================================

export function useSimilarArtworks(artworkId: string, limit?: number) {
    return useQuery({
        queryKey: aiKeys.similar(artworkId),
        queryFn: () => aiService.getSimilar(artworkId, limit),
        enabled: !!artworkId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function usePersonalizedRecommendations(limit?: number) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.personalized(),
        queryFn: () => aiService.getPersonalized(limit),
        enabled: isAuthenticated && isAuthTokenReady(),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useCurate() {
    const toast = useToast();

    return useMutation({
        mutationFn: (request: CurationRequest) => aiService.getCurated(request),
        onError: (error: Error) => {
            toast.error('Curation Failed', error.message || 'Could not generate recommendations.');
        },
    });
}

// ============================================
// FEEDBACK HOOKS
// ============================================

export function useSubmitFeedback() {
    const toast = useToast();

    return useMutation({
        mutationFn: ({
            detectionId,
            feedback,
        }: {
            detectionId: string;
            feedback: {
                isAccurate: boolean;
                correctGenres?: string[];
                comments?: string;
            };
        }) => aiService.submitFeedback(detectionId, feedback),
        onSuccess: () => {
            toast.success('Feedback Submitted', 'Thank you for helping improve our AI.');
        },
    });
}
