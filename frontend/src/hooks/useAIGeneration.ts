/**
 * useAIGeneration — React Query hooks for AI Artwork endpoints
 *
 * SECURITY:
 * - All requests go through authenticated apiGet/apiPost (JWT attached)
 * - Prompts are sanitized before sending
 * - staleTime prevents excessive re-fetching (anti-throttling)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface AIFeedAuthor {
  name: string;
  isPremium?: boolean;
  avatarUrl: string;
}

export interface AIFeedItem {
  id: string;
  title: string;
  prompt: string;
  author: AIFeedAuthor;
  imageUrl: string;
  likes: number;
}

export interface AIStyle {
  id: string;
  name: string;
  imageUrl: string;
}

export interface AICommunityItem {
  id: string;
  author: AIFeedAuthor;
  imageUrl: string;
}

export interface AIFeedResponse {
  forYou: AIFeedItem[];
  featuredStyles: AIStyle[];
  communityFeed: AICommunityItem[];
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
 * Fetch the AI dashboard feed (For You, Featured Styles, Community Feed)
 */
export function useAIFeed() {
  return useQuery<AIFeedResponse>({
    queryKey: ['ai', 'feed'],
    queryFn: () => apiGet<AIFeedResponse>('/ai/feed'),
    staleTime: 5 * 60 * 1000, // 5 min — prevent excessive refetching
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
      apiPost<{ success: boolean; data: AIArtwork }>('/ai/generate', {
        prompt: sanitizePrompt(params.prompt),
        style: params.style,
      }),
    onSuccess: () => {
      // Invalidate history so it refetches
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
    },
  });
}

/**
 * Fetch user's AI generation history
 */
export function useAIHistory() {
  return useQuery<{ success: boolean; data: AIArtwork[] }>({
    queryKey: ['ai', 'history'],
    queryFn: () => apiGet<{ success: boolean; data: AIArtwork[] }>('/ai/history'),
    staleTime: 2 * 60 * 1000, // 2 min
    retry: 2,
  });
}
