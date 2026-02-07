/**
 * NFT Hooks - Enterprise Grade
 * React Query hooks for NFT operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nftService, NFT, ListNFTData, MintNFTData } from '../services/nftService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { getAccessToken } from '../lib/api';

// ============================================
// QUERY KEYS
// ============================================

export const nftKeys = {
    all: ['nfts'] as const,
    marketplace: (params?: Record<string, unknown>) => [...nftKeys.all, 'marketplace', params] as const,
    detail: (id: string) => [...nftKeys.all, 'detail', id] as const,
    owned: (params?: Record<string, unknown>) => [...nftKeys.all, 'owned', params] as const,
    created: (params?: Record<string, unknown>) => [...nftKeys.all, 'created', params] as const,
    transactions: (nftId: string) => [...nftKeys.all, 'transactions', nftId] as const,
    stats: () => [...nftKeys.all, 'stats'] as const,
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

export function useNFTMarketplace(params?: {
    page?: number;
    limit?: number;
    blockchain?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createdAt' | 'views';
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: nftKeys.marketplace(params),
        queryFn: () => nftService.getMarketplace(params),
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useNFTDetail(id: string) {
    return useQuery({
        queryKey: nftKeys.detail(id),
        queryFn: () => nftService.getById(id),
        enabled: !!id,
    });
}

export function useNFTTransactions(nftId: string) {
    return useQuery({
        queryKey: nftKeys.transactions(nftId),
        queryFn: () => nftService.getTransactions(nftId),
        enabled: !!nftId,
    });
}

export function useNFTStats() {
    return useQuery({
        queryKey: nftKeys.stats(),
        queryFn: () => nftService.getStats(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// USER NFT HOOKS
// ============================================

export function useOwnedNFTs(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: nftKeys.owned(params),
        queryFn: () => nftService.getOwned(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

export function useCreatedNFTs(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: nftKeys.created(params),
        queryFn: () => nftService.getCreated(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useMintNFT() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: MintNFTData) => nftService.mint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: nftKeys.created() });
            queryClient.invalidateQueries({ queryKey: nftKeys.owned() });
            toast.success('NFT Minted', 'Your artwork has been minted as an NFT.');
        },
        onError: (error: Error) => {
            toast.error('Minting Failed', error.message || 'Could not mint NFT.');
        },
    });
}

export function useListNFT() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: ListNFTData) => nftService.list(data),
        onSuccess: (nft: NFT) => {
            queryClient.invalidateQueries({ queryKey: nftKeys.detail(nft.id) });
            queryClient.invalidateQueries({ queryKey: nftKeys.owned() });
            queryClient.invalidateQueries({ queryKey: nftKeys.marketplace() });
            toast.success('NFT Listed', 'Your NFT is now available on the marketplace.');
        },
        onError: (error: Error) => {
            toast.error('Listing Failed', error.message || 'Could not list NFT.');
        },
    });
}

export function useUnlistNFT() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (nftId: string) => nftService.unlist(nftId),
        onSuccess: (nft: NFT) => {
            queryClient.invalidateQueries({ queryKey: nftKeys.detail(nft.id) });
            queryClient.invalidateQueries({ queryKey: nftKeys.owned() });
            queryClient.invalidateQueries({ queryKey: nftKeys.marketplace() });
            toast.success('NFT Unlisted', 'Your NFT has been removed from the marketplace.');
        },
    });
}

export function useBuyNFT() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (nftId: string) => nftService.buy(nftId),
        onSuccess: (nft: NFT) => {
            queryClient.invalidateQueries({ queryKey: nftKeys.detail(nft.id) });
            queryClient.invalidateQueries({ queryKey: nftKeys.owned() });
            queryClient.invalidateQueries({ queryKey: nftKeys.marketplace() });
            toast.success('NFT Purchased', 'Congratulations! The NFT is now yours.');
        },
        onError: (error: Error) => {
            toast.error('Purchase Failed', error.message || 'Could not complete purchase.');
        },
    });
}

export function useTransferNFT() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ nftId, toAddress }: { nftId: string; toAddress: string }) =>
            nftService.transfer(nftId, toAddress),
        onSuccess: (nft: NFT) => {
            queryClient.invalidateQueries({ queryKey: nftKeys.detail(nft.id) });
            queryClient.invalidateQueries({ queryKey: nftKeys.owned() });
            toast.success('NFT Transferred', 'The NFT has been transferred successfully.');
        },
        onError: (error: Error) => {
            toast.error('Transfer Failed', error.message || 'Could not transfer NFT.');
        },
    });
}
