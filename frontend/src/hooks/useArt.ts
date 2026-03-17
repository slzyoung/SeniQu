/**
 * Art Hooks - Enterprise Grade
 * React Query hooks for Art operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artService, Art, ListArtData, MintArtData } from '../services/artService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { getAccessToken } from '../lib/api';

// ============================================
// QUERY KEYS
// ============================================

export const artKeys = {
    all: ['arts'] as const,
    marketplace: (params?: Record<string, unknown>) => [...artKeys.all, 'marketplace', params] as const,
    detail: (id: string) => [...artKeys.all, 'detail', id] as const,
    owned: (params?: Record<string, unknown>) => [...artKeys.all, 'owned', params] as const,
    created: (params?: Record<string, unknown>) => [...artKeys.all, 'created', params] as const,
    transactions: (artId: string) => [...artKeys.all, 'transactions', artId] as const,
    stats: () => [...artKeys.all, 'stats'] as const,
};

// ============================================
// AUTH CHECK HELPER
// ============================================

function isAuthTokenReady(): boolean {
    return !!getAccessToken();
}

// ============================================
// MARKETPLACE HOOKS
// ============================================

export function useArtMarketplace(params?: {
    page?: number;
    limit?: number;
    blockchain?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createdAt' | 'views';
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: artKeys.marketplace(params),
        queryFn: () => artService.getMarketplace(params),
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useArtDetail(id: string) {
    return useQuery({
        queryKey: artKeys.detail(id),
        queryFn: () => artService.getById(id),
        enabled: !!id,
    });
}

export function useArtTransactions(artId: string) {
    return useQuery({
        queryKey: artKeys.transactions(artId),
        queryFn: () => artService.getTransactions(artId),
        enabled: !!artId,
    });
}

export function useArtStats() {
    return useQuery({
        queryKey: artKeys.stats(),
        queryFn: () => artService.getStats(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// USER ART HOOKS
// ============================================

export function useOwnedArts(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artKeys.owned(params),
        queryFn: () => artService.getOwned(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

export function useCreatedArts(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: artKeys.created(params),
        queryFn: () => artService.getCreated(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useMintArt() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: MintArtData) => artService.mint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artKeys.created() });
            queryClient.invalidateQueries({ queryKey: artKeys.owned() });
            toast.success('Art Minted', 'Your artwork has been minted as a digital art.');
        },
        onError: (error: Error) => {
            toast.error('Minting Failed', error.message || 'Could not mint art.');
        },
    });
}

export function useListArt() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: ListArtData) => artService.list(data),
        onSuccess: (art: Art) => {
            queryClient.invalidateQueries({ queryKey: artKeys.detail(art.id) });
            queryClient.invalidateQueries({ queryKey: artKeys.owned() });
            queryClient.invalidateQueries({ queryKey: artKeys.marketplace() });
            toast.success('Art Listed', 'Your art is now available on the marketplace.');
        },
        onError: (error: Error) => {
            toast.error('Listing Failed', error.message || 'Could not list art.');
        },
    });
}

export function useUnlistArt() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (artId: string) => artService.unlist(artId),
        onSuccess: (art: Art) => {
            queryClient.invalidateQueries({ queryKey: artKeys.detail(art.id) });
            queryClient.invalidateQueries({ queryKey: artKeys.owned() });
            queryClient.invalidateQueries({ queryKey: artKeys.marketplace() });
            toast.success('Art Unlisted', 'Your art has been removed from the marketplace.');
        },
    });
}

export function useBuyArt() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (artId: string) => artService.buy(artId),
        onSuccess: (art: Art) => {
            queryClient.invalidateQueries({ queryKey: artKeys.detail(art.id) });
            queryClient.invalidateQueries({ queryKey: artKeys.owned() });
            queryClient.invalidateQueries({ queryKey: artKeys.marketplace() });
            toast.success('Art Purchased', 'Congratulations! The art is now yours.');
        },
        onError: (error: Error) => {
            toast.error('Purchase Failed', error.message || 'Could not complete purchase.');
        },
    });
}

export function useTransferArt() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ artId, toAddress }: { artId: string; toAddress: string }) =>
            artService.transfer(artId, toAddress),
        onSuccess: (art: Art) => {
            queryClient.invalidateQueries({ queryKey: artKeys.detail(art.id) });
            queryClient.invalidateQueries({ queryKey: artKeys.owned() });
            toast.success('Art Transferred', 'The art has been transferred successfully.');
        },
        onError: (error: Error) => {
            toast.error('Transfer Failed', error.message || 'Could not transfer art.');
        },
    });
}
