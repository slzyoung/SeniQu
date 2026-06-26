import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, SendHorizontal } from 'lucide-react';
import { useReelComments, useCreateReelComment } from '../../../hooks/useReels';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useToast } from '../../../stores/useNotificationStore';
import Avatar from '../../../components/ui/Avatar';

function timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
}

interface Props { reelId: string; onClose: () => void; }

export default function CommentsDrawer({ reelId, onClose }: Props) {
    const [text, setText] = useState('');
    const { data, isLoading } = useReelComments(reelId);
    const post = useCreateReelComment();
    const { user } = useAuthStore();
    const toast = useToast();
    const comments = data?.data || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { toast.error('Login Required', 'Sign in to comment'); return; }
        if (!text.trim()) return;
        post.mutate({ reelId, content: text }, { onSuccess: () => setText('') });
    };

    return createPortal(
        <>
            <div className="reel-drawer-backdrop" onClick={onClose} />
            <div className="reel-drawer">
                <div className="reel-drawer-handle" />
                <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border/30">
                    <h3 className="text-theme-text font-bold text-sm">Comments <span className="text-theme-muted font-normal">({comments.length})</span></h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-theme-border/20 text-theme-muted"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-theme-muted text-sm py-12">No comments yet. Be the first!</p>
                    ) : (
                        comments.map((c: any) => (
                            <div key={c.id} className="flex gap-2.5">
                                <Avatar name={c.user?.display_name || c.user?.displayName || 'U'} src={c.user?.avatar_url || c.user?.avatarUrl} size="sm" className="!w-8 !h-8 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-theme-text text-xs font-bold truncate">{c.user?.display_name || c.user?.displayName || 'Anonymous'}</span>
                                        <span className="text-theme-muted text-[10px] shrink-0">{timeAgo(c.created_at || c.createdAt)}</span>
                                    </div>
                                    <p className="text-theme-text/90 text-[13px] leading-[1.4] mt-0.5">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <form onSubmit={handleSubmit} className="reel-comment-form">
                    {user && <Avatar name={user.displayName || 'U'} src={user.avatar} size="xs" className="!w-7 !h-7 shrink-0" />}
                    <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." className="reel-comment-input" maxLength={1000} />
                    <button type="submit" disabled={!text.trim() || post.isPending} className="reel-comment-send">
                        {post.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </>,
        document.body
    );
}
