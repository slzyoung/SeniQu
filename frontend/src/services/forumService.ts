/**
 * Forum Service - Enterprise Grade
 * API service for community forum operations
 */

import api, { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface ForumCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    sortOrder: number;
    threadCount: number;
    isActive: boolean;
    createdAt: string;
}

export interface ForumThread {
    id: string;
    categoryId: string;
    authorId: string;
    author_id?: string;
    title: string;
    slug: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    media_type?: string;
    video_thumbnail_url?: string;
    videoThumbnailUrl?: string;
    tags: string[];
    isPinned: boolean;
    isLocked: boolean;
    isFeatured: boolean;
    views: number;
    likes: number;
    replyCount: number;
    lastReplyAt?: string;
    createdAt: string;
    updatedAt: string;
    category?: ForumCategory;
    author?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        role: string;
    };
}

export interface ForumPost {
    id: string;
    threadId: string;
    authorId: string;
    parentId?: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    likes: number;
    isSolution: boolean;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
    author?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        role: string;
    };
    replies?: ForumPost[];
}

export interface CreateThreadData {
    categoryId: string;
    title: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | string;
    tags?: string[];
}

export interface CreatePostData {
    threadId: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | string;
    parentId?: string;
}

export interface ForumVideoUploadResult {
    key: string;
    url: string;
    size: number;
    contentType: string;
    thumbnailKey?: string;
    thumbnailUrl?: string;
    videoId?: string;
    metadata: {
        duration: number;
        width: number;
        height: number;
        videoCodec: string;
        audioCodec: string | null;
        bitrate: number;
        fps: number;
        aspectRatio: string;
        originalFileSize: number;
        compressedFileSize: number;
        compressionRatio: number;
        originalFilename: string;
    };
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

export const forumService = {
    // ==========================================
    // CATEGORIES
    // ==========================================

    getCategories: async (): Promise<ForumCategory[]> => {
        return apiGet('/forum/categories');
    },

    getCategoryBySlug: async (slug: string): Promise<ForumCategory> => {
        return apiGet(`/forum/categories/${slug}`);
    },

    // ==========================================
    // THREADS
    // ==========================================

    getThreads: async (params?: {
        categoryId?: string;
        page?: number;
        limit?: number;
        sortBy?: 'latest' | 'popular' | 'views';
        tag?: string;
        authorId?: string;
    }): Promise<PaginatedResponse<ForumThread>> => {
        return apiGet('/forum/threads', { params });
    },

    getThread: async (id: string): Promise<ForumThread> => {
        return apiGet(`/forum/threads/${id}`);
    },

    getThreadBySlug: async (slug: string): Promise<ForumThread> => {
        return apiGet(`/forum/threads/slug/${slug}`);
    },

    createThread: async (data: CreateThreadData): Promise<ForumThread> => {
        const payload = {
            category_id: data.categoryId,
            title: data.title,
            content: data.content,
            tags: data.tags,
            media_url: data.mediaUrl,
            media_type: data.mediaType
        };
        return apiPost('/forum/threads', payload);
    },

    updateThread: async (id: string, data: Partial<CreateThreadData>): Promise<ForumThread> => {
        return apiPut(`/forum/threads/${id}`, data);
    },

    deleteThread: async (id: string): Promise<void> => {
        return apiDelete(`/forum/threads/${id}`);
    },

    likeThread: async (id: string): Promise<void> => {
        return apiPost(`/forum/threads/${id}/like`);
    },

    unlikeThread: async (id: string): Promise<void> => {
        return apiDelete(`/forum/threads/${id}/like`);
    },

    // ==========================================
    // POSTS (REPLIES)
    // ==========================================

    getPosts: async (threadId: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<ForumPost>> => {
        return apiGet(`/forum/threads/${threadId}/posts`, { params });
    },

    createPost: async (data: CreatePostData): Promise<ForumPost> => {
        const payload = {
            content: data.content,
            media_url: data.mediaUrl,
            media_type: data.mediaType,
            parent_id: data.parentId
        };
        return apiPost(`/forum/threads/${data.threadId}/posts`, payload);
    },

    updatePost: async (id: string, content: string): Promise<ForumPost> => {
        return apiPut(`/forum/posts/${id}`, { content });
    },

    deletePost: async (id: string): Promise<void> => {
        return apiDelete(`/forum/posts/${id}`);
    },

    likePost: async (id: string): Promise<void> => {
        return apiPost(`/forum/posts/${id}/like`);
    },

    unlikePost: async (id: string): Promise<void> => {
        return apiDelete(`/forum/posts/${id}/like`);
    },

    markAsSolution: async (id: string): Promise<ForumPost> => {
        return apiPut(`/forum/posts/${id}/solution`);
    },

    // ==========================================
    // VIDEO UPLOAD — Smart Strategy (CDN Direct for >20MB)
    // ==========================================

    /** Threshold for switching to direct-to-CDN upload (lower = less backend memory pressure) */
    DIRECT_CDN_THRESHOLD: 10 * 1024 * 1024,

    /**
     * Smart upload — automatically picks the best upload strategy.
     * Large files (>20MB) use direct-to-CDN presigned URL flow.
     * Small files use traditional multipart upload.
     */
    uploadVideo: async (
        file: File,
        options?: {
            threadId?: string;
            postId?: string;
            caption?: string;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
        },
    ): Promise<ForumVideoUploadResult> => {
        if (file.size > forumService.DIRECT_CDN_THRESHOLD) {
            try {
                return await forumService.uploadVideoDirectCDN(file, options);
            } catch (err: any) {
                console.warn('Direct-to-CDN upload failed:', err);
                options?.onStatus?.('Direct upload failed. Retrying via backend...');
                return await forumService.uploadVideoLegacy(file, options);
            }
        }
        return forumService.uploadVideoLegacy(file, options);
    },

    /**
     * DIRECT-TO-CDN UPLOAD (for files > 20MB)
     * 3-step flow: init → PUT to CDN → complete + poll
     */
    uploadVideoDirectCDN: async (
        file: File,
        options?: {
            threadId?: string;
            postId?: string;
            caption?: string;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
        },
    ): Promise<ForumVideoUploadResult> => {
        const { onProgress, onStatus } = options || {};

        // ── STEP 1: Initialize upload session ──
        onStatus?.('Preparing upload...');
        onProgress?.(2);

        const initResponse = await api.post('/forum/video/upload/init', {
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            threadId: options?.threadId,
            postId: options?.postId,
            caption: options?.caption,
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
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
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
            xhr.timeout = 600000; // 10 min timeout

            xhr.send(file);
        });

        onProgress?.(78);
        onStatus?.('Processing video...');

        // ── STEP 3: Confirm upload + start async compression ──
        const completeResponse = await api.post('/forum/video/upload/complete', {
            sessionId,
        });

        const completeData = completeResponse.data?.success !== undefined
            ? completeResponse.data.data
            : completeResponse.data;

        // ── STEP 4: Poll for compression completion ──
        onProgress?.(80);
        onStatus?.('Compressing video...');

        const MAX_POLLS = 300; // Max 5 minutes
        const POLL_INTERVAL = 1000;

        for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

            try {
                const statusResponse = await api.get(`/forum/video/upload/status/${sessionId}`);
                const statusData = statusResponse.data?.success !== undefined
                    ? statusResponse.data.data
                    : statusResponse.data;

                const statusMap: Record<string, string> = {
                    'awaiting_upload': 'Waiting for upload...',
                    'processing': 'Compressing video...',
                    'completed': 'Upload complete!',
                    'failed': 'Processing failed',
                };

                const totalProgress = 80 + Math.round((statusData.progress || 0) * 0.2);
                onProgress?.(Math.min(totalProgress, 99));
                onStatus?.(statusMap[statusData.status] || statusData.status);

                if (statusData.status === 'completed') {
                    onProgress?.(100);
                    onStatus?.('Complete!');
                    return completeData;
                }

                if (statusData.status === 'failed') {
                    throw new Error(statusData.error || 'Video processing failed');
                }
            } catch (err: any) {
                if (err.response?.status === 404) {
                    throw new Error('Upload session expired');
                }
                if (!err.response) continue;
                throw err;
            }
        }

        throw new Error('Video processing timed out');
    },

    /**
     * LEGACY MULTIPART UPLOAD (for files ≤ 20MB)
     */
    uploadVideoLegacy: async (
        file: File,
        options?: {
            threadId?: string;
            postId?: string;
            caption?: string;
            onProgress?: (progress: number) => void;
            onStatus?: (status: string) => void;
        },
    ): Promise<ForumVideoUploadResult> => {
        options?.onStatus?.('Uploading...');

        const formData = new FormData();
        formData.append('file', file);
        if (options?.threadId) formData.append('threadId', options.threadId);
        if (options?.postId) formData.append('postId', options.postId);
        if (options?.caption) formData.append('caption', options.caption);

        const response = await api.post('/forum/video/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000,
            onUploadProgress: (progressEvent) => {
                if (options?.onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    options.onProgress(progress);
                }
            },
        });

        options?.onStatus?.('Complete!');
        return response.data?.data || response.data;
    },

    // ==========================================
    // USER'S THREADS & POSTS
    // ==========================================

    getMyThreads: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<ForumThread>> => {
        return apiGet('/forum/my/threads', { params });
    },

    getMyPosts: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<ForumPost>> => {
        return apiGet('/forum/my/posts', { params });
    },

    // ==========================================
    // SEARCH
    // ==========================================

    search: async (query: string, params?: {
        page?: number;
        limit?: number;
        type?: 'threads' | 'posts' | 'all';
    }): Promise<PaginatedResponse<ForumThread | ForumPost>> => {
        return apiGet('/forum/search', { params: { query, ...params } });
    },

    // ==========================================
    // TRENDING & FEATURED
    // ==========================================

    getTrending: async (limit?: number): Promise<ForumThread[]> => {
        return apiGet('/forum/trending', { params: { limit: limit || 10 } });
    },

    getFeatured: async (): Promise<ForumThread[]> => {
        return apiGet('/forum/featured');
    },
};

export default forumService;

