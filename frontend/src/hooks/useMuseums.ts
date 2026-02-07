/**
 * Museum Hooks
 * React Query hooks for managing museums
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { museumService, MuseumSearchFilters, NearbyFilters, CreateMuseumData } from '../services/museumService';
import { useToast } from '../stores/useNotificationStore';

// Keys
export const museumKeys = {
    all: ['museums'] as const,
    lists: () => [...museumKeys.all, 'list'] as const,
    list: (filters: MuseumSearchFilters) => [...museumKeys.lists(), filters] as const,
    nearby: (filters: NearbyFilters) => [...museumKeys.all, 'nearby', filters] as const,
    details: () => [...museumKeys.all, 'detail'] as const,
    detail: (slug: string) => [...museumKeys.details(), slug] as const,
};

/**
 * Hook to fetch museums
 */
export function useMuseums(filters: MuseumSearchFilters = {}) {
    return useQuery({
        queryKey: museumKeys.list(filters),
        queryFn: () => museumService.getMuseums(filters),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook to fetch nearby museums
 */
export function useNearbyMuseums(filters: NearbyFilters) {
    return useQuery({
        queryKey: museumKeys.nearby(filters),
        queryFn: () => museumService.getNearbyMuseums(filters),
        enabled: !!filters.lat && !!filters.lng,
    });
}

/**
 * Hook to fetch museum details
 */
export function useMuseum(slug: string) {
    return useQuery({
        queryKey: museumKeys.detail(slug),
        queryFn: () => museumService.getMuseumBySlug(slug),
        enabled: !!slug,
    });
}

/**
 * Hook to create museum
 */
export function useCreateMuseum() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreateMuseumData) => museumService.createMuseum(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: museumKeys.lists() });
            toast.success('Museum Created', 'Institution Profile created successfully.');
        },
        onError: (error: any) => {
            toast.error('Creation Failed', error.message);
        }
    });
}
