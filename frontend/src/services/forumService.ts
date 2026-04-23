/**
 * Forum Service - Enterprise Grade
 * API service for community forum operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

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
    title: string;
    slug: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
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
