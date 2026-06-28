/**
 * Reels Service
 * API client operations for short-form Reels video feature.
 *
 * Upload Strategy (v2):
 *   - Files > 20MB: Direct-to-CDN via presigned URL (3-step flow)
 *   - Files ≤ 20MB: Legacy multipart upload (single request)
 *   Both paths are transparent to the caller.
 */

import api from '../lib/api';

/** Threshold for switching to direct-to-CDN upload (lower = less backend memory pressure) */
const DIRECT_CDN_THRESHOLD = 10 * 1024 * 1024; // 10MB

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
    is_liked?: boolean;
    isReshared?: boolean;
    is_reshared?: boolean;
    isFollowing?: boolean;
    is_following?: boolean;
    like_count?: number;
    reshare_count?: number;
    comment_count?: number;
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
     * Get a single reel by ID
     */
    getReel: async (reelId: string): Promise<Reel> => {
        const response = await api.get(`/reels/${reelId}`);
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
     * Smart upload — automatically picks the best upload strategy.
     * Large files (>20MB) use direct-to-CDN presigned URL flow.
     * Small files use traditional multipart upload.
     */
    uploadReel: async (
        file: File,
        options?: {
            caption?: string;
            hashtags?: string[];
            audioMetadata?: any;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
            xhrRef?: { current: XMLHttpRequest | null };
        },
    ): Promise<Reel> => {
        if (file.size > DIRECT_CDN_THRESHOLD) {
            try {
                return await reelsService.uploadReelDirectCDN(file, options);
            } catch (err: any) {
                console.warn('Direct-to-CDN upload failed:', err);
                options?.onStatus?.('Direct upload failed. Retrying via backend...');
                return await reelsService.uploadReelLegacy(file, options);
            }
        }
        return reelsService.uploadReelLegacy(file, options);
    },

    /**
     * DIRECT-TO-CDN UPLOAD (for files > 20MB)
     * 3-step flow: init → PUT to CDN → complete + poll
     */
    uploadReelDirectCDN: async (
        file: File,
        options?: {
            caption?: string;
            hashtags?: string[];
            audioMetadata?: any;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
            xhrRef?: { current: XMLHttpRequest | null };
        },
    ): Promise<Reel> => {
        const { onProgress, onStatus } = options || {};

        // ── STEP 1: Initialize upload session ──
        onStatus?.('Preparing upload...');
        onProgress?.(2);

        const initResponse = await api.post('/reels/upload/init', {
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            caption: options?.caption,
            hashtags: options?.hashtags,
            audioMetadata: options?.audioMetadata,
        });

        const initData = initResponse.data?.success !== undefined
            ? initResponse.data.data
            : initResponse.data;

        const { sessionId, uploadUrl } = initData;

        onProgress?.(5);
        onStatus?.('Uploading to CDN...');

        // ── STEP 2: Upload video directly to R2 CDN via presigned URL ──
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            if (options?.xhrRef) {
                options.xhrRef.current = xhr;
            }
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    // Map upload progress to 5-75% range
                    const uploadPercent = Math.round((event.loaded / event.total) * 70) + 5;
                    onProgress(Math.min(uploadPercent, 75));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`CDN upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('CDN upload failed — check your network connection'));
            xhr.ontimeout = () => reject(new Error('CDN upload timed out'));
            xhr.timeout = 600000; // 10 min timeout for large files

            xhr.send(file);
        });

        onProgress?.(78);
        onStatus?.('Processing video...');

        // ── STEP 3: Confirm upload + start async compression ──
        const completeResponse = await api.post('/reels/upload/complete', {
            sessionId,
        });

        const completeData = completeResponse.data?.success !== undefined
            ? completeResponse.data.data
            : completeResponse.data;

        // ── STEP 4: Poll for compression completion ──
        onProgress?.(80);
        onStatus?.('Compressing video...');

        await reelsService.pollUploadStatus(
            sessionId,
            (progress, status) => {
                // Map compression progress to 80-100% range
                const totalProgress = 80 + Math.round(progress * 0.2);
                onProgress?.(Math.min(totalProgress, 99));
                if (status) onStatus?.(status);
            }
        );

        onProgress?.(100);
        onStatus?.('Complete!');

        return completeData.reel || completeData;
    },

    /**
     * Poll the upload status until compression completes or fails
     */
    pollUploadStatus: async (
        sessionId: string,
        onUpdate?: (progress: number, status?: string) => void,
    ): Promise<any> => {
        const MAX_POLLS = 180; // Max 3 minutes (1s interval)
        const POLL_INTERVAL = 1000; // 1 second

        for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

            try {
                const response = await api.get(`/reels/upload/status/${sessionId}`);
                const data = response.data?.success !== undefined
                    ? response.data.data
                    : response.data;

                const statusMap: Record<string, string> = {
                    'awaiting_upload': 'Waiting for upload...',
                    'processing': 'Compressing video...',
                    'completed': 'Upload complete!',
                    'failed': 'Processing failed',
                };

                onUpdate?.(data.progress || 0, statusMap[data.status] || data.status);

                if (data.status === 'completed') {
                    return data;
                }

                if (data.status === 'failed') {
                    throw new Error(data.error || 'Video processing failed');
                }
            } catch (err: any) {
                // If it's a poll error (not a processing failure), continue polling
                if (err.response?.status === 404) {
                    throw new Error('Upload session expired');
                }
                // Network errors — wait and retry
                if (!err.response) {
                    continue;
                }
                throw err;
            }
        }

        throw new Error('Video processing timed out. Your video may still be processing — check back in a moment.');
    },

    /**
     * LEGACY MULTIPART UPLOAD (for files ≤ 20MB)
     * Single request — simpler but loads video into backend memory
     */
    uploadReelLegacy: async (
        file: File,
        options?: {
            caption?: string;
            hashtags?: string[];
            audioMetadata?: any;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
        },
    ): Promise<Reel> => {
        options?.onStatus?.('Uploading...');

        const formData = new FormData();
        if (options?.caption) {
            formData.append('caption', options.caption);
        }
        if (options?.hashtags) {
            formData.append('hashtags', JSON.stringify(options.hashtags));
        }
        if (options?.audioMetadata) {
            formData.append('audioMetadata', JSON.stringify(options.audioMetadata));
        }
        formData.append('file', file);

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

        options?.onStatus?.('Complete!');
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
     * Get replies to a specific comment
     */
    getReplies: async (commentId: string, page = 1, limit = 20): Promise<{ data: ReelComment[]; meta: any }> => {
        const response = await api.get(`/reels/comments/${commentId}/replies`, {
            params: { page, limit },
        });
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Toggle like on a comment
     */
    toggleCommentLike: async (commentId: string): Promise<{ liked: boolean }> => {
        const response = await api.post(`/reels/comments/${commentId}/like`);
        return response.data?.success !== undefined ? response.data.data : response.data;
    },

    /**
     * Delete a comment
     */
    deleteComment: async (commentId: string): Promise<void> => {
        await api.delete(`/reels/comments/${commentId}`);
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
