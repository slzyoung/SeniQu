/**
 * NFT Service - Enterprise Grade
 * API service for NFT marketplace operations
 */

import { apiGet, apiPost, apiPut } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface NFT {
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

export interface NFTTransaction {
    id: string;
    nftId: string;
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

export interface ListNFTData {
    nftId: string;
    price: number;
    currency?: string;
}

export interface MintNFTData {
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

export const nftService = {
    // Get marketplace listings
    getMarketplace: async (params?: {
        page?: number;
        limit?: number;
        blockchain?: string;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: 'price' | 'createdAt' | 'views';
        sortOrder?: 'asc' | 'desc';
    }): Promise<PaginatedResponse<NFT>> => {
        return apiGet('/nfts/marketplace', { params });
    },

    // Get single NFT details
    getById: async (id: string): Promise<NFT> => {
        return apiGet(`/nfts/${id}`);
    },

    // Get NFT by token ID and contract
    getByToken: async (tokenId: string, contractAddress: string): Promise<NFT> => {
        return apiGet(`/nfts/token/${tokenId}/${contractAddress}`);
    },

    // Get user's owned NFTs
    getOwned: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<NFT>> => {
        return apiGet('/nfts/owned', { params });
    },

    // Get NFTs created by user
    getCreated: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<NFT>> => {
        return apiGet('/nfts/created', { params });
    },

    // Get NFT transaction history
    getTransactions: async (nftId: string): Promise<NFTTransaction[]> => {
        return apiGet(`/nfts/${nftId}/transactions`);
    },

    // Mint new NFT
    mint: async (data: MintNFTData): Promise<NFT> => {
        return apiPost('/nfts/mint', data);
    },

    // List NFT for sale
    list: async (data: ListNFTData): Promise<NFT> => {
        return apiPut(`/nfts/${data.nftId}/list`, {
            price: data.price,
            currency: data.currency || 'ETH',
        });
    },

    // Unlist NFT from sale
    unlist: async (nftId: string): Promise<NFT> => {
        return apiPut(`/nfts/${nftId}/unlist`);
    },

    // Buy NFT
    buy: async (nftId: string): Promise<NFT> => {
        return apiPost(`/nfts/${nftId}/buy`);
    },

    // Transfer NFT
    transfer: async (nftId: string, toAddress: string): Promise<NFT> => {
        return apiPost(`/nfts/${nftId}/transfer`, { toAddress });
    },

    // Get marketplace stats
    getStats: async (): Promise<{
        totalNFTs: number;
        totalListed: number;
        totalVolume: number;
        averagePrice: number;
        topSellers: Array<{ userId: string; volume: number }>;
    }> => {
        return apiGet('/nfts/stats');
    },
};

export default nftService;
