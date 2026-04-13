/**
 * Community Feature - Forum and Discussions
 * Uses real API data with community hooks
 */

import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge, Avatar } from '../../components/ui';
import {
    MessageSquare,
    Search,
    Plus,
    Heart,
    Eye,
    Clock,
    Loader2,
    Image as ImageIcon,
    Video,
    X,
    Trash2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { formatDate, extractArray } from '../../lib/utils';
import { uploadFile } from '../../lib/api';
import {
    useForumCategories,
    useForumThreads,
    useForumThread,
    useForumPosts,
    useCreateThread,
    useCreatePost,
    useLikeThread,
    useUnlikeThread,
    useLikePost,
    useUnlikePost,
    useDeleteThread,
    useDeletePost
} from '../../hooks/useForum';
import { useToast } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/useAuthStore';

export function CommunityForum() {
    const [activeCategorySlug, setActiveCategorySlug] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: categoriesData } = useForumCategories();
    const categories = extractArray<any>(categoriesData);

    // Find the current category ID from slug
    const currentCategory = activeCategorySlug !== 'all'
        ? categories.find(c => c.slug === activeCategorySlug)
        : null;

    const { data: threadsData, isLoading } = useForumThreads({
        categoryId: currentCategory?.id,
        // Wait, the API supports categoryId? Yes, backend service filters by categorySlug though! 
        // Oh, wait, the service in forumService getThreads accepts categoryId.
    });

    // Filter locally by search query for simplicity, or we could use the search endpoint
    const threads = (threadsData?.data || []).filter(thread =>
        thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer
            className="max-w-7xl mx-auto"
            title="Community Forum"
            subtitle="Connect with art lovers and collectors"
            actions={
                <Button variant="gold" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateModalOpen(true)}>
                    New Thread
                </Button>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card variant="elevated" className="sticky top-24">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-theme-text mb-4">Categories</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setActiveCategorySlug('all')}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategorySlug === 'all'
                                        ? 'bg-gold/10 text-gold'
                                        : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
                                        }`}
                                >
                                    <span>All Topics</span>
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategorySlug(cat.slug)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategorySlug === cat.slug
                                            ? 'bg-gold/10 text-gold'
                                            : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
                                            }`}
                                    >
                                        <span>{cat.name}</span>
                                        {cat.threadCount > 0 && (
                                            <span className="text-xs bg-theme-surface px-2 py-0.5 rounded-full">
                                                {cat.threadCount}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search discussions..."
                                className="w-full pl-10 pr-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                            />
                        </div>
                    </div>

                    {/* Threads List */}
                    {isLoading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 text-gold animate-spin" />
                        </div>
                    ) : threads.length === 0 ? (
                        <Card variant="elevated" className="text-center py-16">
                            <MessageSquare className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-theme-text mb-2">No Discussions Found</h3>
                            <p className="text-theme-muted max-w-sm mx-auto">
                                Start a new thread or try a different search.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {threads.map(thread => (
                                <Card key={thread.id} variant="elevated" hover className="relative overflow-hidden group">
                                    <Link to={`/community/thread/${thread.id}`} className="absolute inset-0 z-10" />
                                    <CardContent className="p-4">
                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            {thread.mediaUrl && (
                                                <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-theme-surface relative">
                                                    {thread.mediaType === 'video' ? (
                                                        <video src={thread.mediaUrl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={thread.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {thread.isPinned && (
                                                        <Badge variant="gold" size="sm">Pinned</Badge>
                                                    )}
                                                    <Badge variant="default" size="sm">{thread.category?.name || 'Discussion'}</Badge>
                                                </div>
                                                <h4 className="font-semibold text-theme-text group-hover:text-gold transition-colors truncate">
                                                    {thread.title}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-theme-muted">
                                                    <span className="flex items-center gap-1.5">
                                                        <Avatar name={thread.author?.displayName || 'Unknown'} src={thread.author?.avatarUrl} size="xs" />
                                                        {thread.author?.displayName || 'Unknown'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDate(thread.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-theme-muted px-2">
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare className="w-4 h-4" />
                                                    {thread.replyCount || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-4 h-4" />
                                                    {thread.views || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-4 h-4" />
                                                    {thread.likes || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-gold/20 to-transparent" />
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Thread Modal */}
            {isCreateModalOpen && (
                <CreateThreadModal
                    onClose={() => setIsCreateModalOpen(false)}
                    categories={categories}
                />
            )}
        </PageContainer>
    );
}

function CreateThreadModal({ onClose, categories }: { onClose: () => void, categories: any[] }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const createThread = useCreateThread();
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !categoryId) {
            toast.error('Required Fields', 'Please fill in title, content, and category.');
            return;
        }

        try {
            setIsUploading(true);
            let mediaUrl = undefined;
            let mediaType = undefined;

            if (file) {
                // Determine type
                mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                const uploadResult = await uploadFile(file, 'general');
                mediaUrl = uploadResult.url;
            }

            await createThread.mutateAsync({
                title,
                content,
                categoryId,
                tags: [],
                mediaUrl,
                mediaType
            });

            onClose();
        } catch (error: any) {
            console.error('Thread creation error:', error);
            // Error handling is managed by the hook
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <Card variant="elevated" className="w-full max-w-2xl bg-theme-surface border-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.1)]">
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif font-bold text-gold-hologram">Create New Thread</h2>
                            <button type="button" onClick={onClose} className="text-theme-muted hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-theme-text mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/50 border border-theme-border rounded-lg text-white focus:outline-none focus:border-gold"
                                    placeholder="Discussion title..."
                                    maxLength={255}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-theme-text mb-1">Category</label>
                                <select
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/50 border border-theme-border rounded-lg text-white focus:outline-none focus:border-gold"
                                    required
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-theme-text mb-1">Content</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/50 border border-theme-border rounded-lg text-white h-32 resize-none focus:outline-none focus:border-gold"
                                    placeholder="What do you want to discuss?"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-theme-text mb-2">Attach Media (Optional)</label>
                                {file ? (
                                    <div className="flex items-center gap-4 bg-black/30 p-3 rounded-lg border border-theme-border">
                                        {file.type.startsWith('video/') ? <Video className="text-gold" /> : <ImageIcon className="text-gold" />}
                                        <span className="text-sm text-theme-text truncate flex-1">{file.name}</span>
                                        <button type="button" onClick={() => setFile(null)} className="text-red-400 hover:text-red-300">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            leftIcon={<ImageIcon className="w-4 h-4" />}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Image / Video
                                        </Button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*,video/*"
                                            className="hidden"
                                            onChange={e => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading || createThread.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="gold" isLoading={isUploading || createThread.isPending}>
                                Post Thread
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}

export function ThreadView() {
    const { id } = useParams<{ id: string }>();
    const { data: threadData, isLoading: threadLoading } = useForumThread(id || '');
    const { data: postsData, isLoading: postsLoading } = useForumPosts(id || '');

    // Handle TransformInterceptor wrapper: { success, data: { data: threadObj } }
    const rawThread = (threadData as any)?.data?.data || (threadData as any)?.data || threadData;
    const thread = rawThread && typeof rawThread === 'object' && !Array.isArray(rawThread) ? rawThread : null;
    const replies = extractArray(postsData);

    const createPost = useCreatePost();
    const likeThread = useLikeThread();
    const unlikeThread = useUnlikeThread();
    const likePost = useLikePost();
    const unlikePost = useUnlikePost();
    const deleteThread = useDeleteThread();
    const deletePost = useDeletePost();
    const toast = useToast();
    const currentUser = useAuthStore((s) => s.user);
    const currentUserId = currentUser?.id;
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // For nested replies (Facebook style)
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [inlineReplyContent, setInlineReplyContent] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

    const toggleReplies = (replyId: string) => {
        setExpandedReplies(prev => ({ ...prev, [replyId]: !prev[replyId] }));
    };

    // Separate replies into top-level and children
    const topLevelReplies = replies.filter((r: any) => !r.parent_id && !r.parentId);
    const childReplies = replies.filter((r: any) => r.parent_id || r.parentId);

    // Track local liked state optionally if you want optimistic UI beyond React Query
    const [localLikedThreads, setLocalLikedThreads] = useState<Record<string, boolean>>({});
    const [localLikedPosts, setLocalLikedPosts] = useState<Record<string, boolean>>({});

    const handleDeleteThread = async () => {
        if (!thread?.id) return;
        try {
            await deleteThread.mutateAsync(thread.id);
            window.history.back();
        } catch (error) {
            toast.error('Error', 'Failed to delete thread');
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await deletePost.mutateAsync({ id: postId, threadId: thread.id });
            setConfirmDeleteId(null);
        } catch (error) {
            toast.error('Error', 'Failed to delete reply');
        }
    };

    const handleToggleThreadLike = async () => {
        if (!thread?.id) return;
        const currentlyLiked = localLikedThreads[thread.id]; // You'd normally inspect thread.isLiked if backend provided it
        setLocalLikedThreads(prev => ({ ...prev, [thread.id]: !currentlyLiked }));

        try {
            if (currentlyLiked) {
                await unlikeThread.mutateAsync(thread.id);
            } else {
                await likeThread.mutateAsync(thread.id);
            }
        } catch (error) {
            // Revert on error
            setLocalLikedThreads(prev => ({ ...prev, [thread.id]: currentlyLiked }));
            toast.error('Error', 'Failed to update like');
        }
    };

    const handleTogglePostLike = async (postId: string) => {
        const currentlyLiked = localLikedPosts[postId];
        setLocalLikedPosts(prev => ({ ...prev, [postId]: !currentlyLiked }));

        try {
            if (currentlyLiked) {
                await unlikePost.mutateAsync({ id: postId, threadId: thread.id });
            } else {
                await likePost.mutateAsync({ id: postId, threadId: thread.id });
            }
        } catch (error) {
            setLocalLikedPosts(prev => ({ ...prev, [postId]: currentlyLiked }));
            toast.error('Error', 'Failed to update like');
        }
    };

    if (threadLoading) {
        return (
            <PageContainer className="max-w-7xl mx-auto flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </PageContainer>
        );
    }

    if (!thread) {
        return (
            <PageContainer className="max-w-7xl mx-auto items-center flex flex-col py-20">
                <MessageSquare className="w-16 h-16 text-theme-muted mb-4" />
                <h2 className="text-2xl font-bold">Thread not found</h2>
                <Link to="/community" className="text-gold mt-4 hover:underline">Back to Community</Link>
            </PageContainer>
        );
    }

    const handleReply = async () => {
        if (!replyContent.trim()) return;
        setIsReplying(true);
        try {
            await createPost.mutateAsync({
                threadId: thread.id,
                content: replyContent
            });
            setReplyContent('');
        } catch (error) {
            console.error('Failed to reply', error);
        } finally {
            setIsReplying(false);
        }
    };

    const handleInlineReply = async (parentId: string) => {
        if (!inlineReplyContent.trim()) return;
        setIsReplying(true);
        try {
            await createPost.mutateAsync({
                threadId: thread.id,
                content: inlineReplyContent,
                parentId: parentId
            });
            setInlineReplyContent('');
            setActiveReplyId(null);
        } catch (error: any) {
            console.error('Inline reply error:', error);
        } finally {
            setIsReplying(false);
        }
    };

    const threadAuthorId = thread.author_id || thread.authorId;

    const isThreadOwner = currentUserId && threadAuthorId && currentUserId === threadAuthorId;

    return (
        <PageContainer className="max-w-3xl mx-auto" title={thread.title} subtitle={thread.category?.name || 'Discussion'}>
            <button
                onClick={() => window.history.back()}
                className="inline-flex items-center text-sm text-theme-muted hover:text-amber-600 dark:hover:text-gold mb-5 transition-colors cursor-pointer group"
            >
                <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
                <span className="ml-1.5">Back to Community</span>
            </button>

            {/* Thread Card — Premium Clean */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-sm mb-6 overflow-hidden">
                <div className="p-4 sm:p-6">
                    {/* Author Header */}
                    <div className="flex items-start gap-3 mb-4">
                        <Avatar name={thread.author?.display_name || thread.author?.displayName || 'User'} src={thread.author?.avatar_url || thread.author?.avatarUrl} size="lg" className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 ring-2 ring-amber-500/20 dark:ring-gold/20" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{thread.author?.display_name || thread.author?.displayName || 'User'}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-gold/15 text-amber-700 dark:text-gold">OP</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(thread.created_at || thread.createdAt)}</span>
                        </div>
                        {isThreadOwner && (
                            <button
                                onClick={handleDeleteThread}
                                disabled={deleteThread.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                title="Delete thread"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 leading-snug">{thread.title}</h1>

                    {/* Content */}
                    <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">{thread.content}</p>

                    {/* Media */}
                    {(thread.media_url || thread.mediaUrl) && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200/50 dark:border-white/10">
                            {(thread.media_type || thread.mediaType) === 'video' ? (
                                <video
                                    src={thread.media_url || thread.mediaUrl}
                                    controls
                                    className="w-full max-h-[400px] object-contain bg-black"
                                />
                            ) : (
                                <img
                                    src={thread.media_url || thread.mediaUrl}
                                    alt="Thread Attachment"
                                    className="w-full max-h-[400px] object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={handleToggleThreadLike}
                        disabled={likeThread.isPending || unlikeThread.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${localLikedThreads[thread.id] ? 'text-amber-600 dark:text-gold bg-amber-50 dark:bg-gold/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                    >
                        <Heart className={`w-4 h-4 ${localLikedThreads[thread.id] ? 'fill-amber-600 dark:fill-gold' : ''}`} />
                        {thread.likes || 0}
                    </button>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400">
                        <Eye className="w-4 h-4" />
                        {thread.views || 0}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        {replies.length}
                    </span>
                </div>
            </div>

            {/* Replies Section */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-sm overflow-hidden mb-8">
                {/* Reply Composer */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5">
                    <div className="flex gap-3">
                        <Avatar name={currentUser?.displayName || 'Me'} src={currentUser?.avatar} size="md" className="w-9 h-9 flex-shrink-0" />
                        <div className="flex-1">
                            <textarea
                                id="reply-textarea"
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                rows={2}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:outline-none resize-none text-sm transition-all"
                            />
                            <div className="mt-2.5 flex justify-end">
                                <Button
                                    variant="gold"
                                    onClick={handleReply}
                                    disabled={!replyContent.trim()}
                                    isLoading={isReplying || createPost.isPending}
                                    size="sm"
                                    className="rounded-full px-5 font-semibold text-xs"
                                >
                                    Reply
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Replies List */}
                {postsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-500 dark:text-gold w-5 h-5" /></div>
                ) : replies.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No replies yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div>
                        {topLevelReplies.map((reply: any, idx: number) => {
                            const currentChildren = childReplies.filter((c: any) => (c.parent_id || c.parentId) === reply.id);

                            const renderReplyBox = (targetId: string, authorName: string) => (
                                activeReplyId === targetId && (
                                    <div className="mt-2 ml-11 sm:ml-12">
                                        <div className="flex gap-2.5">
                                            <Avatar name={currentUser?.displayName || 'Me'} src={currentUser?.avatar} size="sm" className="w-7 h-7 flex-shrink-0" />
                                            <div className="flex-1">
                                                <textarea
                                                    autoFocus
                                                    value={inlineReplyContent}
                                                    onChange={e => setInlineReplyContent(e.target.value)}
                                                    placeholder={`Reply to ${authorName}...`}
                                                    rows={2}
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:outline-none resize-none text-xs sm:text-sm transition-all"
                                                />
                                                <div className="mt-1.5 flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setActiveReplyId(null)}
                                                        className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <Button
                                                        size="sm"
                                                        variant="gold"
                                                        onClick={() => handleInlineReply(targetId)}
                                                        disabled={!inlineReplyContent.trim() || isReplying}
                                                        isLoading={isReplying}
                                                        className="rounded-full px-4 text-xs font-semibold"
                                                    >
                                                        Reply
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            );

                            const renderReplyItem = (item: any, isNested: boolean = false) => {
                                const itemAuthorId = item.author_id || item.authorId;
                                const itemIsOP = itemAuthorId && threadAuthorId && itemAuthorId === threadAuthorId;
                                const isPostOwner = currentUserId && itemAuthorId && currentUserId === itemAuthorId;
                                const authorName = item.author?.display_name || item.author?.displayName || 'User';

                                return (
                                    <div key={item.id} className={isNested ? 'ml-11 sm:ml-12 mt-0.5' : ''}>
                                        <div className={`flex gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl transition-colors group ${isNested ? 'hover:bg-gray-50 dark:hover:bg-white/[0.02]' : ''}`}>
                                            <Avatar
                                                name={authorName}
                                                src={item.author?.avatar_url || item.author?.avatarUrl}
                                                size="sm"
                                                className={`w-8 h-8 flex-shrink-0 ${itemIsOP ? 'ring-2 ring-amber-400/40 dark:ring-gold/30' : ''}`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`font-semibold text-[13px] ${itemIsOP ? 'text-amber-700 dark:text-gold' : 'text-gray-900 dark:text-white'}`}>
                                                        {authorName}
                                                    </span>
                                                    {itemIsOP && (
                                                        <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-gold/15 text-amber-700 dark:text-gold">
                                                            OP
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">·</span>
                                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDate(item.created_at || item.createdAt)}</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{item.content}</p>

                                                {/* Action Bar */}
                                                <div className="mt-1.5 flex items-center gap-1 -ml-1.5">
                                                    <button
                                                        onClick={() => handleTogglePostLike(item.id)}
                                                        disabled={likePost.isPending || unlikePost.isPending}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${localLikedPosts[item.id] ? 'text-amber-600 dark:text-gold bg-amber-50 dark:bg-gold/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                                    >
                                                        <Heart className={`w-3.5 h-3.5 ${localLikedPosts[item.id] ? 'fill-amber-600 dark:fill-gold' : ''}`} />
                                                        {(item.likes || 0) > 0 && (item.likes || 0)}
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                                        onClick={() => {
                                                            setActiveReplyId(activeReplyId === item.id ? null : item.id);
                                                            if (activeReplyId !== item.id) {
                                                                setInlineReplyContent(`@${authorName} `);
                                                            }
                                                        }}
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        Reply
                                                    </button>
                                                    {isPostOwner && (
                                                        confirmDeleteId === item.id ? (
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <button
                                                                    onClick={() => handleDeletePost(item.id)}
                                                                    disabled={deletePost.isPending}
                                                                    className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    className="px-2 py-1 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmDeleteId(item.id)}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {renderReplyBox(item.id, authorName)}
                                    </div>
                                );
                            };

                            return (
                                <div key={reply.id} className={idx !== topLevelReplies.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}>
                                    {renderReplyItem(reply, false)}

                                    {currentChildren.length > 0 && (
                                        <div className="ml-11 sm:ml-12 pb-2">
                                            <button
                                                onClick={() => toggleReplies(reply.id)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-600 dark:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all"
                                            >
                                                {expandedReplies[reply.id] ? (
                                                    <><ChevronUp className="w-3.5 h-3.5" /> Hide {currentChildren.length} {currentChildren.length === 1 ? 'reply' : 'replies'}</>
                                                ) : (
                                                    <><ChevronDown className="w-3.5 h-3.5" /> View {currentChildren.length} {currentChildren.length === 1 ? 'reply' : 'replies'}</>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {expandedReplies[reply.id] && (
                                        <div className="pb-2">
                                            {currentChildren.map((child: any) => renderReplyItem(child, true))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default { CommunityForum, ThreadView };
