/**
 * User Service - Enterprise Grade
 * Handles user profile fetching, updates, and statistics
 */

import { apiGet, apiPut, apiPost, apiDelete } from '../lib/api';
import { User, Artwork, Collection } from '../lib/types';
import { z } from 'zod';
import { sanitizeInput } from '../lib/security';

// ============================================
// TYPES
// ============================================

export interface UserStats {
    viewsCount: number;
    bookmarksCount: number;
    collectionsCount: number;
    nftCount: number;
    likesCount: number;
}

export interface RecentActivity {
    id: string;
    type: 'view' | 'bookmark' | 'collection' | 'nft_purchase' | 'like';
    title: string;
    description: string;
    timestamp: string;
    resourceId?: string;
    resourceType?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
    displayName: z.string().min(2).max(50).optional().transform(val => val ? sanitizeInput(val) : val),
    bio: z.string().max(500).optional().transform(val => val ? sanitizeInput(val) : val),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    socialLinks: z.object({
        twitter: z.string().url().optional().or(z.literal('')),
        instagram: z.string().url().optional().or(z.literal('')),
        website: z.string().url().optional().or(z.literal('')),
        linkedin: z.string().url().optional().or(z.literal('')),
    }).optional(),
});

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

// ============================================
// USER SERVICE
// ============================================

class UserService {
    private static instance: UserService;

    private constructor() { }

    static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    /**
     * Get current user profile
     */
    async getMyProfile(): Promise<User> {
        return apiGet<User>('/users/me');
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User> {
        return apiGet<User>(`/users/${id}`);
    }

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileData): Promise<User> {
        const validData = updateProfileSchema.parse(data);
        return apiPut<User>('/users/me', validData);
    }

    /**
     * Get user statistics (views, bookmarks, collections, etc.)
     */
    async getStats(): Promise<UserStats> {
        return apiGet<UserStats>('/users/me/stats');
    }

    /**
     * Get user's recent activity
     */
    async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
        return apiGet<RecentActivity[]>('/users/me/activity', { params: { limit } });
    }

    /**
     * Get user bookmarks (saved artworks)
     */
    async getBookmarks(page = 1, limit = 20): Promise<{ data: Artwork[]; total: number }> {
        return apiGet('/users/me/bookmarks', { params: { page, limit } });
    }

    /**
     * Add artwork to bookmarks
     */
    async addBookmark(artworkId: string): Promise<void> {
        return apiPost('/users/me/bookmarks', { artworkId });
    }

    /**
     * Remove artwork from bookmarks
     */
    async removeBookmark(artworkId: string): Promise<void> {
        return apiDelete(`/users/me/bookmarks/${artworkId}`);
    }

    /**
     * Get user collections
     */
    async getCollections(page = 1, limit = 20): Promise<{ data: Collection[]; total: number }> {
        return apiGet('/users/me/collections', { params: { page, limit } });
    }

    /**
     * Create a new collection
     */
    async createCollection(data: { name: string; description?: string; isPublic?: boolean }): Promise<Collection> {
        const sanitizedData = {
            name: sanitizeInput(data.name),
            description: data.description ? sanitizeInput(data.description) : undefined,
            isPublic: data.isPublic ?? true,
        };
        return apiPost<Collection>('/users/me/collections', sanitizedData);
    }

    /**
     * Add artwork to collection
     */
    async addToCollection(collectionId: string, artworkId: string): Promise<void> {
        return apiPost(`/users/me/collections/${collectionId}/artworks`, { artworkId });
    }

    /**
     * Get user's owned NFTs
     */
    async getOwnedNFTs(page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
        return apiGet('/users/me/nfts', { params: { page, limit } });
    }

    /**
     * Upload avatar
     */
    async uploadAvatar(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiPost<{ url: string }>('/users/me/avatar', formData);
    }
}

export const userService = UserService.getInstance();
