/**
 * Forum Hooks - Enterprise Grade
 * React Query hooks for community forum operations
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { forumService, ForumThread, ForumPost, CreateThreadData, CreatePostData } from '../services/forumService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { getAccessToken } from '../lib/api';

// ============================================
// QUERY KEYS
// ============================================

export const forumKeys = {
    all: ['forum'] as const,
    categories: () => [...forumKeys.all, 'categories'] as const,
    threads: (params?: Record<string, unknown>) => [...forumKeys.all, 'threads', params] as const,
    thread: (id: string) => [...forumKeys.all, 'thread', id] as const,
    posts: (threadId: string, params?: Record<string, unknown>) => [...forumKeys.all, 'posts', threadId, params] as const,
    myThreads: (params?: Record<string, unknown>) => [...forumKeys.all, 'my-threads', params] as const,
    myPosts: (params?: Record<string, unknown>) => [...forumKeys.all, 'my-posts', params] as const,
    trending: () => [...forumKeys.all, 'trending'] as const,
    featured: () => [...forumKeys.all, 'featured'] as const,
    search: (query: string, params?: Record<string, unknown>) => [...forumKeys.all, 'search', query, params] as const,
};

// ============================================
// AUTH CHECK HELPER
// ============================================

function isAuthTokenReady(): boolean {
    return !!getAccessToken();
}

// ============================================
// CATEGORY HOOKS
// ============================================

export function useForumCategories() {
    return useQuery({
        queryKey: forumKeys.categories(),
        queryFn: () => forumService.getCategories(),
        staleTime: 1000 * 60 * 10, // 10 minutes - categories rarely change
    });
}

// ============================================
// THREAD HOOKS
// ============================================

export function useForumThreads(params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'latest' | 'popular' | 'views';
    tag?: string;
}) {
    return useQuery({
        queryKey: forumKeys.threads(params),
        queryFn: () => forumService.getThreads(params),
        staleTime: 1000 * 30, // 30 seconds
    });
}

export function useInfiniteForumThreads(params?: {
    categoryId?: string;
    limit?: number;
    sortBy?: 'latest' | 'popular' | 'views';
    tag?: string;
}) {
    return useInfiniteQuery({
        queryKey: forumKeys.threads({ ...params, infinite: true }),
        queryFn: ({ pageParam = 1 }) => forumService.getThreads({ ...params, page: pageParam }),
        getNextPageParam: (lastPage) => {
            if (lastPage.meta.page < lastPage.meta.totalPages) {
                return lastPage.meta.page + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
    });
}

export function useForumThread(id: string) {
    return useQuery({
        queryKey: forumKeys.thread(id),
        queryFn: () => forumService.getThread(id),
        enabled: !!id,
    });
}

export function useTrendingThreads(limit?: number) {
    return useQuery({
        queryKey: forumKeys.trending(),
        queryFn: async () => {
            try {
                return await forumService.getTrending(limit);
            } catch {
                // Graceful degradation — trending is non-critical UI
                return [];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false, // Don't retry — trending is non-critical
        refetchOnWindowFocus: false,
    });
}

export function useFeaturedThreads() {
    return useQuery({
        queryKey: forumKeys.featured(),
        queryFn: async () => {
            try {
                return await forumService.getFeatured();
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// POST HOOKS
// ============================================

export function useForumPosts(threadId: string, params?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: forumKeys.posts(threadId, params),
        queryFn: () => forumService.getPosts(threadId, params),
        enabled: !!threadId,
    });
}

// ============================================
// USER'S CONTENT HOOKS
// ============================================

export function useMyThreads(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: forumKeys.myThreads(params),
        queryFn: () => forumService.getMyThreads(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

export function useMyPosts(params?: { page?: number; limit?: number }) {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: forumKeys.myPosts(params),
        queryFn: () => forumService.getMyPosts(params),
        enabled: isAuthenticated && isAuthTokenReady(),
    });
}

// ============================================
// SEARCH HOOKS
// ============================================

export function useForumSearch(query: string, params?: {
    page?: number;
    limit?: number;
    type?: 'threads' | 'posts' | 'all';
}) {
    return useQuery({
        queryKey: forumKeys.search(query, params),
        queryFn: () => forumService.search(query, params),
        enabled: query.length >= 2,
    });
}

// ============================================
// MUTATION HOOKS - THREADS
// ============================================

export function useCreateThread() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreateThreadData) => forumService.createThread(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: forumKeys.threads() });
            queryClient.invalidateQueries({ queryKey: forumKeys.myThreads() });
            toast.success('Thread Created', 'Your discussion has been posted.');
        },
        onError: (error: Error) => {
            toast.error('Failed', error.message || 'Could not create thread.');
        },
    });
}

export function useUpdateThread() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateThreadData> }) =>
            forumService.updateThread(id, data),
        onSuccess: (thread: ForumThread) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.thread(thread.id) });
            queryClient.invalidateQueries({ queryKey: forumKeys.threads() });
            toast.success('Thread Updated', 'Your changes have been saved.');
        },
    });
}

export function useDeleteThread() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => forumService.deleteThread(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: forumKeys.threads() });
            queryClient.invalidateQueries({ queryKey: forumKeys.myThreads() });
            toast.success('Thread Deleted', 'Your thread has been removed.');
        },
    });
}

export function useLikeThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => forumService.likeThread(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.thread(id) });
        },
    });
}

export function useUnlikeThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => forumService.unlikeThread(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.thread(id) });
        },
    });
}

// ============================================
// MUTATION HOOKS - POSTS
// ============================================

export function useCreatePost() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreatePostData) => forumService.createPost(data),
        onSuccess: (post: ForumPost) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(post.threadId) });
            queryClient.invalidateQueries({ queryKey: forumKeys.thread(post.threadId) });
            toast.success('Reply Posted', 'Your reply has been added.');
        },
        onError: (error: Error) => {
            toast.error('Failed', error.message || 'Could not post reply.');
        },
    });
}

export function useUpdatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            forumService.updatePost(id, content),
        onSuccess: (post: ForumPost) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(post.threadId) });
        },
    });
}

export function useDeletePost() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id }: { id: string; threadId: string }) =>
            forumService.deletePost(id),
        onSuccess: (_, { threadId }) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(threadId) });
            toast.success('Reply Deleted', 'Your reply has been removed.');
        },
    });
}

export function useLikePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id }: { id: string; threadId: string }) =>
            forumService.likePost(id),
        onSuccess: (_, { threadId }) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(threadId) });
        },
    });
}

export function useUnlikePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id }: { id: string; threadId: string }) =>
            forumService.unlikePost(id),
        onSuccess: (_, { threadId }) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(threadId) });
        },
    });
}

export function useMarkAsSolution() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id }: { id: string; threadId: string }) =>
            forumService.markAsSolution(id),
        onSuccess: (_, { threadId }) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.posts(threadId) });
            queryClient.invalidateQueries({ queryKey: forumKeys.thread(threadId) });
            toast.success('Solution Marked', 'This reply has been marked as the solution.');
        },
    });
}

// ============================================
// VIDEO UPLOAD HOOK
// ============================================

export function useUploadForumVideo() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ file, threadId, postId, caption, onProgress }: {
            file: File;
            threadId?: string;
            postId?: string;
            caption?: string;
            onProgress?: (progress: number) => void;
        }) => forumService.uploadVideo(file, { threadId, postId, caption, onProgress }),
        onSuccess: (result, { threadId }) => {
            queryClient.invalidateQueries({ queryKey: forumKeys.threads() });
            if (threadId) {
                queryClient.invalidateQueries({ queryKey: forumKeys.thread(threadId) });
            }
            toast.success('Video Uploaded', 'Your video has been compressed and uploaded.');
        },
        onError: (error: Error) => {
            toast.error('Upload Failed', error.message || 'Could not upload video.');
        },
    });
}
