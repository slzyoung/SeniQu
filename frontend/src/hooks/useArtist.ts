/**
 * Artist Hooks - Enterprise Grade
 * React Query hooks for artist dashboard and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artistService, ArtistStats, CreateArtworkDto } from '../services/artistService';
import { useToast } from '../stores/useNotificationStore';
import { useAuthStore } from '../stores/useAuthStore';

// ============================================
// QUERY KEYS
// ============================================

export const artistKeys = {
    all: ['artist'] as const,
    stats: () => [...artistKeys.all, 'stats'] as const,
    analytics: (period: string) => [...artistKeys.all, 'analytics', period] as const,
    performance: () => [...artistKeys.all, 'performance'] as const,
    profile: () => [...artistKeys.all, 'profile'] as const,
    artworks: (page: number, limit: number, filters?: object) => [...artistKeys.all, 'artworks', page, limit, filters] as const,
    followers: (page: number, limit: number) => [...artistKeys.all, 'followers', page, limit] as const,
    activity: () => [...artistKeys.all, 'activity'] as const,
    publicArtist: (id: string) => ['artists', id] as const,
    publicArtworks: (artistId: string, page: number, limit: number) => ['artists', artistId, 'artworks', page, limit] as const,
};

// ============================================
// DASHBOARD STATS
// ============================================

export function useArtistStats() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.stats(),
        queryFn: () => artistService.getStats(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
        placeholderData: {
            totalArtworks: 0,
            publishedArtworks: 0,
            draftArtworks: 0,
            totalViews: 0,
            totalLikes: 0,
            totalSales: 0,
            totalRevenue: 0,
            totalFollowers: 0,
            averageRating: 0,
        } as ArtistStats,
    });
}

export function useArtistAnalytics(period = '30d') {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.analytics(period),
        queryFn: () => artistService.getAnalytics(period),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
    });
}

export function useArtistPerformance() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.performance(),
        queryFn: () => artistService.getPerformance(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
    });
}

// ============================================
// ARTWORKS MANAGEMENT
// ============================================

export function useMyArtworks(page = 1, limit = 20, filters?: { status?: string; category?: string }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.artworks(page, limit, filters),
        queryFn: () => artistService.getMyArtworks(page, limit, filters),
        enabled: isAuthenticated,
        placeholderData: (prev) => prev,
    });
}

export function useCreateArtwork() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreateArtworkDto) => artistService.createArtwork(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artist', 'artworks'] });
            queryClient.invalidateQueries({ queryKey: artistKeys.stats() });
            toast.success('Artwork Created', 'Your artwork has been saved as draft.');
        },
        onError: () => {
            toast.error('Creation Failed', 'Could not create artwork.');
        },
    });
}

export function useUpdateArtwork() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateArtworkDto> }) =>
            artistService.updateArtwork(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artist', 'artworks'] });
            toast.success('Artwork Updated', 'Your changes have been saved.');
        },
        onError: () => {
            toast.error('Update Failed', 'Could not update artwork.');
        },
    });
}

export function useDeleteArtwork() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => artistService.deleteArtwork(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artist', 'artworks'] });
            queryClient.invalidateQueries({ queryKey: artistKeys.stats() });
            toast.success('Artwork Deleted', 'The artwork has been removed.');
        },
        onError: () => {
            toast.error('Delete Failed', 'Could not delete artwork.');
        },
    });
}

export function usePublishArtwork() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => artistService.publishArtwork(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artist', 'artworks'] });
            queryClient.invalidateQueries({ queryKey: artistKeys.stats() });
            toast.success('Artwork Published', 'Your artwork is now live!');
        },
        onError: () => {
            toast.error('Publish Failed', 'Could not publish artwork.');
        },
    });
}

// ============================================
// PROFILE
// ============================================

export function useArtistProfile() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.profile(),
        queryFn: () => artistService.getProfile(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
    });
}

export function useUpdateArtistProfile() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
            artistService.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artistKeys.profile() });
            toast.success('Profile Updated', 'Your profile has been updated.');
        },
        onError: () => {
            toast.error('Update Failed', 'Could not update profile.');
        },
    });
}

// ============================================
// ENGAGEMENT
// ============================================

export function useArtistFollowers(page = 1, limit = 20) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.followers(page, limit),
        queryFn: () => artistService.getFollowers(page, limit),
        enabled: isAuthenticated,
        placeholderData: (prev) => prev,
    });
}

export function useArtistActivity() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artistKeys.activity(),
        queryFn: () => artistService.getRecentActivity(),
        enabled: isAuthenticated,
    });
}

// ============================================
// PUBLIC ARTIST PROFILES
// ============================================

export function usePublicArtistProfile(artistId: string) {
    return useQuery({
        queryKey: artistKeys.publicArtist(artistId),
        queryFn: () => artistService.getArtistById(artistId),
        enabled: !!artistId,
    });
}

export function usePublicArtistArtworks(artistId: string, page = 1, limit = 20) {
    return useQuery({
        queryKey: artistKeys.publicArtworks(artistId, page, limit),
        queryFn: () => artistService.getArtistArtworks(artistId, page, limit),
        enabled: !!artistId,
        placeholderData: (prev) => prev,
    });
}
