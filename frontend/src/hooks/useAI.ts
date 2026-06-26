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
    // Heritage Scan
    scanQuota: () => [...aiKeys.all, 'scan-quota'] as const,
    scanHistory: (limit?: number) => [...aiKeys.all, 'scan-history', limit] as const,
    // Heritage Curation
    curationQuota: () => [...aiKeys.all, 'curation-quota'] as const,
    curationHistory: () => [...aiKeys.all, 'curation-history'] as const,
    publicCurations: () => [...aiKeys.all, 'public-curations'] as const,
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

// ============================================
// HERITAGE SCAN HOOKS
// ============================================

/**
 * Mutation hook for scanning heritage artifacts with Gemini AI.
 * Automatically invalidates quota and history caches on success.
 */
export function useHeritageScan() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
            aiService.scanHeritage(file, onProgress),
        onSuccess: () => {
            // Refresh quota and history after successful scan
            queryClient.invalidateQueries({ queryKey: aiKeys.scanQuota() });
            queryClient.invalidateQueries({ queryKey: aiKeys.scanHistory() });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Gagal menganalisis gambar.';
            toast.error('Scan Gagal', message);
        },
    });
}

/**
 * Query hook for user's daily scan quota.
 */
export function useScanQuota() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.scanQuota(),
        queryFn: () => aiService.getScanQuota(),
        enabled: isAuthenticated && isAuthTokenReady(),
        staleTime: 1000 * 30, // 30s - quota changes frequently
        refetchInterval: 1000 * 60, // Auto-refresh every minute
    });
}

/**
 * Query hook for user's heritage scan history.
 */
export function useScanHistory(limit = 20) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.scanHistory(limit),
        queryFn: () => aiService.getScanHistory(limit),
        enabled: isAuthenticated && isAuthTokenReady(),
        staleTime: 1000 * 60, // 1 minute
    });
}

// ============================================
// HERITAGE CURATION HOOKS
// ============================================

/**
 * Mutation hook for curating and restoring a heritage image.
 */
export function useHeritageCuration() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
            aiService.curateHeritage(file, onProgress),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiKeys.curationQuota() });
            queryClient.invalidateQueries({ queryKey: aiKeys.curationHistory() });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Gagal melakukan kurasi.';
            toast.error('Kurasi Gagal', message);
        },
    });
}

/**
 * Query hook for curation quota.
 */
export function useCurationQuota() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.curationQuota(),
        queryFn: () => aiService.getCurationQuota(),
        enabled: isAuthenticated && isAuthTokenReady(),
        staleTime: 1000 * 30, // 30s
        refetchInterval: 1000 * 60,
    });
}

/**
 * Query hook for user's curation history.
 */
export function useCurationHistory() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: aiKeys.curationHistory(),
        queryFn: () => aiService.getCurationHistory(),
        enabled: isAuthenticated && isAuthTokenReady(),
        staleTime: 1000 * 60, // 1 minute
    });
}

/**
 * Query hook for community masterpieces public curations.
 */
export function usePublicCurations() {
    return useQuery({
        queryKey: aiKeys.publicCurations(),
        queryFn: () => aiService.getPublicCurations(),
        staleTime: 1000 * 60, // 1 minute
    });
}

/**
 * Query hook for getting comments on a heritage curation.
 */
export function useHeritageCurationComments(curationId: string) {
    return useQuery({
        queryKey: ['heritage-curation-comments', curationId],
        queryFn: () => aiService.getHeritageCurationComments(curationId),
        enabled: !!curationId,
        staleTime: 1000 * 30, // 30 seconds
    });
}

/**
 * Mutation hook for adding a comment to a heritage curation.
 */
export function useAddHeritageCurationComment() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ curationId, content }: { curationId: string; content: string }) =>
            aiService.addHeritageCurationComment(curationId, content),
        onSuccess: (_data, variables) => {
            toast.success('Komentar Dikirim', 'Komentar Anda berhasil ditambahkan!');
            queryClient.invalidateQueries({ queryKey: ['heritage-curation-comments', variables.curationId] });
            queryClient.invalidateQueries({ queryKey: aiKeys.publicCurations() });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Gagal mengirimkan komentar.';
            toast.error('Gagal Kirim Komentar', message);
        },
    });
}

/**
 * Mutation hook for toggling like on a heritage curation.
 */
export function useLikeHeritageCuration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (curationId: string) => aiService.likeHeritageCuration(curationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiKeys.publicCurations() });
            queryClient.invalidateQueries({ queryKey: aiKeys.curationHistory() });
        },
    });
}

/**
 * Mutation hook for publishing a curation.
 */
export function usePublishCuration() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => aiService.publishCuration(id),
        onSuccess: () => {
            toast.success('Kurasi Dipublikasikan', 'Karya berhasil dipublikasikan ke Galeri Masterpiece Komunitas!');
            queryClient.invalidateQueries({ queryKey: aiKeys.curationHistory() });
            queryClient.invalidateQueries({ queryKey: aiKeys.publicCurations() });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Gagal mempublikasikan kurasi.';
            toast.error('Gagal Publikasi', message);
        },
    });
}

