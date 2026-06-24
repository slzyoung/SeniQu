/**
 * Reels Hooks
 * React Query hooks for Reels short-form video operations.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { reelsService, Reel } from '../services/reelsService';
import { useToast } from '../stores/useNotificationStore';

export const reelsKeys = {
    all: ['reels'] as const,
    feed: (creatorId?: string) => creatorId ? [...reelsKeys.all, 'feed', { creatorId }] as const : [...reelsKeys.all, 'feed'] as const,
    saved: () => [...reelsKeys.all, 'saved'] as const,
    reel: (id: string) => [...reelsKeys.all, 'reel', id] as const,
    comments: (reelId: string) => [...reelsKeys.all, 'comments', reelId] as const,
};

/**
 * Hook to retrieve the Reels feed using infinite scroll
 */
export function useReelsFeed(limit = 10, creatorId?: string) {
    return useInfiniteQuery({
        queryKey: reelsKeys.feed(creatorId),
        queryFn: ({ pageParam = 1 }) => reelsService.getFeed(pageParam, limit, creatorId),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage.meta;
            return page < totalPages ? page + 1 : undefined;
        },
    });
}

/**
 * Hook to retrieve the user's saved/bookmarked reels
 */
export function useSavedReels(page = 1, limit = 20) {
    return useQuery({
        queryKey: [...reelsKeys.saved(), page, limit],
        queryFn: () => reelsService.getSavedReels(page, limit),
    });
}

/**
 * Hook to upload a new Reel
 */
export function useUploadReel() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ file, caption, hashtags, audioMetadata, onProgress }: {
            file: File;
            caption?: string;
            hashtags?: string[];
            audioMetadata?: any;
            onProgress?: (progress: number) => void;
        }) => reelsService.uploadReel(file, { caption, hashtags, audioMetadata, onProgress }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reelsKeys.feed() });
            toast.success('Reel Shared', 'Your Reel has been uploaded and processed successfully.');
        },
        onError: (err: any) => {
            toast.error('Upload Failed', err.response?.data?.message || 'Could not upload your video.');
        },
    });
}

/**
 * Hook to toggle Reel Like with optimistic updates
 */
export function useToggleReelLike() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reelId: string) => reelsService.toggleLike(reelId),
        onMutate: async (reelId) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: reelsKeys.feed() });

            // Snapshot the previous state
            const previousFeed = queryClient.getQueryData(reelsKeys.feed());

            // Optimistically update the feed if it exists
            if (previousFeed) {
                queryClient.setQueryData(reelsKeys.feed(), (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            data: page.data.map((reel: Reel) => {
                                if (reel.id === reelId) {
                                    const currentLiked = reel.isLiked || reel.is_liked || false;
                                    const nextLiked = !currentLiked;
                                    const currentLikes = reel.likeCount ?? reel.like_count ?? 0;
                                    const nextLikes = nextLiked ? currentLikes + 1 : Math.max(currentLikes - 1, 0);
                                    return {
                                        ...reel,
                                        isLiked: nextLiked,
                                        is_liked: nextLiked,
                                        likeCount: nextLikes,
                                        like_count: nextLikes,
                                    };
                                }
                                return reel;
                            }),
                        })),
                    };
                });
            }

            return { previousFeed };
        },
        onError: (_err, _reelId, context) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(reelsKeys.feed(), context.previousFeed);
            }
        },
        onSettled: (_data, _err, reelId) => {
            queryClient.invalidateQueries({ queryKey: reelsKeys.reel(reelId) });
        },
    });
}

/**
 * Hook to toggle Reel Reshare
 */
export function useToggleReelReshare() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ reelId, caption }: { reelId: string; caption?: string }) =>
            reelsService.toggleReshare(reelId, caption),
        onMutate: async ({ reelId }) => {
            await queryClient.cancelQueries({ queryKey: reelsKeys.feed() });
            const previousFeed = queryClient.getQueryData(reelsKeys.feed());

            if (previousFeed) {
                queryClient.setQueryData(reelsKeys.feed(), (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            data: page.data.map((reel: Reel) => {
                                if (reel.id === reelId) {
                                    const currentReshared = reel.isReshared || reel.is_reshared || false;
                                    const nextReshared = !currentReshared;
                                    const currentReshares = reel.reshareCount ?? reel.reshare_count ?? 0;
                                    const nextReshares = nextReshared ? currentReshares + 1 : Math.max(currentReshares - 1, 0);
                                    return {
                                        ...reel,
                                        isReshared: nextReshared,
                                        is_reshared: nextReshared,
                                        reshareCount: nextReshares,
                                        reshare_count: nextReshares,
                                    };
                                }
                                return reel;
                            }),
                        })),
                    };
                });
            }

            return { previousFeed };
        },
        onError: (_err, _params, context) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(reelsKeys.feed(), context.previousFeed);
            }
            toast.error('Bookmark Failed', 'Unable to complete action.');
        },
        onSuccess: (res) => {
            toast.success(
                res.reshared ? 'Added to Bookmarks' : 'Removed from Bookmarks',
                res.reshared ? 'Successfully saved to your bookmarks.' : 'Successfully removed from bookmarks.'
            );
        },
        onSettled: (_data, _err, { reelId }) => {
            queryClient.invalidateQueries({ queryKey: reelsKeys.reel(reelId) });
        },
    });
}

/**
 * Hook to query comments for a Reel
 */
export function useReelComments(reelId: string, enabled = true) {
    return useQuery({
        queryKey: reelsKeys.comments(reelId),
        queryFn: () => reelsService.getComments(reelId),
        enabled,
    });
}

/**
 * Hook to post a comment on a Reel
 */
export function useCreateReelComment() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ reelId, content, parentId }: { reelId: string; content: string; parentId?: string }) =>
            reelsService.createComment(reelId, content, parentId),
        onSuccess: (_newComment, { reelId }) => {
            queryClient.invalidateQueries({ queryKey: reelsKeys.comments(reelId) });
            queryClient.invalidateQueries({ queryKey: reelsKeys.reel(reelId) });
            
            // Also update the feed comment count optimistically
            queryClient.setQueryData(reelsKeys.feed(), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((reel: Reel) => {
                            if (reel.id === reelId) {
                                const currentComments = reel.commentCount ?? reel.comment_count ?? 0;
                                return {
                                    ...reel,
                                    commentCount: currentComments + 1,
                                    comment_count: currentComments + 1,
                                };
                            }
                            return reel;
                        }),
                    })),
                };
            });
        },
        onError: () => {
            toast.error('Comment Failed', 'Could not post comment.');
        },
    });
}

/**
 * Hook to record watch/view metrics
 */
export function useRecordReelView() {
    return useMutation({
        mutationFn: ({ reelId, watchDuration, completed }: { reelId: string; watchDuration?: number; completed?: boolean }) =>
            reelsService.recordView(reelId, watchDuration, completed),
    });
}

/**
 * Hook to delete a Reel
 */
export function useDeleteReel() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (reelId: string) => reelsService.deleteReel(reelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reelsKeys.feed() });
            toast.success('Reel Deleted', 'Your Reel has been deleted.');
        },
        onError: () => {
            toast.error('Delete Failed', 'Could not delete your Reel.');
        },
    });
}
