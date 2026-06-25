/**
 * Community Feature - Forum and Discussions
 * Premium editorial "The Curator" style design
 * Mobile-first, iOS/Android safe, Light/Dark mode
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    Pause,
    Volume2,
    VolumeX,
    Music,
    Copy,
    Check,
} from 'lucide-react';
import '../reels/reels.css';
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
                        <div className="space-y-5">
                            {regularThreads.map((thread) => {
                                const mediaUrl = thread.mediaUrl;
                                const isVideo = thread.mediaType === 'video' || thread.media_type === 'video' || !!thread.videoThumbnailUrl || !!thread.video_thumbnail_url;
                                const authorName = thread.author?.displayName || 'Anonymous';
                                const authorAvatar = thread.author?.avatarUrl;
                                const authorId = thread.author?.id || thread.authorId;

                                if (isVideo) {
                                    return (
                                        <div
                                            key={thread.id}
                                            className="p-4 sm:p-6 bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm cursor-pointer hover:border-amber-500/30 dark:hover:border-gold/30 transition-all"
                                            onClick={() => navigate(`/community/thread/${thread.id}`)}
                                        >
                                            {/* Author Header — compact row */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div 
                                                    className="cursor-pointer group flex-shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (authorId) navigate(`/profile/${authorId}`);
                                                    }}
                                                >
                                                    <Avatar
                                                        name={authorName}
                                                        src={authorAvatar}
                                                        size="md"
                                                        className="w-10 h-10 ring-2 ring-amber-500/20 dark:ring-gold/20 group-hover:ring-amber-500/40 transition-all"
                                                    />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            className="font-semibold text-sm text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-gold transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (authorId) navigate(`/profile/${authorId}`);
                                                            }}
                                                        >{authorName}</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-orange-500 text-white">
                                                            OP
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {formatTimeAgo(thread.createdAt)}
                                                    </span>
                                                </div>
                                                {thread.isPinned && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pinned</span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900 dark:text-white leading-snug mb-2 hover:text-amber-600 dark:hover:text-gold transition-colors">
                                                {decodeHTML(thread.title)}
                                            </h3>

                                            {/* Content Description */}
                                            {thread.content && (
                                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3">
                                                    {thread.content}
                                                </p>
                                            )}

                                            {/* Centered Video Player */}
                                            {mediaUrl && (
                                                <div 
                                                    className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-black mb-4"
                                                    onClick={(e) => e.stopPropagation()} // Prevent card navigation when interacting with player
                                                >
                                                    <video
                                                        src={mediaUrl}
                                                        controls
                                                        playsInline
                                                        preload="metadata"
                                                        poster={thread.video_thumbnail_url || thread.videoThumbnailUrl || undefined}
                                                        controlsList="nodownload"
                                                        className="w-full max-h-[50vh] object-contain"
                                                        style={{ aspectRatio: '16/9' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Bottom Action Bar */}
                                            <div className="flex items-center gap-1 pt-3 border-t border-gray-100 dark:border-white/5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/community/thread/${thread.id}`);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                                >
                                                    <Heart className="w-4 h-4" />
                                                    {thread.likes || 0}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/community/thread/${thread.id}`);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    {thread.replyCount}
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // share logic or toast
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all ml-auto"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                );
                                }

                                // Regular Text/Image Thread
                                return (
                                    <div
                                        key={thread.id}
                                        className="p-4 sm:p-6 bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm cursor-pointer hover:border-amber-500/30 dark:hover:border-gold/30 transition-all flex gap-4"
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-400 dark:text-gray-500">
                                                <div 
                                                    className="flex items-center gap-2 cursor-pointer hover:text-amber-500 dark:hover:text-gold transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (authorId) navigate(`/profile/${authorId}`);
                                                    }}
                                                >
                                                    <Avatar name={authorName} src={authorAvatar} size="xs" className="w-5 h-5" />
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">{authorName}</span>
                                                </div>
                                                <span>·</span>
                                                <span>{formatTimeAgo(thread.createdAt)}</span>
                                                {thread.isPinned && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pinned</span>
                                                )}
                                            </div>
                                            <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1 hover:text-amber-600 dark:hover:text-gold transition-colors">{decodeHTML(thread.title)}</h3>
                                            {thread.content && (
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2.5">{thread.content}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 font-medium">{thread.category?.name || 'Discussion'}</span>
                                                <span className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5" />{thread.likes || 0}</span>
                                                <span className="flex items-center gap-0.5"><MessageCircle className="w-3.5 h-3.5" />{thread.replyCount}</span>
                                            </div>
                                        </div>
                                        {mediaUrl && (
                                            <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5 relative">
                                                <img src={mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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
    const [uploadStatusText, setUploadStatusText] = useState('');
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
                    // === VIDEO: Use smart CDN-direct or legacy upload ===
                    mediaType = 'video';
                    setUploadPhase('uploading');

                    const videoResult = await forumService.uploadVideo(file, {
                        onProgress: (p) => {
                            setUploadProgress(p);
                            if (p >= 80) setUploadPhase('compressing');
                        },
                        onStatus: (status) => {
                            setUploadStatusText(status);
                        },
                    });

                    mediaUrl = videoResult.url;
                    setUploadPhase('done');
                    setUploadStatusText('');
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
                                        <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                                            {uploadStatusText || (
                                                uploadPhase === 'uploading' ? (isVideo ? 'Uploading HD video...' : 'Uploading photo...') :
                                                uploadPhase === 'compressing' ? 'Optimizing video for mobile...' :
                                                uploadPhase === 'done' ? 'Upload Successful!' : ''
                                            )}
                                        </h4>
                                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                                        {uploadPhase === 'uploading' && `Transferring to Cloudflare R2 CDN`}
                                        {uploadPhase === 'compressing' && 'Processing H.264 video profiles for mobile'}
                                        {uploadPhase === 'done' && 'Publishing your discussion...'}
                                    </p>
                                </div>
                            </div>

                            {/* Custom progress track */}
                            <div className="relative z-10 w-full font-sans">
                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px] border border-gray-200/20 dark:border-white/5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                                            uploadPhase === 'done' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-500 via-[#C9A84C] to-[#E5C158] shadow-[0_0_8px_rgba(201,168,76,0.25)]'
                                        }`}
                                        style={{
                                            width: `${uploadProgress}%`,
                                            backgroundSize: uploadPhase !== 'done' ? '200% 100%' : undefined,
                                            animation: uploadPhase !== 'done' ? 'shimmer 1.5s ease-in-out infinite' : 'none',
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

    const [localLikedThreads, setLocalLikedThreads] = useState<Record<string, boolean>>({});
    const [localLikedPosts, setLocalLikedPosts] = useState<Record<string, boolean>>({});

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

    // Immersive Video Thread states/refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showHeart, setShowHeart] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);
    const lastTapRef = useRef(0);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(pct || 0);
    };

    const handleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            // Double tap - like thread
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 900);
            if (thread?.id && !localLikedThreads[thread.id]) {
                handleToggleThreadLike();
            }
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
            setTimeout(() => {
                if (lastTapRef.current === now) {
                    // Single tap - play/pause
                    if (!videoRef.current) return;
                    if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                    } else {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                    }
                    setShowPlayIcon(true);
                    setTimeout(() => setShowPlayIcon(false), 500);
                }
            }, 310);
        }
    };
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

    const isVideoThread = threadMediaType === 'video' || 
        (threadMediaType && threadMediaType.includes('video')) || 
        (threadMediaUrl && (threadMediaUrl.endsWith('.mp4') || threadMediaUrl.endsWith('.webm') || threadMediaUrl.endsWith('.mov') || threadMediaUrl.endsWith('.m3u8')));

    if (isVideoThread) {
        const shareUrl = window.location.href;
        const decodedTitle = decodeHTML(thread.title);
        const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(decodedTitle + ' ' + shareUrl)}`;
        const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(decodedTitle)}`;
        const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(decodedTitle)}&url=${encodeURIComponent(shareUrl)}`;
        const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

        return (
            <div className="reels-container">
                {/* Immersive Video Card (mimics ReelItem) */}
                <div className="reel-item" style={{ height: '100%' }}>
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate(-1)}
                        className="absolute top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all"
                        style={{ top: 'calc(16px + env(safe-area-inset-top, 0px))' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Top center header pill */}
                    <div 
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 text-xs font-semibold"
                        style={{ top: 'calc(16px + env(safe-area-inset-top, 0px))' }}
                    >
                        {thread.category?.name || 'Discussion'}
                    </div>

                    {/* HTML5 Video Player */}
                    <video
                        ref={videoRef}
                        src={threadMediaUrl}
                        loop
                        playsInline
                        autoPlay
                        preload="metadata"
                        muted={isMuted}
                        onClick={handleTap}
                        onTimeUpdate={handleTimeUpdate}
                        className="reel-video"
                        poster={thread.video_thumbnail_url || thread.videoThumbnailUrl || undefined}
                        style={{ objectFit: 'contain' }}
                    />

                    {/* Gradients */}
                    <div className="reel-gradient-top" />
                    <div className="reel-gradient-bottom" />

                    {/* Center Indicators */}
                    {showPlayIcon && (
                        <div className="reel-center-indicator">
                            {isPlaying
                                ? <Play style={{ width: 48, height: 48, fill: '#fff', color: '#fff' }} />
                                : <Pause style={{ width: 48, height: 48, fill: '#fff', color: '#fff' }} />
                            }
                        </div>
                    )}
                    {showHeart && (
                        <div className="reel-center-indicator">
                            <Heart style={{ width: 80, height: 80, fill: '#ef4444', color: '#ef4444' }} className="reel-heart-pop" />
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="reel-progress-track">
                        <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Bottom overlay info */}
                    <div className="reel-bottom-info text-left">
                        {/* User info row */}
                        <div className="reel-user-row flex items-center gap-2.5">
                            <div 
                                className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                                onClick={() => {
                                    const authorId = thread.author_id || thread.authorId || thread.author?.id;
                                    if (authorId) navigate(`/profile/${authorId}`);
                                }}
                            >
                                <Avatar
                                    name={authorName}
                                    src={authorAvatar}
                                    size="sm"
                                    className="!w-[38px] !h-[38px] !ring-2 !ring-white flex-shrink-0"
                                />
                                <div>
                                    <div className="reel-user-name font-bold text-white text-shadow">{authorName}</div>
                                    <div className="reel-user-time text-[10px] text-gray-300">{formatTimeAgo(thread.created_at || thread.createdAt)}</div>
                                </div>
                            </div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-orange-500 text-white">
                                OP
                            </span>
                        </div>

                        {/* Title */}
                        <h2 className="font-serif font-bold text-base sm:text-lg text-white leading-snug my-2 drop-shadow-md line-clamp-2">
                            {decodeHTML(thread.title)}
                        </h2>

                        {/* Description */}
                        {thread.content && (
                            <p className="text-gray-200 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-3 drop-shadow-sm max-w-[85%]">
                                {thread.content}
                            </p>
                        )}

                        {/* Hashtags or tags */}
                        {thread.tags && thread.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 my-2">
                                {thread.tags.map((tag: string) => (
                                    <span key={tag} className="text-amber-400 dark:text-gold text-xs font-semibold drop-shadow-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 my-2">
                                <span className="text-amber-400 dark:text-gold text-xs font-semibold drop-shadow-sm">#SeniQu</span>
                                <span className="text-amber-400 dark:text-gold text-xs font-semibold drop-shadow-sm">#Community</span>
                            </div>
                        )}

                        {/* Category tag/pill button */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm border border-white/10 uppercase tracking-wider">
                                {thread.category?.name || 'Discussion'}
                            </span>

                            {/* Soundtrack/Music Row */}
                            <div className="reel-music-pill flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 max-w-[200px] overflow-hidden">
                                <Music className="w-3.5 h-3.5 text-white animate-spin-slow shrink-0" style={{ animationDuration: '6s' }} />
                                <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                                    <span className="text-white text-[11px] font-medium tracking-wide">
                                        Original Audio • {authorName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="reel-sidebar">
                        <button onClick={() => setIsMuted(!isMuted)} className="reel-mute-btn bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center rounded-full w-10 h-10">
                            {isMuted ? <VolumeX style={{ width: 18, height: 18 }} /> : <Volume2 style={{ width: 18, height: 18 }} />}
                        </button>

                        <div className="reel-actions-card bg-black/40 backdrop-blur-md border border-white/10 py-3 rounded-2xl flex flex-col items-center gap-4">
                            {/* Likes */}
                            <button
                                onClick={handleToggleThreadLike}
                                className={`reel-action-btn flex flex-col items-center gap-1 ${localLikedThreads[thread.id] ? 'reel-liked text-red-500' : 'text-white'}`}
                            >
                                <div className="reel-action-icon">
                                    <Heart style={{ width: 20, height: 20, fill: localLikedThreads[thread.id] ? '#ef4444' : 'none', color: localLikedThreads[thread.id] ? '#ef4444' : '#fff' }} />
                                </div>
                                <span className="reel-action-count text-xs font-bold">{thread.likes || 0}</span>
                            </button>

                            {/* Comments/Replies */}
                            <button onClick={() => setShowReplies(true)} className="reel-action-btn flex flex-col items-center gap-1 text-white">
                                <div className="reel-action-icon">
                                    <MessageCircle style={{ width: 20, height: 20, color: '#fff' }} />
                                </div>
                                <span className="reel-action-count text-xs font-bold">{replies.length}</span>
                            </button>

                            {/* Share */}
                            <button 
                                onClick={() => setShowShare(true)} 
                                className="reel-action-btn flex flex-col items-center gap-1 text-white"
                            >
                                <div className="reel-action-icon">
                                    <Share2 style={{ width: 18, height: 18, color: '#fff' }} />
                                </div>
                                <span className="reel-action-count text-xs font-bold">Share</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Overlaid Comments Drawer - Portalled to body to prevent stacking context traps */}
                {showReplies && createPortal(
                    <>
                        <div className="reel-drawer-backdrop" style={{ zIndex: 99998 }} onClick={() => setShowReplies(false)} />
                        <div className="reel-drawer text-left bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/10" style={{ zIndex: 99999 }}>
                            <div className="reel-drawer-handle bg-gray-300 dark:bg-white/20" />
                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-white/10">
                                <h3 className="text-gray-900 dark:text-white font-bold text-sm font-serif">
                                    Replies <span className="text-gray-500 dark:text-gray-400 font-normal">({replies.length})</span>
                                </h3>
                                <button 
                                    onClick={() => setShowReplies(false)} 
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                                {replies.length === 0 ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-12">No replies yet. Start the conversation!</p>
                                ) : (
                                    replies.map((reply: any) => {
                                        const replyAuthor = reply.author?.displayName || reply.author?.display_name || 'Anonymous';
                                        const replyAvatar = reply.author?.avatarUrl || reply.author?.avatar_url;
                                        return (
                                            <div key={reply.id} className="flex gap-3 text-left items-start">
                                                <Avatar name={replyAuthor} src={replyAvatar} size="sm" className="!w-8 !h-8 shrink-0 !ring-1 !ring-gray-200 dark:!ring-white/10" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-gray-900 dark:text-white text-xs font-bold truncate">{replyAuthor}</span>
                                                        <span className="text-gray-400 dark:text-gray-500 text-[10px] shrink-0">{formatTimeAgo(reply.createdAt || reply.created_at)}</span>
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-200 text-[13px] leading-[1.4] mt-0.5 whitespace-pre-wrap break-words">{reply.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleReply();
                                }} 
                                className="reel-comment-form flex items-center gap-2.5 px-4 py-3.5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#161616] pb-safe-bottom"
                                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
                            >
                                {currentUser && <Avatar name={currentUser.displayName || 'U'} src={currentUser.avatar} size="xs" className="!w-7 !h-7 shrink-0 !ring-1 !ring-gray-200 dark:!ring-white/10" />}
                                <input 
                                    value={replyContent} 
                                    onChange={e => setReplyContent(e.target.value)} 
                                    placeholder="Add a reply..." 
                                    className="reel-comment-input flex-1 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/15 rounded-full px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:ring-gold/30 text-sm transition-all" 
                                    maxLength={1000} 
                                />
                                <button 
                                    type="submit" 
                                    disabled={!replyContent.trim() || isReplying} 
                                    className="reel-comment-send p-2 rounded-full bg-amber-500 dark:bg-gold text-charcoal disabled:opacity-50 transition-all hover:bg-amber-400 flex items-center justify-center shrink-0"
                                >
                                    {isReplying ? <Loader2 className="w-4 h-4 animate-spin text-charcoal" /> : <Send className="w-4 h-4 text-charcoal" />}
                                </button>
                            </form>
                        </div>
                    </>,
                    document.body
                )}

                {/* Overlaid Premium Share Drawer - Portalled to body */}
                {showShare && createPortal(
                    <>
                        <div className="reel-drawer-backdrop" style={{ zIndex: 99998 }} onClick={() => setShowShare(false)} />
                        <div className="reel-drawer text-left bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/10" style={{ zIndex: 99999 }}>
                            <div className="reel-drawer-handle bg-gray-300 dark:bg-white/20" />
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                                <h3 className="text-gray-900 dark:text-white font-bold text-sm font-serif">Share Thread</h3>
                                <button 
                                    onClick={() => setShowShare(false)} 
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
                                {/* Horizontal / Grid of Sharing Options */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    {/* WhatsApp */}
                                    <a 
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                            <svg className="w-5.5 h-5.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.855.001-2.63-1.02-5.101-2.871-6.955C16.6 1.94 14.135 1.058 11.517 1.058c-5.44 0-9.866 4.418-9.87 9.852 0 1.698.448 3.355 1.3 4.8l-.995 3.636 3.733-.98.062.037zm11.367-6.275c-.31-.156-1.834-.905-2.11-.1-.277.104-.537.905-.658 1.042-.122.137-.243.153-.553.002-.31-.154-1.31-.483-2.496-1.54-1.22-1.09-1.79-1.63-2.1-1.785-.309-.156-.33-.137-.442-.008-.112.129-.48.556-.607.727-.127.172-.254.19-.564.034-.31-.156-1.95-.718-2.63-1.325-.52-.465-.87-1.03-.97-1.2-.102-.173-.01-.267.076-.352.078-.077.172-.2.258-.3.086-.1.115-.172.172-.34.057-.172.029-.323-.014-.428-.043-.105-.39-.94-.534-1.285-.14-.34-.282-.293-.39-.293-.1-.002-.215-.002-.33-.002-.115 0-.301.043-.46.213-.158.172-.603.589-.603 1.436 0 .848.617 1.666.703 1.782.086.115 1.212 1.85 2.937 2.595.41.177.73.282.98.362.413.132.79.113 1.087.069.331-.05 1.016-.415 1.158-.816.142-.401.142-.746.1-.816-.042-.07-.156-.11-.466-.266z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">WhatsApp</span>
                                    </a>

                                    {/* Telegram */}
                                    <a 
                                        href={telegramLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                            <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.87 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.538-.196 1.006.128.832.941z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">Telegram</span>
                                    </a>

                                    {/* Twitter / X */}
                                    <a 
                                        href={twitterLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                            <svg className="w-4 h-4 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">Twitter / X</span>
                                    </a>

                                    {/* Facebook */}
                                    <a 
                                        href={facebookLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">Facebook</span>
                                    </a>
                                </div>

                                {/* Copy Link URL Copy Field */}
                                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2 flex items-center justify-between gap-3">
                                    <div className="flex-1 overflow-hidden px-2">
                                        <div className="text-[11px] text-gray-700 dark:text-gray-300 truncate select-all">{shareUrl}</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(shareUrl);
                                            setCopied(true);
                                            toast.success('Copied!', 'Link copied to clipboard');
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={copied ? "shrink-0 p-1.5 rounded-lg border flex items-center justify-center transition-all bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "shrink-0 p-1.5 rounded-lg border flex items-center justify-center transition-all bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"}
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
            </div>
        );
    }

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
                <div className="p-4 sm:p-6">
                    {/* Author Header — compact row */}
                    <div className="flex items-center gap-3 mb-4">
                        <div 
                            className="cursor-pointer group flex-shrink-0"
                            onClick={() => {
                                const authorId = thread.author_id || thread.authorId || thread.author?.id;
                                if (authorId) navigate(`/profile/${authorId}`);
                            }}
                        >
                            <Avatar
                                name={authorName}
                                src={authorAvatar}
                                size="md"
                                className="w-10 h-10 ring-2 ring-amber-500/20 dark:ring-gold/20 group-hover:ring-amber-500/40 transition-all"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span 
                                    className="font-semibold text-sm text-gray-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-gold transition-colors"
                                    onClick={() => {
                                        const authorId = thread.author_id || thread.authorId || thread.author?.id;
                                        if (authorId) navigate(`/profile/${authorId}`);
                                    }}
                                >{authorName}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-orange-500 text-white">
                                    OP
                                </span>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatTimeAgo(thread.created_at || thread.createdAt)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {isThreadOwner && (
                                <button
                                    onClick={() => setIsEditingThread(true)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-600 dark:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all"
                                >
                                    ✏️
                                </button>
                            )}
                            {isThreadOwner && (
                                <button
                                    onClick={handleDeleteThread}
                                    disabled={deleteThread.isPending}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-snug break-words">
                        {decodeHTML(thread.title)}
                    </h1>

                    {/* Content */}
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words mb-1">
                        {thread.content}
                    </p>

                    {/* Media — Video Player or Image */}
                    {threadMediaUrl && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-black">
                            {threadMediaType === 'video' ? (
                                <video
                                    src={threadMediaUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster={thread.video_thumbnail_url || thread.videoThumbnailUrl || undefined}
                                    controlsList="nodownload"
                                    className="w-full max-h-[65vh] object-contain"
                                    style={{ aspectRatio: '16/9' }}
                                />
                            ) : (
                                <img src={threadMediaUrl} alt="Thread Attachment" className="w-full max-h-[400px] object-cover" loading="lazy" />
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={handleToggleThreadLike}
                        disabled={likeThread.isPending || unlikeThread.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${localLikedThreads[thread.id]
                            ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${localLikedThreads[thread.id] ? 'fill-red-500' : ''}`} />
                        {thread.likes || 0}
                    </button>
                    <button
                        onClick={() => setShowReplies(!showReplies)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${showReplies
                            ? 'text-amber-600 dark:text-gold bg-amber-50 dark:bg-gold/10'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        {replies.length}
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all ml-auto">
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
