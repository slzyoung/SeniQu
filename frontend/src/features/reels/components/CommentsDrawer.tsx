/**
 * CommentsDrawer — Premium Instagram-style Reels Comment Sheet
 *
 * Features:
 * - Swipe-to-dismiss bottom sheet with drag handle
 * - Threaded replies (tap "Reply" → nested reply input)
 * - Expandable reply threads ("View N replies" / "Hide replies")
 * - Like button on each comment (heart icon)
 * - Delete own comments
 * - Smooth scroll, mobile-first, theme-aware
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Loader2, SendHorizontal, Heart, ChevronDown, ChevronUp,
    MessageCircle, Trash2, CornerDownRight
} from 'lucide-react';
import { useReelComments, useCreateReelComment } from '../../../hooks/useReels';
import { reelsService } from '../../../services/reelsService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useToast } from '../../../stores/useNotificationStore';
import Avatar from '../../../components/ui/Avatar';
import { useQueryClient } from '@tanstack/react-query';

/* ── helpers ── */
function timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return `${Math.floor(s / 604800)}w`;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

/* ── types ── */
interface ReplyTarget {
    commentId: string;
    username: string;
}

interface Props {
    reelId: string;
    onClose: () => void;
}

/* ═══════════════════════════════════════════
   SingleComment — Individual comment with reply thread
   ═══════════════════════════════════════════ */
