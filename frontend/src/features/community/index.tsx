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
    ChevronLeft,
    ChevronRight,
    Grid,
    Layers,
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

interface MultiMediaData {
    images: string[];
    layout: 'separate' | 'grid' | 'carousel';
}

function parseMediaUrl(mediaUrl?: string): { isMulti: boolean; images: string[]; layout: 'separate' | 'grid' | 'carousel'; singleUrl?: string } {
    if (!mediaUrl) {
        return { isMulti: false, images: [], layout: 'separate' };
    }
    if (mediaUrl.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(mediaUrl) as MultiMediaData;
            if (parsed && Array.isArray(parsed.images)) {
                return {
                    isMulti: true,
                    images: parsed.images,
                    layout: parsed.layout || 'separate',
                };
            }
        } catch (e) {
            // fallback
        }
    }
    return {
        isMulti: false,
        images: [mediaUrl],
        layout: 'separate',
        singleUrl: mediaUrl,
    };
}


// ============================================
// PUBLIC COMMUNITY FORUM — LISTING PAGE
// ============================================

export function CommunityForum() {
    const navigate = useNavigate();
    const toast = useToast();
    const [activeCategorySlug, setActiveCategorySlug] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sharingThread, setSharingThread] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
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
                                    <img src={featuredThread.video_thumbnail_url || featuredThread.videoThumbnailUrl || parseMediaUrl(featuredThread.mediaUrl).images[0]} alt={decodeHTML(featuredThread.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
                                        <Play className="w-3 h-3" /> Video
                                    </div>
                                </>
                            ) : (() => {
                                const parsed = parseMediaUrl(featuredThread.mediaUrl);
                                return (
                                    <div className="w-full h-full relative overflow-hidden">
                                        <img src={parsed.images[0]} alt={decodeHTML(featuredThread.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                        {parsed.isMulti && parsed.images.length > 1 && (
                                            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                                                <Layers className="w-3.5 h-3.5" /> Gallery
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                                            className="p-4 sm:p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm cursor-pointer hover:border-amber-500/30 dark:hover:border-gold/30 transition-all"
                                            onClick={() => navigate(`/community/thread/${thread.id}`)}
                                        >
                                            {/* Category badge */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-gold/10 text-amber-700 dark:text-gold border border-amber-200/60 dark:border-gold/20">
                                                    {thread.category?.name || 'Discussion'}
                                                </span>
                                                {thread.isPinned && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pinned</span>
                                                )}
                                            </div>

                                            {/* Author Header */}
                                            <div className="flex items-center gap-2.5 mb-3">
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
                                                        size="sm"
                                                        className="w-8 h-8 ring-1 ring-gray-200/80 dark:ring-white/10 group-hover:ring-amber-500/40 transition-all"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <span 
                                                        className="font-bold text-[13px] text-gray-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-gold transition-colors block leading-tight"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (authorId) navigate(`/profile/${authorId}`);
                                                        }}
                                                    >{authorName}</span>
                                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                        Posted {formatTimeAgo(thread.createdAt)}
                                                    </span>
                                                </div>
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
                                                    onClick={(e) => e.stopPropagation()}
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
                                            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-400 dark:text-gray-500">
                                                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{thread.likes || 0} Vote</span>
                                                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{thread.replyCount} Discussion</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSharingThread(thread);
                                                    }}
                                                    className="p-1 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all ml-auto"
                                                    title="Share thread"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                );
                                }

                                // Regular Text/Image Thread
                                return (
                                    <div
                                        key={thread.id}
                                        className="p-4 sm:p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm cursor-pointer hover:border-amber-500/30 dark:hover:border-gold/30 transition-all"
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
                                    >
                                        {/* Category badge */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-gold/10 text-amber-700 dark:text-gold border border-amber-200/60 dark:border-gold/20">
                                                {thread.category?.name || 'Discussion'}
                                            </span>
                                            {thread.isPinned && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pinned</span>
                                            )}
                                        </div>

                                        {/* Author row */}
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div 
                                                className="cursor-pointer group flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (authorId) navigate(`/profile/${authorId}`);
                                                }}
                                            >
                                                <Avatar name={authorName} src={authorAvatar} size="sm" className="w-8 h-8 ring-1 ring-gray-200/80 dark:ring-white/10 group-hover:ring-amber-500/40 transition-all" />
                                            </div>
                                            <div className="min-w-0">
                                                <span 
                                                    className="font-bold text-[13px] text-gray-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-gold transition-colors block leading-tight"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (authorId) navigate(`/profile/${authorId}`);
                                                    }}
                                                >{authorName}</span>
                                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                    Posted {formatTimeAgo(thread.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content body + thumbnail */}
                                        <div className="flex gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1 hover:text-amber-600 dark:hover:text-gold transition-colors">{decodeHTML(thread.title)}</h3>
                                                {thread.content && (
                                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2.5">{thread.content}</p>
                                                )}
                                            </div>
                                            {mediaUrl && (() => {
                                                const parsed = parseMediaUrl(mediaUrl);
                                                const firstImg = parsed.images[0];
                                                if (!firstImg) return null;
                                                return (
                                                    <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5 relative shadow-sm">
                                                        <img src={firstImg} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                        {parsed.isMulti && parsed.images.length > 1 && (
                                                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-bold text-white flex items-center gap-0.5 shadow-sm">
                                                                <Layers className="w-2.5 h-2.5" />
                                                                <span>+{parsed.images.length - 1}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Bottom stats bar */}
                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-400 dark:text-gray-500">
                                            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{thread.likes || 0} Vote</span>
                                            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{thread.replyCount} Discussion</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSharingThread(thread);
                                                }}
                                                className="p-1 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all ml-auto"
                                                title="Share thread"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
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

            {/* Overlaid Premium Share Drawer - Portalled to body */}
            {sharingThread && createPortal(
                <>
                    <div className="reel-drawer-backdrop" style={{ zIndex: 99998 }} onClick={() => setSharingThread(null)} />
                    <div className="reel-drawer text-left bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/10" style={{ zIndex: 99999 }}>
                        <div className="reel-drawer-handle bg-gray-300 dark:bg-white/20" />
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                            <h3 className="text-gray-900 dark:text-white font-bold text-sm font-serif">Share Thread</h3>
                            <button 
                                onClick={() => setSharingThread(null)} 
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
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this thread on SeniQu: "${sharingThread.title}" ${window.location.origin}/community/thread/${sharingThread.id}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24">
                                            <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 1.89.5 3.63 1.39 5.16L2 22l5.07-1.32c1.47.8 3.12 1.26 4.88 1.26 5.5 0 9.99-4.5 9.99-10S17.49 2 12.004 2z" fill="#25D366" />
                                            <path d="M17.3 14.86c-.287-.144-1.702-.84-1.965-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-2.844-1.417-4.66-2.56-6.137-5.099-.136-.233-.036-.37.07-.487.165-.183.33-.298.485-.434.15-.132.227-.225.32-.397.094-.173.048-.337-.024-.481-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.49-.168-.008-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.192 2.032 3.102 4.921 4.348 2.889 1.246 2.889.83 3.4.78.513-.05 1.703-.696 1.943-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.192-.552-.336z" fill="white" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">WhatsApp</span>
                                </a>

                                {/* Telegram */}
                                <a 
                                    href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/community/thread/${sharingThread.id}`)}&text=${encodeURIComponent(`Check out this thread on SeniQu: "${sharingThread.title}"`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                        <svg className="w-5.5 h-5.5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.87 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.538-.196 1.006.128.832.941z" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300 text-[10px] font-medium">Telegram</span>
                                </a>

                                {/* Twitter / X */}
                                <a 
                                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/community/thread/${sharingThread.id}`)}&text=${encodeURIComponent(`Check out this thread on SeniQu: "${sharingThread.title}"`)}`}
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
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/community/thread/${sharingThread.id}`)}`}
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
                                    <div className="text-[11px] text-gray-700 dark:text-gray-300 truncate select-all">
                                        {`${window.location.origin}/community/thread/${sharingThread.id}`}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/community/thread/${sharingThread.id}`);
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
                </>
            , document.body)}
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
    const [files, setFiles] = useState<File[]>([]);
    const [layout, setLayout] = useState<'separate' | 'grid' | 'carousel'>('grid');
    const [selectedAspect, setSelectedAspect] = useState<string>('original');
    const [selectedSize, setSelectedSize] = useState<string>('1080p');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'compressing' | 'done'>('idle');
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number; size: number } | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [validationWarning, setValidationWarning] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const createThread = useCreateThread();
    const toast = useToast();

    const isVideo = files.length > 0 && files[0].type.startsWith('video/');

    // Clean up object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            mediaPreviews.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [mediaPreviews]);

    // Handle files selection with validation
    const handleFilesSelect = async (selectedFiles: File[]) => {
        setValidationError(null);
        setValidationWarning(null);

        const hasVideo = selectedFiles.some(f => f.type.startsWith('video/'));

        if (hasVideo) {
            if (selectedFiles.length > 1) {
                setValidationError('Videos cannot be uploaded with other files.');
                return;
            }
            const selectedFile = selectedFiles[0];
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

            // Clean up previous previews
            mediaPreviews.forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
            setMediaPreviews([]);

            // Generate preview thumbnail
            try {
                const thumb = await generateVideoThumbnail(selectedFile);
                setMediaPreviews([thumb]);
            } catch {
                setMediaPreviews([URL.createObjectURL(selectedFile)]);
            }
            setFiles([selectedFile]);
        } else {
            // Handle multiple images
            // If current files contain a video, clear it
            let currentImageFiles = files;
            let currentPreviews = mediaPreviews;
            if (files.some(f => f.type.startsWith('video/'))) {
                mediaPreviews.forEach(url => {
                    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                });
                currentImageFiles = [];
                currentPreviews = [];
                setVideoMeta(null);
            }

            const combinedFiles = [...currentImageFiles, ...selectedFiles].slice(0, 8); // Limit to 8 images
            if (currentImageFiles.length + selectedFiles.length > 8) {
                setValidationWarning('Maximum 8 images allowed. Only the first 8 were added.');
            }

            const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
            const combinedPreviews = [...currentPreviews, ...newPreviews].slice(0, 8);

            setMediaPreviews(combinedPreviews);
            setFiles(combinedFiles);
        }
    };

    const handleRemoveFile = (index: number) => {
        const fileToRemove = files[index];
        const previewToRemove = mediaPreviews[index];

        if (previewToRemove && previewToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(previewToRemove);
        }

        setFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));

        if (fileToRemove.type.startsWith('video/')) {
            setVideoMeta(null);
            setValidationWarning(null);
            setValidationError(null);
        }
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

            if (files.length > 0) {
                const firstFile = files[0];
                if (firstFile.type.startsWith('video/')) {
                    // === VIDEO: Use smart CDN-direct or legacy upload ===
                    mediaType = 'video';
                    setUploadPhase('uploading');

                    const videoResult = await forumService.uploadVideo(firstFile, {
                        onProgress: (p) => {
                            setUploadProgress(p);
                            if (p >= 80) setUploadPhase('compressing');
                        },
                        onStatus: (status) => {
                            setUploadStatusText(status);
                        },
                    });

                    // Store URL, aspect ratio, and size preset in the mediaUrl JSON
                    if (selectedAspect !== 'original' || selectedSize !== 'default') {
                        mediaUrl = JSON.stringify({
                            videoUrl: videoResult.url,
                            aspectRatio: selectedAspect,
                            sizePreset: selectedSize,
                            thumbnailUrl: videoResult.thumbnailUrl || undefined
                        });
                    } else {
                        mediaUrl = videoResult.url;
                    }
                    setUploadPhase('done');
                    setUploadStatusText('');
                } else {
                    // === IMAGE: Client-side compress + standard upload ===
                    mediaType = 'image';
                    setUploadPhase('uploading');

                    let maxWidth = 2048; // Default
                    if (selectedSize === '4k') maxWidth = 3840;
                    else if (selectedSize === '1080p') maxWidth = 1920;
                    else if (selectedSize === '720p') maxWidth = 1280;
                    else if (selectedSize === '480p') maxWidth = 854;
                    else if (selectedSize === 'original') maxWidth = 4096;
                    
                    const uploadedUrls: string[] = [];
                    for (let i = 0; i < files.length; i++) {
                        setUploadStatusText(`Compressing photo ${i + 1} of ${files.length}...`);
                        const compressed = await compressImage(files[i], { 
                            maxWidth: maxWidth, 
                            quality: 0.92,
                            aspectRatio: selectedAspect
                        });
                        
                        setUploadStatusText(`Uploading photo ${i + 1} of ${files.length}...`);
                        const uploadResult = await uploadFile(compressed, 'general', (progress) => {
                            const baseProgress = (i / files.length) * 100;
                            const fileWeight = (progress / files.length);
                            setUploadProgress(Math.round(baseProgress + fileWeight));
                        });
                        uploadedUrls.push(uploadResult.url);
                    }

                    if (uploadedUrls.length === 1) {
                        mediaUrl = uploadedUrls[0];
                    } else {
                        mediaUrl = JSON.stringify({
                            images: uploadedUrls,
                            layout: layout,
                        });
                    }
                    
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

                            {files.length > 0 ? (
                                <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/[0.03]">
                                    {/* Video Preview */}
                                    {isVideo && mediaPreviews[0] && (
                                        <div className="relative aspect-video bg-black">
                                            <img src={mediaPreviews[0]} alt="Video preview" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Images Preview Grid */}
                                    {!isVideo && mediaPreviews.length > 0 && (
                                        <div className="p-3 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                            <div className="grid grid-cols-4 gap-2">
                                                {mediaPreviews.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-black/20 group">
                                                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveFile(idx)}
                                                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-all shadow-md"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {/* Add more slot */}
                                                {mediaPreviews.length < 8 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-all text-[10px] font-semibold gap-1"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span>Add More</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* File Info Bar */}
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        {isVideo ? <Film className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ImageIcon className="w-4 h-4 text-pink-500 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {isVideo ? files[0].name : `${files.length} Photo${files.length > 1 ? 's' : ''} Selected`}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                <span>
                                                    {isVideo ? formatFileSize(files[0].size) : formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
                                                </span>
                                                {isVideo && videoMeta && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(videoMeta.duration)}</span>
                                                        <span>·</span>
                                                        <span>{videoMeta.width}×{videoMeta.height}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isVideo && (
                                            <button type="button" onClick={() => handleRemoveFile(0)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!isVideo && (
                                            <button type="button" onClick={() => {
                                                mediaPreviews.forEach(url => {
                                                    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                                                });
                                                setFiles([]);
                                                setMediaPreviews([]);
                                                setVideoMeta(null);
                                                setValidationWarning(null);
                                            }}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                title="Remove all photos"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
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

                                    {/* Scale & Aspect Controls */}
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">Aspect Ratio</label>
                                            <select 
                                                value={selectedAspect} 
                                                onChange={e => setSelectedAspect(e.target.value)}
                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-500 dark:focus:border-gold transition-all"
                                            >
                                                <option value="original">Original Aspect Ratio</option>
                                                <option value="1:1">Square (1:1)</option>
                                                <option value="4:3">Standard Landscape (4:3)</option>
                                                <option value="3:4">Classic Portrait (3:4)</option>
                                                <option value="16:9">Widescreen (16:9)</option>
                                                <option value="9:16">Vertical Video (9:16)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">{isVideo ? 'Compression Profile' : 'Size Profile / Scale'}</label>
                                            <select 
                                                value={selectedSize} 
                                                onChange={e => setSelectedSize(e.target.value)}
                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-500 dark:focus:border-gold transition-all"
                                            >
                                                {isVideo ? (
                                                    <>
                                                        <option value="default">Original Preset (Default)</option>
                                                        <option value="1080p">High Quality (1080p)</option>
                                                        <option value="720p">Standard HD (720p)</option>
                                                        <option value="480p">Mobile Data Saver (480p)</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="1080p">Full HD (1080p) - Recommended</option>
                                                        <option value="720p">Standard HD (720p)</option>
                                                        <option value="4k">Ultra HD (4K)</option>
                                                        <option value="480p">Mobile Data Saver (480p)</option>
                                                        <option value="original">Original (No Resize)</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-pink-400 dark:hover:border-pink-500/40 hover:text-pink-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <ImageIcon className="w-5 h-5" />
                                        <span className="font-semibold">Image</span>
                                        <span className="text-[10px] opacity-60">Max 8 Images</span>
                                    </button>
                                    <button type="button" onClick={() => videoInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500/40 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <Film className="w-5 h-5" />
                                        <span className="font-semibold">Video</span>
                                        <span className="text-[10px] opacity-60">Max 5 min · 150MB</span>
                                    </button>
                                </div>
                            )}

                            {/* Multiple image layout choices */}
                            {!isVideo && files.length > 1 && (
                                <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] dark:bg-white/[0.02]">
                                    <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5 uppercase tracking-wider">Display Options</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setLayout('separate')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${layout === 'separate' 
                                                ? 'bg-amber-500 dark:bg-gold text-charcoal border-transparent shadow-sm' 
                                                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                                        >
                                            <Layers className="w-4 h-4" />
                                            <span>Separates</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setLayout('grid')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${layout === 'grid' 
                                                ? 'bg-amber-500 dark:bg-gold text-charcoal border-transparent shadow-sm' 
                                                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                                        >
                                            <Grid className="w-4 h-4" />
                                            <span>Grid Collage</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setLayout('carousel')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${layout === 'carousel' 
                                                ? 'bg-amber-500 dark:bg-gold text-charcoal border-transparent shadow-sm' 
                                                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            </svg>
                                            <span>Carousel</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2.5 leading-relaxed">
                                        {layout === 'separate' && 'Images will be stacked vertically in full size.'}
                                        {layout === 'grid' && 'Images will be displayed in a premium collage grid.'}
                                        {layout === 'carousel' && 'Images will be displayed in an interactive swipable slider.'}
                                    </p>
                                </div>
                            )}

                            {/* Hidden file inputs */}
                            <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden"
                                onChange={e => { if (e.target.files?.length) handleFilesSelect(Array.from(e.target.files)); }} />
                            <input type="file" ref={videoInputRef} accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden"
                                onChange={e => { if (e.target.files?.length) handleFilesSelect(Array.from(e.target.files)); }} />

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
// THREAD MEDIA RENDERER
// ============================================

interface ThreadMediaRendererProps {
    mediaUrl?: string;
    mediaType?: string;
    threadTitle: string;
    posterUrl?: string;
}

export function ThreadMediaRenderer({ mediaUrl, mediaType, threadTitle, posterUrl }: ThreadMediaRendererProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [carouselIndex, setCarouselIndex] = useState(0);

    if (!mediaUrl) return null;

    if (mediaType === 'video') {
        let videoSrc = mediaUrl;
        let videoAspect: string | undefined = undefined;
        let videoPoster = posterUrl;

        if (mediaUrl.startsWith('{')) {
            try {
                const parsedVideo = JSON.parse(mediaUrl);
                videoSrc = parsedVideo.videoUrl || parsedVideo.url || mediaUrl;
                videoAspect = parsedVideo.aspectRatio;
                if (parsedVideo.thumbnailUrl) {
                    videoPoster = parsedVideo.thumbnailUrl;
                }
            } catch (e) {
                console.error('Failed to parse video mediaUrl JSON', e);
            }
        }

        const aspectValue = videoAspect && videoAspect !== 'original' ? videoAspect.replace(':', '/') : '16/9';

        return (
            <div 
                className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-black mx-auto" 
                style={{ 
                    aspectRatio: aspectValue, 
                    maxWidth: aspectValue === '9/16' ? '380px' : '100%' 
                }}
            >
                <video
                    src={videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                    poster={videoPoster}
                    controlsList="nodownload"
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    const parsed = parseMediaUrl(mediaUrl);
    if (!parsed.images || parsed.images.length === 0) return null;

    const handlePrevCarousel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCarouselIndex(prev => (prev === 0 ? parsed.images.length - 1 : prev - 1));
    };

    const handleNextCarousel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCarouselIndex(prev => (prev === parsed.images.length - 1 ? 0 : prev + 1));
    };

    const handlePrevLightbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxIndex !== null) {
            setLightboxIndex(prev => (prev === 0 ? parsed.images.length - 1 : prev! - 1));
        }
    };

    const handleNextLightbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxIndex !== null) {
            setLightboxIndex(prev => (prev === parsed.images.length - 1 ? 0 : prev! + 1));
        }
    };

    return (
        <div className="mt-4">
            {/* 1. SEPARATES LAYOUT (Vertical List) */}
            {parsed.layout === 'separate' && (
                <div className="flex flex-col gap-4">
                    {parsed.images.map((url, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setLightboxIndex(idx)}
                            className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-gray-50 dark:bg-black cursor-zoom-in transition-all hover:opacity-95"
                        >
                            <img
                                src={url}
                                alt={`${threadTitle} - Image ${idx + 1}`}
                                className="w-full object-contain"
                                loading="lazy"
                                style={{ maxHeight: '75vh', imageRendering: 'auto' }}
                                decoding="async"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 2. GRID COLLAGE LAYOUT */}
            {parsed.layout === 'grid' && (
                <div className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-gray-50 dark:bg-black">
                    {parsed.images.length === 1 ? (
                        <div onClick={() => setLightboxIndex(0)} className="cursor-zoom-in">
                            <img
                                src={parsed.images[0]}
                                alt={threadTitle}
                                className="w-full object-contain"
                                loading="lazy"
                                style={{ maxHeight: '75vh', imageRendering: 'auto' }}
                                decoding="async"
                            />
                        </div>
                    ) : parsed.images.length === 2 ? (
                        <div className="grid grid-cols-2 gap-1 bg-gray-200 dark:bg-white/10">
                            {parsed.images.map((url, idx) => (
                                <div key={idx} onClick={() => setLightboxIndex(idx)} className="aspect-[4/3] cursor-zoom-in overflow-hidden relative group">
                                    <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            ))}
                        </div>
                    ) : parsed.images.length === 3 ? (
                        <div className="grid grid-cols-3 gap-1 bg-gray-200 dark:bg-white/10">
                            <div onClick={() => setLightboxIndex(0)} className="col-span-2 aspect-[4/3] cursor-zoom-in overflow-hidden relative group">
                                <img src={parsed.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                            <div className="grid grid-rows-2 gap-1">
                                {parsed.images.slice(1).map((url, idx) => (
                                    <div key={idx} onClick={() => setLightboxIndex(idx + 1)} className="h-full cursor-zoom-in overflow-hidden relative group">
                                        <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : parsed.images.length === 4 ? (
                        <div className="grid grid-cols-2 gap-1 bg-gray-200 dark:bg-white/10">
                            {parsed.images.map((url, idx) => (
                                <div key={idx} onClick={() => setLightboxIndex(idx)} className="aspect-[4/3] cursor-zoom-in overflow-hidden relative group">
                                    <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // 5 or more images
                        <div className="grid grid-cols-3 gap-1 bg-gray-200 dark:bg-white/10">
                            <div onClick={() => setLightboxIndex(0)} className="col-span-2 aspect-[4/3] cursor-zoom-in overflow-hidden relative group">
                                <img src={parsed.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                            <div className="grid grid-rows-3 gap-1">
                                {parsed.images.slice(1, 3).map((url, idx) => (
                                    <div key={idx} onClick={() => setLightboxIndex(idx + 1)} className="h-full cursor-zoom-in overflow-hidden relative group">
                                        <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                ))}
                                <div onClick={() => setLightboxIndex(3)} className="h-full cursor-zoom-in overflow-hidden relative group bg-black/45">
                                    <img src={parsed.images[3]} alt="" className="w-full h-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-105" />
                                    {parsed.images.length > 4 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                                            <span className="text-white text-lg font-bold">+{parsed.images.length - 4}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3. CAROUSEL LAYOUT */}
            {parsed.layout === 'carousel' && (
                <div className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06] bg-gray-50 dark:bg-black relative aspect-[16/10] group">
                    {/* Images container */}
                    <div className="w-full h-full relative cursor-zoom-in" onClick={() => setLightboxIndex(carouselIndex)}>
                        <img 
                            src={parsed.images[carouselIndex]} 
                            alt={`${threadTitle} - Slide ${carouselIndex + 1}`} 
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Navigation Arrows */}
                    <button 
                        type="button" 
                        onClick={handlePrevCarousel}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        type="button" 
                        onClick={handleNextCarousel}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Counter Indicator badge */}
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-sm border border-white/10 text-white rounded-full text-[10px] font-mono font-bold z-10">
                        {carouselIndex + 1} / {parsed.images.length}
                    </div>

                    {/* Indicator Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/35 px-2.5 py-1.5 rounded-full backdrop-blur-[2px]">
                        {parsed.images.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCarouselIndex(idx);
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${carouselIndex === idx ? 'bg-amber-400 dark:bg-gold w-3' : 'bg-white/50 hover:bg-white/80'}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxIndex !== null && (
                <div 
                    className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all select-none"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* Close button */}
                    <button 
                        type="button"
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all z-50 cursor-pointer shadow-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Lightbox Content Container */}
                    <div className="relative max-w-5xl w-full max-h-[85vh] flex items-center justify-center">
                        <img 
                            src={parsed.images[lightboxIndex]} 
                            alt="" 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-300 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Navigation Arrows for Lightbox */}
                        {parsed.images.length > 1 && (
                            <>
                                <button 
                                    type="button"
                                    onClick={handlePrevLightbox}
                                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all z-20 cursor-pointer"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleNextLightbox}
                                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all z-20 cursor-pointer"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Counter details below image */}
                    {parsed.images.length > 1 && (
                        <div className="mt-4 px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-full text-xs font-mono font-bold">
                            {lightboxIndex + 1} / {parsed.images.length}
                        </div>
                    )}
                </div>
            )}
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
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
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

    const toggleComments = () => {
        const targetState = !isCommentsExpanded;
        setIsCommentsExpanded(targetState);
        if (targetState) {
            setTimeout(() => {
                const el = document.getElementById('comments-section-header');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

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

    const shareUrl = window.location.href;
    const decodedTitle = thread ? decodeHTML(thread.title) : '';
    const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(decodedTitle + ' ' + shareUrl)}`;
    const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(decodedTitle)}`;
    const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(decodedTitle)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    if (isVideoThread) {

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
                                        <div className="w-10 h-10 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                            <svg className="w-5.5 h-5.5" viewBox="0 0 24 24">
                                                <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 1.89.5 3.63 1.39 5.16L2 22l5.07-1.32c1.47.8 3.12 1.26 4.88 1.26 5.5 0 9.99-4.5 9.99-10S17.49 2 12.004 2z" fill="#25D366" />
                                                <path d="M17.3 14.86c-.287-.144-1.702-.84-1.965-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-2.844-1.417-4.66-2.56-6.137-5.099-.136-.233-.036-.37.07-.487.165-.183.33-.298.485-.434.15-.132.227-.225.32-.397.094-.173.048-.337-.024-.481-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.49-.168-.008-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.192 2.032 3.102 4.921 4.348 2.889 1.246 2.889.83 3.4.78.513-.05 1.703-.696 1.943-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.192-.552-.336z" fill="white" />
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
            <div className="flex items-center justify-between mb-5 px-1">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100/70 dark:bg-white/[0.05] border border-gray-200/20 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all shadow-sm group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">The Curator Forum</span>
            </div>

            {/* ==================== THREAD CARD ==================== */}
            <div className="bg-white dark:bg-[#111111] rounded-[24px] border border-gray-200/60 dark:border-white/[0.06] shadow-sm overflow-hidden mb-6">
                <div className="p-4 sm:p-6">
                    {/* Category Badge — top of card */}
                    {thread.category?.name && (
                        <div className="mb-3.5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.05em] bg-[#fef9f3] dark:bg-gold/10 text-[#c27a2b] dark:text-gold border border-[#f8e5d0] dark:border-gold/20">
                                {thread.category.name}
                            </span>
                        </div>
                    )}

                    {/* Author Header — clean row with avatar, name, timestamp */}
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
                                className="w-10 h-10 ring-2 ring-gray-100 dark:ring-white/5 transition-all"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span 
                                className="font-bold text-[15px] text-gray-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-gold transition-colors block leading-tight"
                                onClick={() => {
                                    const authorId = thread.author_id || thread.authorId || thread.author?.id;
                                    if (authorId) navigate(`/profile/${authorId}`);
                                }}
                            >{authorName}</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                Posted {formatTimeAgo(thread.created_at || thread.createdAt)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {isThreadOwner && (
                                <button
                                    onClick={() => setIsEditingThread(true)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-gold hover:bg-amber-50 dark:hover:bg-gold/10 transition-all"
                                    title="Edit thread"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                    </svg>
                                </button>
                            )}
                            {isThreadOwner && (
                                <button
                                    onClick={handleDeleteThread}
                                    disabled={deleteThread.isPending}
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                    title="Delete thread"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-snug break-words">
                        {decodeHTML(thread.title)}
                    </h1>

                    {/* Content */}
                    <div className="text-gray-700 dark:text-gray-300 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words mb-4">
                        {thread.content}
                    </div>

                    {/* Media — High-Quality Image(s) or Video */}
                    <ThreadMediaRenderer 
                        mediaUrl={threadMediaUrl}
                        mediaType={threadMediaType}
                        threadTitle={thread.title}
                        posterUrl={thread.video_thumbnail_url || thread.videoThumbnailUrl || undefined}
                    />
                </div>

                {/* Bottom Action Bar — vote + discussion count */}
                <div className="flex items-center gap-6 px-5 py-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={handleToggleThreadLike}
                        disabled={likeThread.isPending || unlikeThread.isPending}
                        className={`flex items-center gap-1.5 py-1 text-[13px] font-medium transition-all ${localLikedThreads[thread.id]
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <Heart className={`w-[18px] h-[18px] transition-transform duration-250 active:scale-120 ${localLikedThreads[thread.id] ? 'fill-red-500 stroke-red-500' : ''}`} />
                        <span>{thread.likes || 0}</span>
                    </button>
                    <button
                        onClick={toggleComments}
                        className={`flex items-center gap-1.5 py-1 text-[13px] font-medium transition-all ${isCommentsExpanded
                            ? 'text-amber-600 dark:text-gold font-semibold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span>{replies.length} Discussion</span>
                    </button>
                    <button 
                        onClick={() => setShowShare(true)}
                        className="flex items-center justify-center p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all ml-auto"
                        title="Share thread"
                    >
                        <Share2 className="w-[18px] h-[18px] transition-transform duration-200 active:scale-115" />
                    </button>
                </div>
            </div>

            {/* ==================== REPLIES SECTION — shown when isCommentsExpanded is true ==================== */}
            {isCommentsExpanded && (
                <div id="comments-section-header" className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] shadow-sm overflow-hidden mb-8 animate-fadeIn">
                    {/* Section Header */}
                    <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-gold/10 flex items-center justify-center text-amber-500 dark:text-gold flex-shrink-0">
                            <MessageCircle className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white font-serif">
                            Most relevant discussions
                            <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1.5">({replies.length})</span>
                        </h3>
                    </div>

                    {/* Reply Composer */}
                    <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5">
                        <div className="flex gap-3">
                            <Avatar name={currentUser?.displayName || 'Me'} src={currentUser?.avatar} size="md" className="w-9 h-9 flex-shrink-0" />
                            <div className="flex-1">
                                <textarea
                                    id="reply-textarea"
                                    value={replyContent}
                                    onChange={e => setReplyContent(e.target.value)}
                                    placeholder="What's your point of view?"
                                    rows={2}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:outline-none resize-none text-sm transition-all"
                                />
                                <div className="mt-2.5 flex justify-end">
                                    <button
                                        onClick={handleReply}
                                        disabled={!replyContent.trim() || isReplying || createPost.isPending}
                                        className="px-5 py-2 rounded-full text-xs font-bold bg-[#fee2bb] dark:bg-gold/20 text-[#b57a2b] dark:text-gold hover:bg-[#fddaa0] dark:hover:bg-gold/30 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
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
                                                    <><ChevronDown className="w-3.5 h-3.5" /> View {currentChildren.length} more {currentChildren.length === 1 ? 'reply' : 'replies'}</>
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
                                    <div className="w-10 h-10 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                                        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24">
                                            <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 1.89.5 3.63 1.39 5.16L2 22l5.07-1.32c1.47.8 3.12 1.26 4.88 1.26 5.5 0 9.99-4.5 9.99-10S17.49 2 12.004 2z" fill="#25D366" />
                                            <path d="M17.3 14.86c-.287-.144-1.702-.84-1.965-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-2.844-1.417-4.66-2.56-6.137-5.099-.136-.233-.036-.37.07-.487.165-.183.33-.298.485-.434.15-.132.227-.225.32-.397.094-.173.048-.337-.024-.481-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.49-.168-.008-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.192 2.032 3.102 4.921 4.348 2.889 1.246 2.889.83 3.4.78.513-.05 1.703-.696 1.943-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.192-.552-.336z" fill="white" />
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
                </>
            , document.body)}
        </div>
    );
}

export default { CommunityForum, ThreadView };
