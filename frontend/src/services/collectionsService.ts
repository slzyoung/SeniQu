/**
 * Collections Service
 * Handles collection management for users
 */

import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Artwork } from '../lib/types';

export interface Collection {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    artworks: Artwork[];
    createdAt: string;
    updatedAt: string;
    artworkCount?: number; // Optional derived field
}

export interface CreateCollectionDto {
    name: string;
    description: string;
    isPublic?: boolean;
    coverImageUrl?: string;
}

class CollectionsService {
    private static instance: CollectionsService;

    private constructor() { }

    static getInstance(): CollectionsService {
        if (!CollectionsService.instance) {
            CollectionsService.instance = new CollectionsService();
        }
        return CollectionsService.instance;
    }

    /**
     * Get public collections of a user
     */
    async getUserCollections(userId: string): Promise<Collection[]> {
        return apiGet<Collection[]>(`/collections/user/${userId}`);
    }

    /**
     * Get my collections
     */
    async getMyCollections(): Promise<Collection[]> {
        return apiGet<Collection[]>('/collections/me');
    }

    /**
     * Create new collection
     */
    async createCollection(data: CreateCollectionDto): Promise<Collection> {
        return apiPost<Collection>('/collections', data);
    }

    /**
     * Add artwork to collection
     */
    async addArtworkToCollection(collectionId: string, artworkId: string): Promise<void> {
        return apiPost(`/collections/${collectionId}/artworks/${artworkId}`);
    }

    /**
     * Remove artwork from collection
     */
    async removeArtworkFromCollection(collectionId: string, artworkId: string): Promise<void> {
        return apiDelete(`/collections/${collectionId}/artworks/${artworkId}`);
    }

    /**
     * Delete collection
     */
    async deleteCollection(collectionId: string): Promise<void> {
        return apiDelete(`/collections/${collectionId}`);
    }
}

export const collectionsService = CollectionsService.getInstance();