function SingleComment({
    comment,
    reelId,
    currentUserId,
    onReply,
    onDelete,
}: {
    comment: any;
    reelId: string;
    currentUserId?: string;
    onReply: (target: ReplyTarget) => void;
    onDelete: (commentId: string) => void;
}) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);
    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState<any[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const replyCount = comment.reply_count || 0;

    const displayName = comment.user?.display_name || comment.user?.displayName || 'Anonymous';
    const avatarUrl = comment.user?.avatar_url || comment.user?.avatarUrl;
    const isOwn = currentUserId && (comment.user_id === currentUserId || comment.user?.id === currentUserId);

    const handleLike = async () => {
        setLiked(!liked);
        setLikeCount((c: number) => liked ? Math.max(c - 1, 0) : c + 1);
        try {
            await reelsService.toggleCommentLike(comment.id);
        } catch {
            setLiked(liked);
            setLikeCount(comment.like_count || 0);
        }
    };

    const loadReplies = async () => {
        if (loadingReplies) return;
        setLoadingReplies(true);
        try {
            const res = await reelsService.getReplies(comment.id);
            setReplies(res.data || []);
            setShowReplies(true);
        } catch (err) {
            console.error('Failed to load replies:', err);
        } finally {
            setLoadingReplies(false);
        }
    };

    const toggleReplies = () => {
        if (showReplies) {
            setShowReplies(false);
        } else {
            loadReplies();
        }
    };

    return (
        <div className="rc-comment-thread">
            {/* Main comment */}
            <div className="rc-comment">
                <Avatar
                    name={displayName}
                    src={avatarUrl}
                    size="sm"
                    className="rc-comment-avatar"
                />
                <div className="rc-comment-body">
                    <div className="rc-comment-header">
                        <span className="rc-comment-name">{displayName}</span>
                        <span className="rc-comment-time">{timeAgo(comment.created_at || comment.createdAt)}</span>
                    </div>
                    <p className="rc-comment-text">{comment.content}</p>
                    <div className="rc-comment-actions">
                        <button className="rc-action-btn" onClick={handleLike}>
                            <Heart
                                className={`rc-action-icon ${liked ? 'rc-liked' : ''}`}
                                fill={liked ? '#ef4444' : 'none'}
                                stroke={liked ? '#ef4444' : 'currentColor'}
                            />
                            {likeCount > 0 && <span className={`rc-action-label ${liked ? 'rc-liked' : ''}`}>{formatCount(likeCount)}</span>}
                        </button>
                        <button
                            className="rc-action-btn"
                            onClick={() => onReply({ commentId: comment.id, username: displayName })}
                        >
                            <MessageCircle className="rc-action-icon" />
                            <span className="rc-action-label">Reply</span>
                        </button>
                        {isOwn && (
                            <button className="rc-action-btn rc-action-delete" onClick={() => onDelete(comment.id)}>
                                <Trash2 className="rc-action-icon" />
                            </button>
                        )}
                    </div>

                    {/* View replies toggle */}
                    {replyCount > 0 && (
                        <button className="rc-view-replies-btn" onClick={toggleReplies}>
                            <span className="rc-replies-line" />
                            {loadingReplies ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : showReplies ? (
                                <>
                                    <span>Hide replies</span>
                                    <ChevronUp className="w-3 h-3" />
                                </>
                            ) : (
                                <>
                                    <span>View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                                    <ChevronDown className="w-3 h-3" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Reply thread — nested */}
            {showReplies && replies.length > 0 && (
                <div className="rc-replies">
                    {replies.map((reply: any) => {
                        const rDisplayName = reply.user?.display_name || reply.user?.displayName || 'Anonymous';
                        const rAvatarUrl = reply.user?.avatar_url || reply.user?.avatarUrl;
                        const rIsOwn = currentUserId && (reply.user_id === currentUserId || reply.user?.id === currentUserId);

                        return (
                            <div key={reply.id} className="rc-comment rc-reply">
                                <Avatar
                                    name={rDisplayName}
                                    src={rAvatarUrl}
                                    size="xs"
                                    className="rc-reply-avatar"
                                />
                                <div className="rc-comment-body">
                                    <div className="rc-comment-header">
                                        <span className="rc-comment-name">{rDisplayName}</span>
                                        <span className="rc-comment-time">{timeAgo(reply.created_at || reply.createdAt)}</span>
                                    </div>
                                    <p className="rc-comment-text">{reply.content}</p>
                                    <div className="rc-comment-actions">
                                        <button
                                            className="rc-action-btn"
                                            onClick={() => onReply({ commentId: comment.id, username: rDisplayName })}
                                        >
                                            <MessageCircle className="rc-action-icon" />
                                            <span className="rc-action-label">Reply</span>
                                        </button>
                                        {rIsOwn && (
                                            <button className="rc-action-btn rc-action-delete" onClick={() => onDelete(reply.id)}>
                                                <Trash2 className="rc-action-icon" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════
   CommentsDrawer — Main bottom sheet
   ═══════════════════════════════════════════ */
export default function CommentsDrawer({ reelId, onClose }: Props) {
    const [text, setText] = useState('');
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const { data, isLoading } = useReelComments(reelId);
    const post = useCreateReelComment();
    const { user } = useAuthStore();
    const toast = useToast();
    const queryClient = useQueryClient();
    const comments = data?.data || [];
    const totalComments = data?.meta?.total || comments.length;

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef(0);

    /* ── Close animation ── */
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(onClose, 280);
    }, [onClose]);

    /* ── Swipe-to-dismiss ── */
    const handleDragStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        // Only allow drag from the handle area or header
        if (!target.closest('.rc-drag-zone')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleDragMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) {
            setDragY(delta);
        }
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (dragY > 120) {
            handleClose();
        } else {
            setDragY(0);
        }
    };

    /* ── Reply ── */
    const handleReply = (target: ReplyTarget) => {
        setReplyTarget(target);
        setText(`@${target.username} `);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const cancelReply = () => {
        setReplyTarget(null);
        setText('');
    };

    /* ── Submit ── */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { toast.error('Login Required', 'Sign in to comment'); return; }
        const content = text.trim();
        if (!content) return;

        post.mutate(
            { reelId, content, parentId: replyTarget?.commentId },
            {
                onSuccess: () => {
                    setText('');
                    setReplyTarget(null);
                    // Scroll to top for new top-level, or keep position for replies
                    if (!replyTarget && scrollRef.current) {
                        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                },
            }
        );
    };

    /* ── Delete ── */
    const handleDelete = async (commentId: string) => {
        try {
            await reelsService.deleteComment(commentId);
            queryClient.invalidateQueries({ queryKey: ['reels', 'comments', reelId] });
            toast.success('Deleted', 'Comment removed');
        } catch {
            toast.error('Error', 'Could not delete comment');
        }
    };

    /* ── ESC key ── */
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleClose]);

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`rc-backdrop ${isClosing ? 'rc-closing' : ''}`}
                onClick={handleClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`rc-sheet ${isClosing ? 'rc-closing' : ''}`}
                style={{
                    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                    transition: isDragging ? 'none' : undefined,
                }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
            >
                {/* Drag handle + header */}
                <div className="rc-drag-zone">
                    <div className="rc-handle" />
                    <div className="rc-header">
                        <h3 className="rc-title">
                            Comments
                            <span className="rc-count">{formatCount(totalComments)}</span>
                        </h3>
                        <button onClick={handleClose} className="rc-close-btn">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable comment list */}
                <div ref={scrollRef} className="rc-scroll">
                    {isLoading ? (
                        <div className="rc-empty">
                            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#C9A84C' }} />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="rc-empty">
                            <MessageCircle className="w-12 h-12" style={{ color: 'var(--text-muted, #666)', opacity: 0.3 }} />
                            <p className="rc-empty-title">No comments yet</p>
                            <p className="rc-empty-sub">Start the conversation</p>
                        </div>
                    ) : (
                        comments.map((c: any) => (
                            <SingleComment
                                key={c.id}
                                comment={c}
                                reelId={reelId}
                                currentUserId={user?.id}
                                onReply={handleReply}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>

                {/* Reply indicator */}
                {replyTarget && (
                    <div className="rc-reply-bar">
                        <CornerDownRight className="w-3.5 h-3.5" style={{ color: '#C9A84C', flexShrink: 0 }} />
                        <span className="rc-reply-bar-text">
                            Replying to <strong>{replyTarget.username}</strong>
                        </span>
                        <button className="rc-reply-bar-cancel" onClick={cancelReply}>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Input form */}
                <form onSubmit={handleSubmit} className="rc-input-form">
                    {user && (
                        <Avatar
                            name={user.displayName || 'U'}
                            src={user.avatar}
                            size="xs"
                            className="rc-input-avatar"
                        />
                    )}
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={replyTarget ? `Reply to ${replyTarget.username}...` : 'Add a comment...'}
                        className="rc-input"
                        maxLength={1000}
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || post.isPending}
                        className="rc-send-btn"
                    >
                        {post.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <SendHorizontal className="w-4 h-4" />
                        }
                    </button>
                </form>
            </div>
        </>,
        document.body
    );
}
