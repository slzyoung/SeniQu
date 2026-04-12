/**
 * User Service - Enterprise Grade
 * Handles user profile fetching, updates, and statistics
 */

import { apiGet, apiPatch, apiPost, apiDelete, uploadFile } from '../lib/api';
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
    username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/).optional(),
    displayName: z.string().min(2).max(50).optional().transform(val => val ? sanitizeInput(val) : val),
    bio: z.string().max(500).optional().transform(val => val ? sanitizeInput(val) : val),
    avatarUrl: z.string().optional().or(z.literal('')),
    socialLinks: z.object({
        twitter: z.string().optional().or(z.literal('')),
        instagram: z.string().optional().or(z.literal('')),
        telegram: z.string().optional().or(z.literal('')),
        linkedin: z.string().optional().or(z.literal('')),
    }).optional(),
    notificationPrefs: z.record(z.boolean()).optional(),
    isTwoFactorEnabled: z.boolean().optional(),
    loginAlertsEnabled: z.boolean().optional(),
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
     * Helper to map backend user to frontend user
     * Duplicates logic from AuthService to ensure consistency
     */
    private mapUser(backendUser: any): User {
        if (!backendUser) return backendUser;

        // Unwrap if wrapped in data property (standard API response)
        const user = backendUser.data || backendUser;

        let role = 'user';

        // Map userType to role
        if (user.userType) {
            switch (user.userType) {
                case 'ARTIST': role = 'artist'; break;
                case 'COLLECTOR': role = 'collector'; break;
                case 'INSTITUTION': role = 'institution'; break;
                case 'ART_LOVER':
                default: role = 'user'; break;
            }
        } else if (user.role) {
            // If backend already returns role (some endpoints might)
            role = user.role;
        }

        // Override if admin
        if (user.adminRole) {
            role = user.adminRole === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
        }

        return {
            ...user,
            username: user.username || '',
            displayName: user.displayName || user.display_name || '',
            role: role as any,
            wallets: (user.wallets || []).map((w: any) => ({
                chainType: w.chainType || w.chain_type,
                address: w.address || w.wallet_address,
                verifiedAt: w.verifiedAt || w.verified_at || new Date().toISOString(),
            })),
            notificationPrefs: user.notificationPrefs || user.notification_prefs || {
                email: true,
                push: true,
                newArtwork: true,
                priceAlerts: false,
                weeklyDigest: true
            },
            isTwoFactorEnabled: user.isTwoFactorEnabled || user.is_two_factor_enabled || false,
            loginAlertsEnabled: user.loginAlertsEnabled !== undefined ? user.loginAlertsEnabled : (user.login_alerts_enabled !== undefined ? user.login_alerts_enabled : true),
        };
    }

    /**
     * Get current user profile
     */
    async getMyProfile(): Promise<User> {
        const user = await apiGet<any>('/users/me');
        return this.mapUser(user);
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User> {
        const user = await apiGet<any>(`/users/${id}`);
        return this.mapUser(user);
    }

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileData): Promise<User> {
        const validData = updateProfileSchema.parse(data);
        const user = await apiPatch<any>('/users/me', validData);
        return this.mapUser(user);
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
        const result = await uploadFile(file, 'avatars');
        return { url: result.url };
    }
}

export const userService = UserService.getInstance();
