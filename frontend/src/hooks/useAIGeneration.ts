/**
 * useAIGeneration — React Query hooks for AI Artwork endpoints
 *
 * SECURITY:
 * - All requests go through authenticated apiGet/apiPost (JWT attached)
 * - Prompts are sanitized before sending
 * - staleTime prevents excessive re-fetching (anti-throttling)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface AIFeedAuthor {
  id?: string;
  name: string;
  isPremium?: boolean;
  avatarUrl: string;
}

export interface AIFeedItem {
  id: string;
  prompt: string;
  author: AIFeedAuthor;
  imageUrl: string;
  likes: number;
  isLiked?: boolean;
  style?: string;
  user_id?: string;
  userId?: string;
}

export interface AIStyle {
  id: string;
  name: string;
  imageUrl: string;
}

export interface AIFeedResponse {
  forYou: AIFeedItem[];
  featuredStyles: AIStyle[];
  communityFeed: AIFeedItem[];
}

export interface AIArtwork {
  id: string;
  user_id: string;
  prompt: string;
  image_url: string;
  style: string;
  status: 'pending' | 'completed' | 'failed';
  visibility: 'private' | 'public';
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIArtworkComment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
}

// ============================================
// SANITIZATION
// ============================================

function sanitizePrompt(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
    .trim()
    .slice(0, 500);
}

// ============================================
// HOOKS
// ============================================

/**
 * Wrapped API response from TransformInterceptor
 */
interface ApiWrapped<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Fetch the AI dashboard feed (For You, Featured Styles, Community Feed)
 */
export function useAIFeed() {
  return useQuery<ApiWrapped<AIFeedResponse>, Error, AIFeedResponse>({
    queryKey: ['ai', 'feed'],
    queryFn: () => apiGet<ApiWrapped<AIFeedResponse>>('/ai/feed'),
    select: (res) => res?.data ?? { forYou: [], featuredStyles: [], communityFeed: [] },
    staleTime: 30 * 1000, // 30s stale time to keep it fresh
    retry: 2,
  });
}

/**
 * Generate a new AI artwork (mutation)
 */
export function useGenerateAIArtwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { prompt: string; style: string }) =>
      apiPost<ApiWrapped<AIArtwork>>('/ai/generate', {
        prompt: sanitizePrompt(params.prompt),
        style: params.style,
      }),
    onSuccess: () => {
      // Invalidate history so it refetches
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'feed'] });
    },
  });
}

/**
 * Upload a custom user artwork with content moderation (mutation)
 */
export function useUploadAIArtwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { file: File; prompt: string; style: string }) => {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('prompt', params.prompt);
      formData.append('style', params.style);

      return apiPost<ApiWrapped<AIArtwork>>('/ai/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'feed'] });
    },
  });
}

/**
 * Fetch user's AI generation history
 */
export function useAIHistory() {
  return useQuery<ApiWrapped<AIArtwork[]>, Error, AIArtwork[]>({
    queryKey: ['ai', 'history'],
    queryFn: () => apiGet<ApiWrapped<AIArtwork[]>>('/ai/history'),
    select: (res) => res?.data ?? [],
    staleTime: 2 * 60 * 1000, // 2 min
    retry: 2,
  });
}

/**
 * Delete an AI artwork
 */
export function useDeleteAIArtwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/ai/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'feed'] });
    },
  });
}

/**
 * Update visibility of an AI artwork
 */
export function useUpdateAIVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; visibility: 'public' | 'private' }) =>
      apiPatch<{ success: boolean; data: AIArtwork }>(`/ai/${params.id}/visibility`, {
        visibility: params.visibility,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'feed'] });
    },
  });
}

/**
 * Toggle like on an AI artwork
 */
export function useToggleAILike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPost<ApiWrapped<{ likesCount: number; isLiked: boolean }>>(`/ai/${id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
    },
  });
}

/**
 * Fetch comments for an AI artwork
 */
export function useAIComments(artworkId: string, enabled = true) {
  return useQuery<ApiWrapped<AIArtworkComment[]>, Error, AIArtworkComment[]>({
    queryKey: ['ai', 'comments', artworkId],
    queryFn: () => apiGet<ApiWrapped<AIArtworkComment[]>>(`/ai/${artworkId}/comments`),
    select: (res) => res?.data ?? [],
    enabled: !!artworkId && enabled,
    staleTime: 15 * 1000, // 15s
  });
}

/**
 * Add a comment to an AI artwork
 */
export function useAddAIComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { artworkId: string; content: string }) =>
      apiPost<ApiWrapped<AIArtworkComment>>(`/ai/${params.artworkId}/comments`, {
        content: params.content,
      }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'comments', params.artworkId] });
    },
  });
}
