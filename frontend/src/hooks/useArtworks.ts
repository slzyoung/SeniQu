/**
 * Artwork Hooks
 * React Query hooks for managing artworks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artworkService, ArtworkFilters, CreateArtworkData } from '../services/artworkService';
import { useToast } from '../stores/useNotificationStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';

// Keys
export const artworkKeys = {
    all: ['artworks'] as const,
    lists: () => [...artworkKeys.all, 'list'] as const,
    list: (filters: ArtworkFilters) => [...artworkKeys.lists(), filters] as const,
    details: () => [...artworkKeys.all, 'detail'] as const,
    detail: (id: string) => [...artworkKeys.details(), id] as const,
};

/**
 * Hook to fetch artworks with filters
 */
export function useArtworks(filters: ArtworkFilters = {}) {
    return useQuery({
        queryKey: artworkKeys.list(filters),
        queryFn: () => artworkService.getArtworks(filters),
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to fetch single artwork
 */
export function useArtwork(id: string) {
    return useQuery({
        queryKey: artworkKeys.detail(id),
        queryFn: () => artworkService.getArtworkById(id),
        enabled: !!id,
    });
}

/**
 * Hook to create artwork
 */
export function useCreateArtwork() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: CreateArtworkData) => artworkService.createArtwork(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artworkKeys.lists() });
            toast.success('Artwork Created', 'Your artwork has been uploaded successfully.');
            navigate(ROUTES.ARTIST_ARTWORKS);
        },
        onError: (error: any) => {
            toast.error('Upload Failed', error.message || 'Could not create artwork');
        }
    });
}
