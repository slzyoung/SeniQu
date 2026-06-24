/**
 * Reels Service
 * API client operations for short-form Reels video feature.
 */

import api from '../lib/api';

export interface Reel {
    id: string;
    userId: string;
    videoUrl: string;
    videoKey: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    caption?: string;
    hashtags: string[];
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    aspectRatio: string;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    reshareCount: number;
    viewCount: number;
    status: 'processing' | 'active' | 'hidden' | 'deleted';
    isFeatured: boolean;
    createdAt: string;
    updatedAt: string;
    isLiked?: boolean;
    isReshared?: boolean;
    user?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
        role: string;
    };
}

export interface ReelComment {
    id: string;
    reelId: string;
    userId: string;
    parentId?: string;
    content: string;
    likeCount: number;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface ReelsFeedResponse {
    data: Reel[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const reelsService = {
    /**
     * Get the list of active reels for the feed
     */
    getFeed: async (page = 1, limit = 10, creatorId?: string): Promise<ReelsFeedResponse> => {
        const response = await api.get('/reels/feed', {
            params: { page, limit, creatorId },
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Get the user's saved/bookmarked reels
     */
    getSavedReels: async (page = 1, limit = 20): Promise<ReelsFeedResponse> => {
        const response = await api.get('/reels/saved', {
            params: { page, limit },
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Upload a new short-form Reel video
     */
    uploadReel: async (
        file: File,
        options?: {
            caption?: string;
            hashtags?: string[];
            audioMetadata?: any;
            onProgress?: (progress: number) => void;
        },
    ): Promise<Reel> => {
        const formData = new FormData();
        formData.append('file', file);
        if (options?.caption) {
            formData.append('caption', options.caption);
        }
        if (options?.hashtags) {
            formData.append('hashtags', JSON.stringify(options.hashtags));
        }
        if (options?.audioMetadata) {
            formData.append('audioMetadata', JSON.stringify(options.audioMetadata));
        }

        const response = await api.post('/reels/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 min timeout
            onUploadProgress: (progressEvent) => {
                if (options?.onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    options.onProgress(progress);
                }
            },
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Toggle like state on a Reel
     */
    toggleLike: async (reelId: string): Promise<{ liked: boolean }> => {
        const response = await api.post(`/reels/${reelId}/like`);
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Toggle reshare/retweet state on a Reel
     */
    toggleReshare: async (reelId: string, caption?: string): Promise<{ reshared: boolean }> => {
        const response = await api.post(`/reels/${reelId}/reshare`, { caption });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Get comments for a Reel
     */
    getComments: async (reelId: string, page = 1, limit = 20): Promise<{ data: ReelComment[]; meta: any }> => {
        const response = await api.get(`/reels/${reelId}/comments`, {
            params: { page, limit },
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Post a comment on a Reel
     */
    createComment: async (reelId: string, content: string, parentId?: string): Promise<ReelComment> => {
        const response = await api.post(`/reels/${reelId}/comments`, {
            content,
            parentId,
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Record a view/retention metric for a Reel
     */
    recordView: async (reelId: string, watchDuration = 0, completed = false): Promise<{ recorded: boolean }> => {
        const response = await api.post(`/reels/${reelId}/view`, {
            watchDuration,
            completed,
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Delete a Reel
     */
    deleteReel: async (reelId: string): Promise<void> => {
        await api.delete(`/reels/${reelId}`);
    },
};

export default reelsService;
