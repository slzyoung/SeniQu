/**
 * Art Service - Enterprise Grade
 * API service for Arts marketplace operations
 */

import { apiGet, apiPost, apiPut } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface Art {
    id: string;
    artworkId: string;
    tokenId: string;
    contractAddress: string;
    blockchain: string;
    creatorId: string;
    currentOwnerId: string;
    price: number;
    currency: string;
    royaltyPercentage: number;
    status: 'minting' | 'minted' | 'listed' | 'sold' | 'transferred' | 'burned';
    isListed: boolean;
    listingPrice?: number;
    metadataUri?: string;
    metadataHash?: string;
    mintedAt?: string;
    createdAt: string;
    updatedAt: string;
    artwork?: {
        id: string;
        title: string;
        primaryImageUrl: string;
        artist?: {
            id: string;
            displayName: string;
            avatarUrl?: string;
        };
    };
    creator?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
    currentOwner?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface ArtTransaction {
    id: string;
    artId: string;
    transactionType: 'mint' | 'list' | 'buy' | 'transfer' | 'bid' | 'auction_end';
    fromAddress?: string;
    toAddress?: string;
    price?: number;
    currency?: string;
    txHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    createdAt: string;
}

export interface ListArtData {
    artId: string;
    price: number;
    currency?: string;
}

export interface MintArtData {
    artworkId: string;
    price?: number;
    royaltyPercentage?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ============================================
// SERVICE
// ============================================

export const artService = {
    // Get marketplace listings
    getMarketplace: async (params?: {
        page?: number;
        limit?: number;
        blockchain?: string;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: 'price' | 'createdAt' | 'views';
        sortOrder?: 'asc' | 'desc';
    }): Promise<PaginatedResponse<Art>> => {
        return apiGet('/arts/marketplace', { params });
    },

    // Get single Art details
    getById: async (id: string): Promise<Art> => {
        return apiGet(`/arts/${id}`);
    },

    // Get Art by token ID and contract
    getByToken: async (tokenId: string, contractAddress: string): Promise<Art> => {
        return apiGet(`/arts/token/${tokenId}/${contractAddress}`);
    },

    // Get user's owned Arts
    getOwned: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<Art>> => {
        return apiGet('/arts/owned', { params });
    },

    // Get Arts created by user
    getCreated: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<Art>> => {
        return apiGet('/arts/created', { params });
    },

    // Get Art transaction history
    getTransactions: async (artId: string): Promise<ArtTransaction[]> => {
        return apiGet(`/arts/${artId}/transactions`);
    },

    // Mint new Art
    mint: async (data: MintArtData): Promise<Art> => {
        return apiPost('/arts/mint', data);
    },

    // List Art for sale
    list: async (data: ListArtData): Promise<Art> => {
        return apiPut(`/arts/${data.artId}/list`, {
            price: data.price,
            currency: data.currency || 'ETH',
        });
    },

    // Unlist Art from sale
    unlist: async (artId: string): Promise<Art> => {
        return apiPut(`/arts/${artId}/unlist`);
    },

    // Buy Art
    buy: async (artId: string): Promise<Art> => {
        return apiPost(`/arts/${artId}/buy`);
    },

    // Transfer Art
    transfer: async (artId: string, toAddress: string): Promise<Art> => {
        return apiPost(`/arts/${artId}/transfer`, { toAddress });
    },

    // Get marketplace stats
    getStats: async (): Promise<{
        totalArts: number;
        totalListed: number;
        totalVolume: number;
        averagePrice: number;
        topSellers: Array<{ userId: string; volume: number }>;
    }> => {
        return apiGet('/arts/stats');
    },
};

export default artService;
