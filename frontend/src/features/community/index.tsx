/**
 * Community Feature - Forum and Discussions
 * Premium editorial "The Curator" style design
 * Mobile-first, iOS/Android safe, Light/Dark mode
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Avatar, Button } from '../../components/ui';
import {
    MessageSquare,
    Search,
    Plus,
    Heart,
    Loader2,
    Image as ImageIcon,
    X,
    Trash2,
    ChevronDown,
    ChevronUp,
    Share2,
    ArrowLeft,
    MessageCircle,
    Send,
    Film,
    Clock,
    AlertTriangle,
    Play,
} from 'lucide-react';
import { extractArray, decodeHTML } from '../../lib/utils';
import { uploadFile } from '../../lib/api';
import { compressImage } from '../../lib/imageCompressor';
import { validateVideo, formatFileSize, formatDuration, generateVideoThumbnail } from '../../lib/videoCompressor';
import { forumService } from '../../services/forumService';
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
    useUpdateThread,
    useUpdatePost,
    useDeleteThread,
    useDeletePost
} from '../../hooks/useForum';
import { useToast } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { SEOHead } from '../../components/common/SEOHead';

// ============================================
// HELPERS
// ============================================

function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// ============================================
// PUBLIC COMMUNITY FORUM — LISTING PAGE
// ============================================

export function CommunityForum() {
    const navigate = useNavigate();
    const [activeCategorySlug, setActiveCategorySlug] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { isAuthenticated } = useAuthStore();

    const { data: categoriesData } = useForumCategories();
    const categories = extractArray<any>(categoriesData);

    const currentCategory = activeCategorySlug !== 'all'
        ? categories.find(c => c.slug === activeCategorySlug)
        : null;

    const { data: threadsData, isLoading } = useForumThreads({
        categoryId: currentCategory?.id,
    });

    const threads = (threadsData?.data || []).filter(thread =>
        decodeHTML(thread.title).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredThread = threads.find((t: any) => t.mediaUrl || t.media_url || t.isFeatured || t.is_featured);
    const regularThreads = threads.filter((t: any) => t !== featuredThread);

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-12 md:pt-32 md:pb-20">
            <SEOHead
                title="Community"
                description="Join the Indonesian art community. Discuss share artworks and dialogue about the cultural heritage of the archipelago."
                canonical="/community"
            />
            {/* ==================== HERO SECTION ==================== */}
            <div className="relative overflow-hidden rounded-2xl mb-8 p-6 sm:p-8" style={{
                background: 'linear-gradient(135deg, #1a1510 0%, #0d0d0d 50%, #1a1510 100%)',
            }}>
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(201,168,76,0.06) 0%, transparent 50%)',
                    pointerEvents: 'none'
                }} />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
                        <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber-400/70 font-semibold">The Curator</span>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                        Voices of the <span className="italic text-amber-400">Atelier</span>
                    </h1>
                    <p className="text-sm text-white/50 max-w-md leading-relaxed">
                        Join the global dialogue on art, heritage, and the contemporary pulse of creativity.
                    </p>

                    {/* Search */}
                    <div className="relative mt-5 max-w-md">
                        <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none', zIndex: 2 }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search discussions..."
                            className="w-full py-3 pl-10 pr-4 rounded-full border border-white/10 backdrop-blur-sm text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== CATEGORY PILLS ==================== */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                <button
                    onClick={() => setActiveCategorySlug('all')}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${activeCategorySlug === 'all'
                        ? 'bg-amber-500 dark:bg-gold text-charcoal shadow-md'
                        : 'bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/8 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                >
                    All Topics
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategorySlug(cat.slug)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategorySlug === cat.slug
                            ? 'bg-amber-500 dark:bg-gold text-charcoal shadow-md'
                            : 'bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/8 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* ==================== MAIN GRID ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-0">
                    {/* Featured Thread */}
                    {featuredThread && (
                        <div
                            className="relative rounded-2xl overflow-hidden cursor-pointer mb-6 group"
                            style={{ aspectRatio: '16/9', maxHeight: '280px' }}
                            onClick={() => navigate(`/community/thread/${featuredThread.id}`)}
                        >
                            {(featuredThread.mediaType || featuredThread.media_type) === 'video' ? (
                                <>
                                    <img src={featuredThread.video_thumbnail_url || featuredThread.videoThumbnailUrl || featuredThread.mediaUrl} alt={decodeHTML(featuredThread.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
                                        <Play className="w-3 h-3" /> Video
                                    </div>
                                </>
                            ) : (
                                <img src={featuredThread.mediaUrl} alt={decodeHTML(featuredThread.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-charcoal text-[10px] font-bold uppercase tracking-wider w-fit mb-2">
                                    Featured
                                </div>
                                <h3 className="font-serif font-bold text-lg sm:text-xl text-white leading-snug line-clamp-2 mb-1.5">{decodeHTML(featuredThread.title)}</h3>
                                <div className="flex items-center gap-2 text-white/60 text-xs">
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const authorId = featuredThread.author?.id || featuredThread.author_id || featuredThread.authorId;
                                            if (authorId) navigate(`/profile/${authorId}`);
                                        }}
                                    >
                                        <Avatar name={featuredThread.author?.displayName || 'User'} src={featuredThread.author?.avatarUrl} size="xs" className="w-5 h-5" />
                                        <span>{featuredThread.author?.displayName || 'Anonymous'}</span>
                                    </div>
                                    <span>·</span>
                                    <span>{formatTimeAgo(featuredThread.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Threads List */}
                    {isLoading ? (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="w-7 h-7 text-amber-500 dark:text-gold animate-spin" />
                        </div>
                    ) : regularThreads.length === 0 && !featuredThread ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <h3 className="font-serif text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1">No Discussions Found</h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">Start a new thread or try a different search.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/6 overflow-hidden">
                            {regularThreads.map((thread, idx) => {
                                const mediaUrl = thread.mediaUrl;
                                const authorName = thread.author?.displayName || 'Anonymous';
                                return (
                                    <div
                                        key={thread.id}
                                        className={`flex gap-3 sm:gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${idx < regularThreads.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 text-xs text-gray-400 dark:text-gray-500">
                                                <div 
                                                    className="flex items-center gap-2 cursor-pointer hover:text-amber-500 dark:hover:text-gold transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const authorId = thread.author?.id || thread.author_id || thread.authorId;
                                                        if (authorId) navigate(`/profile/${authorId}`);
                                                    }}
                                                >
                                                    <Avatar name={authorName} src={thread.author?.avatarUrl} size="xs" className="w-5 h-5" />
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">{authorName}</span>
                                                </div>
                                                <span>·</span>
                                                <span>{formatTimeAgo(thread.createdAt)}</span>
                                                {(thread.isPinned) && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pinned</span>
                                                )}
                                            </div>
                                            <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1 hover:text-amber-600 dark:hover:text-gold transition-colors">{decodeHTML(thread.title)}</h3>
                                            {thread.content && (
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">{thread.content}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 font-medium">{thread.category?.name || 'Discussion'}</span>
                                                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{thread.likes || 0}</span>
                                                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{thread.replyCount || 0}</span>
                                            </div>
                                        </div>
                                        {mediaUrl && (
                                            <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5 relative">
                                                {(thread.mediaType || thread.media_type) === 'video' ? (
                                                    <>
                                                        <img
                                                            src={thread.video_thumbnail_url || thread.videoThumbnailUrl || mediaUrl}
                                                            alt="" className="w-full h-full object-cover" loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="w-4 h-4 text-white drop-shadow-lg" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img src={mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6 hidden lg:block">
                    {/* Categories */}
                    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/6 p-5">
                        <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white mb-3">Categories</h3>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveCategorySlug('all')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${activeCategorySlug === 'all'
                                    ? 'bg-amber-50 dark:bg-gold/10 text-amber-700 dark:text-gold font-semibold'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <span>All Topics</span>
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategorySlug(cat.slug)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${activeCategorySlug === cat.slug
                                        ? 'bg-amber-50 dark:bg-gold/10 text-amber-700 dark:text-gold font-semibold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <span>{cat.name}</span>
                                    {cat.threadCount > 0 && (
                                        <span className="text-xs bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full text-gray-400 dark:text-gray-500">{cat.threadCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* FAB — Mobile */}
            {isAuthenticated && (
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="lg:hidden fixed bottom-20 right-5 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-charcoal shadow-xl transition-all active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #C9A84C, #B08D57)',
                        boxShadow: '0 4px 20px rgba(201,168,76,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                        paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))',
                    }}
                >
                    <Plus className="w-4 h-4" />
                    New Discussion
                </button>
            )}

            {/* Create Thread Modal */}
            {isCreateModalOpen && (
                <CreateThreadModalPublic
                    onClose={() => setIsCreateModalOpen(false)}
                    categories={categories}
                />
            )}
        </div>
    );
}

// ============================================
// PUBLIC CREATE THREAD MODAL
// ============================================

// ============================================
// PUBLIC CREATE THREAD MODAL — WITH VIDEO UPLOAD
// ============================================

function CreateThreadModalPublic({ onClose, categories }: { onClose: () => void, categories: any[] }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'compressing' | 'done'>('idle');
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number; size: number } | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [validationWarning, setValidationWarning] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const createThread = useCreateThread();
    const toast = useToast();

    const isVideo = file?.type.startsWith('video/');

    // Clean up object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (mediaPreview && file && !file.type.startsWith('video/')) {
                URL.revokeObjectURL(mediaPreview);
            }
        };
    }, [mediaPreview, file]);

    // Handle file selection with validation
    const handleFileSelect = async (selectedFile: File) => {
        setValidationError(null);
        setValidationWarning(null);
        
        // Clean up previous image preview URL if it exists
        if (mediaPreview && file && !file.type.startsWith('video/')) {
            URL.revokeObjectURL(mediaPreview);
        }
        setMediaPreview(null);
        setVideoMeta(null);

        if (selectedFile.type.startsWith('video/')) {
            const validation = await validateVideo(selectedFile, {
                maxFileSize: 150 * 1024 * 1024, // 150MB
                maxDuration: 5 * 60, // 5 minutes
            });
            if (!validation.valid) {
                setValidationError(validation.error || 'Invalid video file');
                return;
            }
            if (validation.warning) setValidationWarning(validation.warning);
            if (validation.metadata) setVideoMeta(validation.metadata);

            // Generate preview thumbnail
            try {
                const thumb = await generateVideoThumbnail(selectedFile);
                setMediaPreview(thumb);
            } catch { /* non-critical */ }
        } else {
            // Synchronously create a single object URL for image previews
            const url = URL.createObjectURL(selectedFile);
            setMediaPreview(url);
        }

        setFile(selectedFile);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !categoryId) {
            toast.error('Required Fields', 'Please fill in title, content, and category.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;

            if (file) {
                if (file.type.startsWith('video/')) {
                    // === VIDEO: Use dedicated forum video upload endpoint ===
                    mediaType = 'video';
                    setUploadPhase('uploading');

                    const videoResult = await forumService.uploadVideo(file, {
                        onProgress: (p) => {
                            setUploadProgress(p);
                            if (p >= 100) setUploadPhase('compressing');
                        },
                    });

                    mediaUrl = videoResult.url;
                    setUploadPhase('done');
                } else {
                    // === IMAGE: Client-side compress + standard upload ===
                    mediaType = 'image';
                    setUploadPhase('uploading');
                    const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
                    const uploadResult = await uploadFile(compressed, 'general', (p) => {
                        setUploadProgress(p);
                    });
                    mediaUrl = uploadResult.url;
                    setUploadPhase('done');
                }
            }

            await createThread.mutateAsync({
                title,
                content,
                categoryId,
                tags: [],
                mediaUrl,
                mediaType,
            });

            onClose();
        } catch (error: any) {
            console.error('Thread creation error:', error);
            setUploadPhase('idle');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111111] border border-gray-200/60 dark:border-white/10 shadow-2xl rounded-t-2xl sm:rounded-2xl relative"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all z-10">
                    <X className="w-5 h-5" />
                </button>
                <form onSubmit={handleSubmit} className="p-5 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-1">Create Discussion</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Share your thoughts with the community</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Title *</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                placeholder="Discussion title..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 dark:focus:border-gold text-sm"
                                maxLength={255} required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Category *</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold text-sm" required>
                                <option value="" disabled>Select a category</option>
                                {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Content *</label>
                            <textarea value={content} onChange={e => setContent(e.target.value)}
                                placeholder="What do you want to discuss?"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white h-28 resize-none focus:outline-none focus:border-amber-500 dark:focus:border-gold text-sm" required />
                        </div>

                        {/* ==================== MEDIA UPLOAD SECTION ==================== */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Attach Media</label>

                            {file ? (
                                <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/[0.03]">
                                    {/* Video Preview */}
                                    {isVideo && mediaPreview && (
                                        <div className="relative aspect-video bg-black">
                                            <img src={mediaPreview} alt="Video preview" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Image Preview */}
                                    {!isVideo && mediaPreview && (
                                        <div className="relative aspect-video bg-gray-100 dark:bg-white/5">
                                            <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                                        </div>
                                    )}

                                    {/* File Info Bar */}
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        {isVideo ? <Film className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ImageIcon className="w-4 h-4 text-pink-500 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                <span>{formatFileSize(file.size)}</span>
                                                {videoMeta && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(videoMeta.duration)}</span>
                                                        <span>·</span>
                                                        <span>{videoMeta.width}×{videoMeta.height}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => {
                                            if (mediaPreview && !file.type.startsWith('video/')) {
                                                URL.revokeObjectURL(mediaPreview);
                                            }
                                            setFile(null);
                                            setMediaPreview(null);
                                            setVideoMeta(null);
                                            setValidationWarning(null);
                                        }}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Server compression notice for videos */}
                                    {isVideo && (
                                        <div className="px-3 pb-2.5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                                                <Film className="w-3 h-3" />
                                                Auto-compressed on server · H.264 · Mobile optimized
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-pink-400 dark:hover:border-pink-500/40 hover:text-pink-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <ImageIcon className="w-5 h-5" />
                                        <span className="font-semibold">Image</span>
                                    </button>
                                    <button type="button" onClick={() => videoInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500/40 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <Film className="w-5 h-5" />
                                        <span className="font-semibold">Video</span>
                                        <span className="text-[10px] opacity-60">Max 5 min · 150MB</span>
                                    </button>
                                </div>
                            )}

                            {/* Hidden file inputs */}
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                                onChange={e => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); }} />
                            <input type="file" ref={videoInputRef} accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden"
                                onChange={e => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); }} />

                            {/* Validation Error */}
                            {validationError && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2.5 rounded-lg">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {validationError}
                                </div>
                            )}
                            {/* Validation Warning */}
                            {validationWarning && !validationError && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-lg">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {validationWarning}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ==================== PREMIUM UPLOAD PROGRESS CONTAINER ==================== */}
                    {isUploading && (
                        <div className="mt-4 p-5 rounded-2xl bg-amber-500/5 dark:bg-[#1f1a10] border border-amber-500/20 flex flex-col space-y-4 relative overflow-hidden backdrop-blur-md">
                            {/* Animated scanning bar overlay */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 animate-pulse" />
                            
                            <div className="relative z-10 flex items-start gap-4">
                                {/* Left icon wrapper with conditional animations */}
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 flex-shrink-0 flex items-center justify-center shadow-inner">
                                    {uploadPhase === 'uploading' && (
                                        isVideo ? (
                                            <Film className="w-6 h-6 animate-pulse" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 animate-pulse" />
                                        )
                                    )}
                                    {uploadPhase === 'compressing' && (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    )}
                                    {uploadPhase === 'done' && (
                                        <svg className="w-6 h-6 text-emerald-500 animate-[scaleIn_0.3s_ease-out_forwards]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
                                            {uploadPhase === 'uploading' && (isVideo ? 'Uploading HD video...' : 'Uploading photo...')}
                                            {uploadPhase === 'compressing' && 'Optimizing video for mobile...'}
                                            {uploadPhase === 'done' && 'Upload Successful!'}
                                        </h4>
                                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                                            {uploadPhase === 'compressing' ? '90%' : `${uploadProgress}%`}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                                        {uploadPhase === 'uploading' && `Transferring files to secure Cloudflare R2 CDN (${uploadProgress}% completed)`}
                                        {uploadPhase === 'compressing' && 'Processing streams, transcoding H.264 video profiles'}
                                        {uploadPhase === 'done' && 'Your discussion post is being published...'}
                                    </p>
                                </div>
                            </div>

                            {/* Custom progress track */}
                            <div className="relative z-10 w-full font-sans">
                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px] border border-gray-200/20 dark:border-white/5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ease-out ${
                                            uploadPhase === 'done' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-500 via-[#C9A84C] to-[#E5C158] shadow-[0_0_8px_rgba(201,168,76,0.25)]'
                                        }`}
                                        style={{
                                            width: uploadPhase === 'compressing' ? '90%' : `${uploadProgress}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Cancel</button>
                        <Button type="submit" variant="gold" isLoading={isUploading || createThread.isPending} className="rounded-xl px-6"
                            disabled={!!validationError}>
                            Post Discussion
                        </Button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes shimmer { 0%,100% { background-position: 0% 0%; } 50% { background-position: 100% 0%; } }`}</style>
        </div>
    );
}

// ============================================
// PUBLIC EDIT THREAD MODAL
// ============================================

function EditThreadModalPublic({ onClose, thread }: { onClose: () => void, thread: any }) {
    const [title, setTitle] = useState(decodeHTML(thread.title) || '');
    const [content, setContent] = useState(thread.content || '');
    const updateThread = useUpdateThread();
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            toast.error('Required Fields', 'Please fill in title and content.');
            return;
        }

        try {
            await updateThread.mutateAsync({
                id: thread.id,
                data: {
                    title,
                    content
                }
            });
            onClose();
        } catch (error: any) {
            console.error('Thread update error:', error);
            toast.error('Update Failed', error.message || 'Could not update thread.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111111] border border-gray-200/60 dark:border-white/10 shadow-2xl rounded-2xl relative">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all z-10">
                    <X className="w-5 h-5" />
                </button>
                <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-1">Edit Discussion</h2>
                    
                    <div className="space-y-5 mt-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Title *</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 dark:focus:border-gold text-sm"
                                maxLength={255} required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Content *</label>
                            <textarea value={content} onChange={e => setContent(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white h-32 resize-none focus:outline-none focus:border-amber-500 dark:focus:border-gold text-sm" required />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Cancel</button>
                        <Button type="submit" variant="gold" isLoading={updateThread.isPending} className="rounded-xl px-6">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// THREAD VIEW — DETAIL PAGE
// ============================================

export function ThreadView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: threadData, isLoading: threadLoading } = useForumThread(id || '');
    const { data: postsData, isLoading: postsLoading } = useForumPosts(id || '');

    // Handle TransformInterceptor wrapper
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
    const [isEditingThread, setIsEditingThread] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editPostContent, setEditPostContent] = useState('');
    const updatePost = useUpdatePost();

    // Nested replies
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [inlineReplyContent, setInlineReplyContent] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
    const [showReplies, setShowReplies] = useState(false);

    const toggleReplies = (replyId: string) => {
        setExpandedReplies(prev => ({ ...prev, [replyId]: !prev[replyId] }));
    };

    const topLevelReplies = replies.filter((r: any) => !r.parent_id && !r.parentId);
    const childReplies = replies.filter((r: any) => r.parent_id || r.parentId);

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

    const handleUpdatePost = async (postId: string) => {
        if (!editPostContent.trim()) return;
        try {
            await updatePost.mutateAsync({ id: postId, content: editPostContent });
            setEditingPostId(null);
        } catch (error) {
            toast.error('Error', 'Failed to update reply');
        }
    };

    const handleToggleThreadLike = async () => {
        if (!thread?.id) return;
        const currentlyLiked = localLikedThreads[thread.id];
        setLocalLikedThreads(prev => ({ ...prev, [thread.id]: !currentlyLiked }));
        try {
            if (currentlyLiked) {
                await unlikeThread.mutateAsync(thread.id);
            } else {
                await likeThread.mutateAsync(thread.id);
            }
        } catch (error) {
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
            <div className="max-w-3xl mx-auto px-4 pt-28 pb-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 dark:text-gold animate-spin" />
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="max-w-3xl mx-auto px-4 pt-28 pb-12 flex flex-col items-center text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <h2 className="text-xl font-serif font-bold text-gray-700 dark:text-gray-300 mb-2">Thread not found</h2>
                <Link to="/community" className="text-amber-600 dark:text-gold text-sm hover:underline">← Back to Community</Link>
            </div>
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
    const authorName = thread.author?.display_name || thread.author?.displayName || 'User';
    const authorAvatar = thread.author?.avatar_url || thread.author?.avatarUrl;
    const threadMediaUrl = thread.media_url || thread.mediaUrl;
    const threadMediaType = thread.media_type || thread.mediaType;

    // ==================== RENDER REPLY ITEM ====================
    const renderReplyItem = (item: any, isNested: boolean = false) => {
        const itemAuthorId = item.author_id || item.authorId;
        const itemIsOP = itemAuthorId && threadAuthorId && itemAuthorId === threadAuthorId;
        const isPostOwner = currentUserId && itemAuthorId && currentUserId === itemAuthorId;
        const replyAuthor = item.author?.display_name || item.author?.displayName || 'User';
        const replyAvatar = item.author?.avatar_url || item.author?.avatarUrl;

        return (
            <div key={item.id} className={isNested ? 'ml-11 sm:ml-14' : ''}>
                <div className={`flex gap-2.5 sm:gap-3 py-3 sm:py-4 group ${isNested ? 'px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors' : ''}`}>
                    <div 
                        className="cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                        onClick={() => {
                            if (itemAuthorId) navigate(`/profile/${itemAuthorId}`);
                        }}
                    >
                        <Avatar
                            name={replyAuthor}
                            src={replyAvatar}
                            size="sm"
                            className={`w-8 h-8 sm:w-9 sm:h-9 ${itemIsOP ? 'ring-2 ring-amber-400/40 dark:ring-gold/30' : ''}`}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span 
                                className={`font-semibold text-[13px] cursor-pointer hover:underline ${itemIsOP ? 'text-amber-700 dark:text-gold' : 'text-gray-900 dark:text-white'}`}
                                onClick={() => {
                                    if (itemAuthorId) navigate(`/profile/${itemAuthorId}`);
                                }}
                            >
                                {replyAuthor}
                            </span>
                            {itemIsOP && (
                                <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-gold/15 text-amber-700 dark:text-gold">
                                    Author
                                </span>
                            )}
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {formatTimeAgo(item.created_at || item.createdAt)}
                            </span>
                            {isPostOwner && (
                                <button
                                    className="ml-auto p-1 rounded text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-amber-600 dark:hover:text-gold transition-all"
                                    title="Edit"
                                >
                                    <span className="text-[10px] font-semibold">✏️</span>
                                </button>
                            )}
                        </div>
                        {editingPostId === item.id ? (
                            <div className="mt-2">
                                <textarea
                                    autoFocus
                                    value={editPostContent}
                                    onChange={e => setEditPostContent(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 focus:outline-none resize-none text-[13px] sm:text-sm transition-all"
                                />
                                <div className="mt-2 flex justify-end gap-1.5">
                                    <button onClick={() => setEditingPostId(null)}
                                        className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleUpdatePost(item.id)}
                                        disabled={!editPostContent.trim() || updatePost.isPending}
                                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500 dark:bg-gold text-charcoal hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 transition-all"
                                    >
                                        {updatePost.isPending ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700 dark:text-gray-300 text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{item.content}</p>
                        )}

                        {/* Action Bar */}
                        <div className="mt-1.5 flex items-center gap-0.5 -ml-1.5">
                            <button
                                onClick={() => {
                                    setActiveReplyId(activeReplyId === item.id ? null : item.id);
                                    if (activeReplyId !== item.id) setInlineReplyContent(`@${replyAuthor} `);
                                }}
                                className="px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all"
                            >
                                Reply
                            </button>
                            <button
                                onClick={() => handleTogglePostLike(item.id)}
                                disabled={likePost.isPending || unlikePost.isPending}
                                className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${localLikedPosts[item.id]
                                    ? 'text-red-500'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-red-500'
                                }`}
                            >
                                Like{(item.likes || 0) > 0 && ` · ${item.likes}`}
                            </button>
                            {isPostOwner && (
                                confirmDeleteId === item.id ? (
                                    <div className="flex items-center gap-1 ml-1">
                                        <button onClick={() => handleDeletePost(item.id)} disabled={deletePost.isPending}
                                            className="px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all">
                                            Confirm
                                        </button>
                                        <button onClick={() => setConfirmDeleteId(null)}
                                            className="px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmDeleteId(item.id)}
                                        className="p-1 rounded text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Inline Reply Box */}
                {activeReplyId === item.id && (
                    <div className="ml-11 sm:ml-14 mb-2">
                        <div className="flex gap-2.5">
                            <Avatar name={currentUser?.displayName || 'Me'} src={currentUser?.avatar} size="sm" className="w-7 h-7 flex-shrink-0" />
                            <div className="flex-1">
                                <textarea
                                    autoFocus
                                    value={inlineReplyContent}
                                    onChange={e => setInlineReplyContent(e.target.value)}
                                    placeholder={`Reply to ${replyAuthor}...`}
                                    rows={2}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 focus:outline-none resize-none text-xs sm:text-sm transition-all"
                                />
                                <div className="mt-1.5 flex justify-end gap-1.5">
                                    <button onClick={() => setActiveReplyId(null)}
                                        className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleInlineReply(item.id)}
                                        disabled={!inlineReplyContent.trim() || isReplying}
                                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500 dark:bg-gold text-charcoal hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 transition-all"
                                    >
                                        {isReplying ? '...' : 'Reply'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-2 pb-12 md:pt-6 md:pb-20">
            {/* ==================== HEADER BAR ==================== */}
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="hidden sm:inline ml-1.5 text-sm font-medium">Back</span>
                </button>
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">The Curator Forum</span>
            </div>

            {/* ==================== THREAD CARD ==================== */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm overflow-hidden mb-6">
                <div className="p-5 sm:p-7">
                    {/* Author Header */}
                    <div className="flex items-start gap-3 mb-5">
                        <div 
                            className="flex items-start gap-3 cursor-pointer group"
                            onClick={() => {
                                const authorId = thread.author_id || thread.authorId || thread.author?.id;
                                if (authorId) navigate(`/profile/${authorId}`);
                            }}
                        >
                            <Avatar
                                name={authorName}
                                src={authorAvatar}
                                size="lg"
                                className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 ring-2 ring-amber-500/20 dark:ring-gold/20 group-hover:opacity-85 transition-opacity"
                            />
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-gold transition-colors">{authorName}</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-gold/15 text-amber-700 dark:text-gold">
                                        OP
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 block mt-0.5">
                                    {formatTimeAgo(thread.created_at || thread.createdAt)}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-1.5">
                            {isThreadOwner && (
                                <button
                                    onClick={() => setIsEditingThread(true)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-600 dark:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all flex items-center gap-1"
                                >
                                    ✏️ Edit
                                </button>
                            )}
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
                    </div>

                    <h1 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-snug break-words">
                        {decodeHTML(thread.title)}
                    </h1>

                    {/* Content */}
                    <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {thread.content}
                    </p>

                    {/* Media */}
                    {threadMediaUrl && (
                        <div className="mt-5 rounded-xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06]">
                            {threadMediaType === 'video' ? (
                                <video
                                    src={threadMediaUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster={thread.video_thumbnail_url || thread.videoThumbnailUrl || undefined}
                                    controlsList="nodownload"
                                    className="w-full max-h-[70vh] object-contain bg-black"
                                    style={{ aspectRatio: '16/9' }}
                                />
                            ) : (
                                <img src={threadMediaUrl} alt="Thread Attachment" className="w-full max-h-[400px] object-cover" loading="lazy" />
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-1 px-5 sm:px-7 py-3.5 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={handleToggleThreadLike}
                        disabled={likeThread.isPending || unlikeThread.isPending}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${localLikedThreads[thread.id]
                            ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${localLikedThreads[thread.id] ? 'fill-red-500' : ''}`} />
                        {thread.likes || 0}
                    </button>
                    <button
                        onClick={() => setShowReplies(!showReplies)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${showReplies
                            ? 'text-amber-600 dark:text-gold bg-amber-50 dark:bg-gold/10'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        {replies.length}
                    </button>
                    <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all ml-auto">
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ==================== REPLIES SECTION — shown on comment click ==================== */}
            {showReplies && (
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm overflow-hidden mb-8">
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
                                <button
                                    onClick={handleReply}
                                    disabled={!replyContent.trim() || isReplying || createPost.isPending}
                                    className="px-5 py-2 rounded-full text-xs font-bold bg-amber-500 dark:bg-gold text-charcoal hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    {(isReplying || createPost.isPending) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Replies List */}
                {postsLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-amber-500 dark:text-gold w-5 h-5" />
                    </div>
                ) : replies.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No replies yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div>
                        {topLevelReplies.map((reply: any, idx: number) => {
                            const currentChildren = childReplies.filter((c: any) => (c.parent_id || c.parentId) === reply.id);

                            return (
                                <div key={reply.id} className={idx !== topLevelReplies.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}>
                                    <div className="px-4 sm:px-5">
                                        {renderReplyItem(reply, false)}
                                    </div>

                                    {currentChildren.length > 0 && (
                                        <div className="ml-11 sm:ml-14 px-4 sm:px-5 pb-2">
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
                                        <div className="px-4 sm:px-5 pb-2">
                                            {currentChildren.map((child: any) => renderReplyItem(child, true))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            )}

            {isEditingThread && (
                <EditThreadModalPublic 
                    onClose={() => setIsEditingThread(false)} 
                    thread={thread} 
                />
            )}
        </div>
    );
}

export default { CommunityForum, ThreadView };
