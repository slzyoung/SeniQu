/**
 * Collections Hooks
 * React Query hooks for managing user collections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService, CreateCollectionDto } from '../services/collectionsService';
import { useToast } from '../stores/useNotificationStore';

export const collectionKeys = {
    all: ['collections'] as const,
    mine: () => [...collectionKeys.all, 'mine'] as const,
};

/**
 * Hook to fetch current user's collections
 */
export function useMyCollections() {
    return useQuery({
        queryKey: collectionKeys.mine(),
        queryFn: () => collectionsService.getMyCollections(),
    });
}

/**
 * Hook to create a new collection
 */
export function useCreateCollection() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreateCollectionDto) => collectionsService.createCollection(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
            toast.success('Collection Created', 'Your new collection is ready.');
        },
        onError: (error: any) => {
            toast.error('Failed', error.message || 'Could not create collection');
        }
    });
}

/**
 * Hook to add artwork to collection
 */
export function useAddToCollection() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ collectionId, artworkId }: { collectionId: string; artworkId: string }) =>
            collectionsService.addArtworkToCollection(collectionId, artworkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
            toast.success('Added', 'Artwork added to collection.');
        },
        onError: (error: any) => {
            toast.error('Failed', error.message || 'Could not add to collection');
        }
    });
}
