/**
 * User Hooks - Enterprise Grade
 * React Query hooks for managing user data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, UpdateProfileData, UserStats } from '../services/userService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { authService } from '../services/authService';
import { getAccessToken } from '../lib/api';

// ============================================
// QUERY KEYS
// ============================================

export const userKeys = {
    all: ['users'] as const,
    currentUser: () => [...userKeys.all, 'me'] as const,
    stats: () => [...userKeys.all, 'me', 'stats'] as const,
    activity: () => [...userKeys.all, 'me', 'activity'] as const,
    bookmarks: (page: number, limit: number) => [...userKeys.all, 'me', 'bookmarks', page, limit] as const,
    collections: (page: number, limit: number) => [...userKeys.all, 'me', 'collections', page, limit] as const,
    arts: (page: number, limit: number) => [...userKeys.all, 'me', 'arts', page, limit] as const,
    byId: (id: string) => [...userKeys.all, id] as const,
};

// ============================================
// AUTH TOKEN CHECK HELPER
// ============================================

/**
 * Check if auth token is actually ready (loaded into memory for axios interceptor)
 * This prevents race conditions where queries fire before token is ready
 */
function isAuthTokenReady(): boolean {
    // Token must be in memory (for axios) not just localStorage
    return !!getAccessToken();
}

// ============================================
// CURRENT USER
// ============================================

export function useCurrentUser() {
    const { setUser, isAuthenticated, user: existingUser } = useAuthStore();

    return useQuery({
        queryKey: userKeys.currentUser(),
        queryFn: async () => {
            const profileUser = await userService.getMyProfile();
            // Merge with existing user data to preserve fields like role
            // that might not be returned by /users/me endpoint
            const mergedUser = {
                ...existingUser,
                ...profileUser,
                // Ensure critical fields from existing user are preserved if API doesn't return them
                role: profileUser.role || existingUser?.role,
            };

            setUser(mergedUser);
            return mergedUser;
        },
        // Only fetch when token is actually in memory (not just localStorage)
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { updateUser } = useAuthStore();

    return useMutation({
        mutationFn: (data: UpdateProfileData) => userService.updateProfile(data),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.currentUser(), updatedUser);
            updateUser(updatedUser);
            toast.success('Profile Updated', 'Your changes have been saved successfully.');
        },
        onError: (error: any) => {
            toast.error('Update Failed', error.message || 'Could not update profile');
        }
    });
}

// ============================================
// USER STATS
// ============================================

export function useUserStats() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: userKeys.stats(),
        queryFn: () => userService.getStats(),
        // Only fetch when token is actually in memory
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
        staleTime: 1000 * 60 * 2, // 2 minutes
        placeholderData: {
            bookmarksCount: 0,
            collectionsCount: 0,
            viewsCount: 0,
            artworksCount: 0,
            likesCount: 0,
        } as UserStats,
    });
}

export function useRecentActivity(limit = 10) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: userKeys.activity(),
        queryFn: () => userService.getRecentActivity(limit),
        // Only fetch when token is actually in memory
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
    });
}

// ============================================
// BOOKMARKS
// ============================================

export function useBookmarks(page = 1, limit = 20) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: userKeys.bookmarks(page, limit),
        queryFn: () => userService.getBookmarks(page, limit),
        // Only fetch when token is actually in memory
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
        placeholderData: (prev) => prev,
    });
}

export function useAddBookmark() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (artworkId: string) => userService.addBookmark(artworkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'me', 'bookmarks'] });
            queryClient.invalidateQueries({ queryKey: userKeys.stats() });
            toast.success('Bookmarked', 'Artwork added to your bookmarks.');
        },
        onError: () => {
            toast.error('Failed', 'Could not add bookmark.');
        },
    });
}

export function useRemoveBookmark() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (artworkId: string) => userService.removeBookmark(artworkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'me', 'bookmarks'] });
            queryClient.invalidateQueries({ queryKey: userKeys.stats() });
            toast.success('Removed', 'Bookmark has been removed.');
        },
    });
}

// ============================================
// COLLECTIONS
// ============================================

export function useCollections(page = 1, limit = 20) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: userKeys.collections(page, limit),
        queryFn: () => userService.getCollections(page, limit),
        // Only fetch when token is actually in memory
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
        placeholderData: (prev) => prev,
    });
}

export function useCreateCollection() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: { name: string; description?: string; isPublic?: boolean }) =>
            userService.createCollection(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'me', 'collections'] });
            queryClient.invalidateQueries({ queryKey: userKeys.stats() });
            toast.success('Collection Created', 'Your new collection is ready.');
        },
        onError: () => {
            toast.error('Failed', 'Could not create collection.');
        },
    });
}

export function useAddToCollection() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ collectionId, artworkId }: { collectionId: string; artworkId: string }) =>
            userService.addToCollection(collectionId, artworkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'me', 'collections'] });
            toast.success('Added', 'Artwork added to collection.');
        },
    });
}

// ============================================
// NFTs
// ============================================

export function useOwnedArtworks(page = 1, limit = 20) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: userKeys.arts(page, limit),
        queryFn: () => userService.getOwnedArtworks(page, limit),
        // Only fetch when token is actually in memory
        enabled: (isAuthenticated && isAuthTokenReady()) || (authService.isAuthenticated() && isAuthTokenReady()),
        placeholderData: (prev) => prev,
    });
}

// ============================================
// AVATAR
// ============================================

export function useUploadAvatar() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (file: File) => userService.uploadAvatar(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.currentUser() });
            toast.success('Avatar Updated', 'Your profile picture has been updated.');
        },
        onError: () => {
            toast.error('Upload Failed', 'Could not upload avatar.');
        },
    });
}

// ============================================
// WALLET HOOKS
// ============================================

export function useConnectedWallets() {
    return useQuery({
        queryKey: ['connected-wallets'],
        queryFn: async () => {
            // We need to import apiGet here or reuse from lib/api
            // Since apiGet isn't exported from hooks/useUser.ts, we'll use the imported one if available
            // Looking at imports: import { getAccessToken } from '../lib/api';
            // We need to add apiGet and apiDelete to imports
            const { apiGet } = await import('../lib/api');
            const response = await apiGet<any>('/wallet/connections');
            return response.wallets || [];
        },
        staleTime: 30000,
    });
}

export function useUnlinkWallet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (walletId: string) => {
            const { apiDelete } = await import('../lib/api');
            await apiDelete(`/wallet/link/${walletId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connected-wallets'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        },
    });
}
