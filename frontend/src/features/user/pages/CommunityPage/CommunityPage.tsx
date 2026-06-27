/**
 * Community Forum Page for User Dashboard
 * Premium editorial "The Curator" style design
 * Mobile-first, iOS/Android safe, Light/Dark mode
 */

import React, { useState, useRef, useMemo } from 'react';
import {
    Search,
    MessageSquare,
    Plus,
    TrendingUp,
    Clock,
    Eye,
    Heart,
    MessageCircle,
    Loader2,
    Pin,
    Image as ImageIcon,
    X,
    Film,
    AlertTriangle,
    Play,
    Trash2,
    Layers,
    Grid,
} from 'lucide-react';
import { PageContainer } from '../../../../components/common/DashboardLayout';
import { Button, Avatar } from '../../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useForumCategories, useForumThreads, useTrendingThreads, useCreateThread } from '../../../../hooks/useForum';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { extractArray, decodeHTML } from '../../../../lib/utils';
import { uploadFile } from '../../../../lib/api';
import { compressImage } from '../../../../lib/imageCompressor';
import { useToast } from '../../../../stores/useNotificationStore';
import { useDebounce } from '../../../../hooks/useDebounce';
import { validateVideo, formatFileSize, formatDuration, generateVideoThumbnail } from '../../../../lib/videoCompressor';
import { useUploadStore } from '../../../../stores/useUploadStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import './CommunityPage.css';

// ============================================
// TYPES
// ============================================

type SortBy = 'latest' | 'popular' | 'views';

// ============================================
// HELPER
// ============================================

function formatTime(dateStr: string) {
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
// FEATURED THREAD CARD
// ============================================

function FeaturedThreadCard({ thread, onClick }: { thread: any; onClick: () => void }) {
    const mediaUrl = thread.media_url || thread.mediaUrl;
    const mediaType = thread.media_type || thread.mediaType;
    const authorName = thread.author?.display_name || thread.author?.displayName || 'Anonymous';

    if (!mediaUrl) return null;

    return (
        <div className="forum-featured-card forum-animate-in" onClick={onClick}>
            {mediaType === 'video' ? (
                <video src={mediaUrl} muted className="w-full h-full object-cover" />
            ) : (
                <img src={mediaUrl} alt={thread.title} className="w-full h-full object-cover" loading="lazy" />
            )}
            <div className="featured-overlay">
                <div className="featured-badge">
                    Featured Discussion
                </div>
                <h3 className="featured-title">{decodeHTML(thread.title)}</h3>
                <div className="featured-meta">
                    <Avatar
                        name={authorName}
                        src={thread.author?.avatar_url || thread.author?.avatarUrl}
                        size="xs"
                        className="w-5 h-5"
                    />
                    <span>{authorName}</span>
                    <span>·</span>
                    <span>{formatTime(thread.created_at || thread.createdAt)}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// THREAD CARD — Editorial Style
// ============================================

function ThreadCard({ thread, index }: { thread: any; index: number }) {
    const navigate = useNavigate();
    const mediaUrl = thread.media_url || thread.mediaUrl;
    const mediaType = thread.media_type || thread.mediaType;
    const authorName = thread.author?.display_name || thread.author?.displayName || 'Anonymous';
    const categoryName = thread.category?.name || 'General';

    return (
        <div
            className="forum-thread-card forum-animate-in"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(`/community/thread/${thread.id}`)}
        >
            <div className="thread-content">
                <div className="thread-meta-top">
                    <Avatar
                        name={authorName}
                        src={thread.author?.avatar_url || thread.author?.avatarUrl}
                        size="xs"
                        className="w-5 h-5 flex-shrink-0"
                    />
                    <span className="font-medium" style={{ color: 'inherit' }}>{authorName}</span>
                    <span>·</span>
                    <span>{formatTime(thread.created_at || thread.createdAt)}</span>
                    {(thread.is_pinned || thread.isPinned) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                    )}
                </div>

                <h3 className="thread-title">{decodeHTML(thread.title)}</h3>

                {thread.content && (
                    <p className="thread-excerpt">{thread.content}</p>
                )}

                <div className="thread-stats">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                        {categoryName}
                    </span>
                    <span><Heart className="w-3 h-3" />{thread.likes || 0}</span>
                    <span><MessageCircle className="w-3 h-3" />{thread.reply_count || thread.replyCount || 0}</span>
                    <span><Eye className="w-3 h-3" />{thread.views || 0}</span>
                </div>
            </div>

            {mediaUrl && (
                <div className="thread-thumbnail">
                    {mediaType === 'video' ? (
                        <video src={mediaUrl} muted className="w-full h-full object-cover" />
                    ) : (
                        <img src={mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// CREATE THREAD MODAL
// ============================================

function CreateThreadModal({
    isOpen,
    onClose,
    categories
}: {
    isOpen: boolean;
    onClose: () => void;
    categories: any[];
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState('');

    // Multiple Files and Layouts states
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
    const [muteVideoSound, setMuteVideoSound] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const createThread = useCreateThread();
    const toast = useToast();
    const addUpload = useUploadStore(state => state.addUpload);

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
                maxFileSize: 200 * 1024 * 1024, // 200MB (to support 150MB securely)
                maxDuration: 60, // 1 minute
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

            const combinedFiles = [...currentImageFiles, ...selectedFiles].slice(0, 5); // Limit to 5 images
            if (currentImageFiles.length + selectedFiles.length > 5) {
                setValidationWarning('Maximum 5 images allowed. Only the first 5 were added.');
            }

            const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
            const combinedPreviews = [...currentPreviews, ...newPreviews].slice(0, 5);

            setMediaPreviews(combinedPreviews);
            setFiles(combinedFiles);
        }

        // Reset input element value to allow selecting same file again
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
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
            setMuteVideoSound(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();

        if (!title || !content || !categoryId) {
            toast.error('Required Fields', 'Please fill in title, content, and category.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);
            let mediaUrl: string | undefined = undefined;
            let mediaType: string | undefined = undefined;

            if (files.length > 0) {
                const firstFile = files[0];
                if (firstFile.type.startsWith('video/')) {
                    const taskId = 'forum-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

                    addUpload({
                        id: taskId,
                        type: 'forum',
                        fileName: firstFile.name,
                        fileSize: firstFile.size,
                        file: firstFile,
                        caption: title,
                        forumOptions: {
                            title,
                            content,
                            categoryId,
                            selectedAspect,
                            selectedSize,
                            tags: [],
                        },
                        thumbnailUrl: mediaPreviews[0] || undefined,
                    });

                    toast.success(
                        'Mengunggah di Latar Belakang',
                        'Video forum Anda sedang diunggah di latar belakang. Thread akan otomatis dibuat setelah upload selesai.'
                    );

                    onClose();
                    return;
                } else {
                    // === IMAGE ===
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

            createThread.mutate({
                categoryId,
                title,
                content,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                mediaUrl,
                mediaType
            }, {
                onSuccess: () => {
                    toast.success('Discussion Created', 'Your discussion has been posted successfully.');
                    onClose();
                    setTitle('');
                    setContent('');
                    setCategoryId('');
                    setTags('');
                    setFiles([]);
                    setMediaPreviews([]);
                    setVideoMeta(null);
                    setUploadPhase('idle');
                }
            });
        } catch (error: any) {
            console.error('Thread creation error:', error);
            toast.error('Upload Failed', error.message || 'Could not upload media.');
            setUploadPhase('idle');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            {/* Mobile: bottom sheet | Desktop: centered modal */}
            <div
                className="w-full md:max-w-2xl md:mx-4 bg-white dark:bg-[#151515] md:rounded-2xl rounded-t-2xl md:rounded-b-2xl border-t md:border border-gray-200/60 dark:border-white/[0.08] shadow-2xl overflow-hidden"
                style={{ maxHeight: '92vh', animation: 'forum-fadeInUp 0.25s ease-out' }}
            >
                {/* Handle bar — mobile only */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/15" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-3 md:pt-5 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                    <div>
                        <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white">New Discussion</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Share your thoughts</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 140px)' }}>
                    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                        {/* Category + Title in a row on desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Category *</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 transition-all text-sm outline-none appearance-none"
                                    required
                                >
                                    <option value="" disabled>Select category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Tags</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="art, digital, classic"
                                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 transition-all text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's your discussion about?"
                                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 transition-all text-sm outline-none"
                                required
                                minLength={5}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Content *</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Detail your thoughts, ask questions, or share insights..."
                                rows={4}
                                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 dark:focus:border-gold focus:ring-1 focus:ring-amber-500/20 transition-all resize-none text-sm outline-none"
                                required
                                minLength={10}
                            />
                        </div>

                        {/* Multiple Image / Video attach selector and preview */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Attach Media</label>

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
                                                <AnimatePresence initial={false}>
                                                    {mediaPreviews.map((url, idx) => (
                                                        <motion.div
                                                            key={url}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                                                            layout
                                                            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-black/20 group"
                                                        >
                                                            <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFile(idx)}
                                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-all shadow-md"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                                {/* Add more slot */}
                                                {mediaPreviews.length < 5 && (
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

                                    {/* Mute Audio Option for Videos */}
                                    {isVideo && (
                                        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/5">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={muteVideoSound}
                                                    onChange={e => setMuteVideoSound(e.target.checked)}
                                                    className="w-4.5 h-4.5 accent-amber-500 rounded border-gray-200 dark:border-white/10 focus:ring-amber-500 dark:focus:ring-gold bg-white dark:bg-[#151515]"
                                                />
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    Mute original sound from this video (silent video)
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-pink-400 dark:hover:border-pink-500/40 hover:text-pink-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <ImageIcon className="w-5 h-5" />
                                        <span className="font-semibold">Image</span>
                                        <span className="text-[10px] opacity-60">Max 5 Images</span>
                                    </button>
                                    <button type="button" onClick={() => videoInputRef.current?.click()}
                                        className="py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500/40 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-1.5 text-xs">
                                        <Film className="w-5 h-5" />
                                        <span className="font-semibold">Video</span>
                                        <span className="text-[10px] opacity-60">Max 1 min · 200MB</span>
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

                        {/* Premium Upload Progress Bar */}
                        {isUploading && (
                            <div className="mt-4 p-5 rounded-2xl bg-amber-500/5 dark:bg-[#1f1a10] border border-amber-500/20 flex flex-col space-y-4 relative overflow-hidden backdrop-blur-md">
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 animate-pulse" />

                                <div className="relative z-10 flex items-start gap-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 flex-shrink-0 flex items-center justify-center shadow-inner">
                                        {uploadPhase === 'uploading' && (
                                            isVideo ? <Film className="w-6 h-6 animate-pulse" /> : <ImageIcon className="w-6 h-6 animate-pulse" />
                                        )}
                                        {uploadPhase === 'compressing' && <Loader2 className="w-6 h-6 animate-spin" />}
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

                                <div className="relative z-10 w-full font-sans">
                                    <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px] border border-gray-200/20 dark:border-white/5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${uploadPhase === 'done' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-500 via-[#C9A84C] to-[#E5C158] shadow-[0_0_8px_rgba(201,168,76,0.25)]'
                                                }`}
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Sticky footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-[#151515]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading || createThread.isPending || !title || !content || !categoryId}
                        className="px-6 py-2.5 rounded-full text-sm font-bold text-charcoal disabled:opacity-40 transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #C9A84C, #B08D57)', boxShadow: '0 2px 12px rgba(201,168,76,0.3)' }}
                    >
                        {isUploading ? 'Uploading...' : createThread.isPending ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CommunityPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [sortBy, setSortBy] = useState<SortBy>('latest');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        categoryId: undefined as string | undefined,
    });

    // Queries
    const { data: categoriesData } = useForumCategories();
    const { data: threadsData, isLoading: threadsLoading } = useForumThreads({
        ...filters,
        sortBy,
    });
    const { data: trendingData } = useTrendingThreads(5);

    const fetchedCategories = extractArray(categoriesData);
    const threads = extractArray(threadsData);
    const trendingThreads = extractArray(trendingData);

    // Robust fallback categories
    const defaultCategories = [
        { id: 'bc5c6d36-8aed-4fd3-9b6f-7d1c67d710f1', name: 'Museums & Galleries', icon: '🏛️' },
        { id: 'd2ea67f9-3d57-4180-a681-37faba49fb42', name: 'Cultural Heritage', icon: '🏺' },
        { id: 'e1c9a173-6a9b-4e08-912c-0e868a2cbbe1', name: 'Traditional to Digital', icon: '🎨' },
        { id: 'f875dc91-3b7c-48c4-b778-90f77ea6bbcd', name: 'AI & Tech', icon: '🤖' },
        { id: 'a571c482-5d9c-4b36-9b8e-32b0051e4590', name: 'Announcements', icon: '📢' }
    ];

    const categories = fetchedCategories.length > 0 ? fetchedCategories : defaultCategories;

    // Apply anti-throttling (debounce) to search query
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Filter and compute featured/regular threads efficiently
    const { featuredThread, regularThreads } = useMemo<{ featuredThread: any | null, regularThreads: any[] }>(() => {
        // First filter all threads based on search
        const filteredThreads = threads.filter((thread: any) =>
            !debouncedSearch ||
            (thread.title && thread.title.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (thread.content && thread.content.toLowerCase().includes(debouncedSearch.toLowerCase()))
        );

        // Find featured thread (first one with media)
        const featured = filteredThreads.find((t: any) => t.media_url || t.mediaUrl || t.is_featured || t.isFeatured) || null;
        const regular = filteredThreads.filter((t: any) => t !== featured);

        return { featuredThread: featured, regularThreads: regular };
    }, [threads, debouncedSearch]);

    // Sort tabs config
    const sortTabs = [
        { id: 'latest' as SortBy, label: 'Latest', icon: <Clock className="w-3.5 h-3.5" /> },
        { id: 'popular' as SortBy, label: 'Popular', icon: <Heart className="w-3.5 h-3.5" /> },
        { id: 'views' as SortBy, label: 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];

    return (
        <PageContainer
            title=""
            className=""
        >
            {/* ==================== HERO SECTION ==================== */}
            <div className="forum-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
                        <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber-400/70 font-semibold">The Curator</span>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
                    </div>
                    <h1 className="forum-hero-title">
                        Voices of the <span className="accent">Atelier</span>
                    </h1>
                    <p className="forum-hero-subtitle">
                        Join the global dialogue on art, heritage, and the contemporary pulse of creativity.
                    </p>

                    {/* Search */}
                    <div className="forum-search-wrap">
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none', zIndex: 2 }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search discussions..."
                            style={{ position: 'relative', zIndex: 1 }}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== CATEGORY PILLS ==================== */}
            <div className="forum-category-pills mb-5">
                <button
                    className={`forum-category-pill ${!filters.categoryId ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: undefined, page: 1 }))}
                >
                    All
                </button>
                {categories.map((cat: any) => (
                    <button
                        key={cat.id}
                        className={`forum-category-pill ${filters.categoryId === cat.id ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, categoryId: cat.id, page: 1 }))}
                    >
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* ==================== MAIN GRID ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* ---- Main Column ---- */}
                <div className="lg:col-span-2">
                    {/* Sort Tabs — ABOVE featured card */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06] mb-4 w-fit">
                        {sortTabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${sortBy === tab.id
                                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                onClick={() => setSortBy(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Section Label */}
                    <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 dark:text-gray-500 mb-3 pl-0.5">
                        {sortBy === 'latest' ? 'Recent Discussions' : sortBy === 'popular' ? 'Popular Discussions' : 'Trending Now'}
                    </div>

                    {/* Featured Card */}
                    {featuredThread && (
                        <FeaturedThreadCard
                            thread={featuredThread}
                            onClick={() => navigate(`/community/thread/${featuredThread.id}`)}
                        />
                    )}

                    {/* Thread List */}
                    {threadsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-7 h-7 text-amber-500 dark:text-gold animate-spin" />
                        </div>
                    ) : regularThreads.length === 0 && !featuredThread ? (
                        <div className="forum-empty-state">
                            <MessageSquare className="empty-icon" />
                            <h3>No discussions yet</h3>
                            <p>Be the first to spark a conversation in the community.</p>
                            {isAuthenticated && (
                                <Button variant="gold" className="mt-4 rounded-full px-6" onClick={() => setShowCreateModal(true)}>
                                    Start Discussion
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div>
                            {regularThreads.map((thread: any, idx: number) => (
                                <ThreadCard key={thread.id} thread={thread} index={idx} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {threadsData?.meta && threadsData.meta.totalPages > 1 && (
                        <div className="forum-pagination">
                            <button
                                disabled={filters.page === 1}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <span className="page-info">
                                Page {filters.page} of {threadsData.meta.totalPages}
                            </span>
                            <button
                                disabled={filters.page >= threadsData.meta.totalPages}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* ---- Sidebar — Desktop Only ---- */}
                <div className="hidden lg:block space-y-6">
                    {/* Desktop Categories */}
                    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] p-5">
                        <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white mb-4">Categories</h3>
                        <div className="space-y-0.5">
                            <div
                                className={`forum-sidebar-category ${!filters.categoryId ? 'active' : ''}`}
                                onClick={() => setFilters(prev => ({ ...prev, categoryId: undefined, page: 1 }))}
                            >
                                <span className="flex items-center gap-2">
                                    <span>💬</span>
                                    <span>All Topics</span>
                                </span>
                            </div>
                            {categories.map((cat: any) => (
                                <div
                                    key={cat.id}
                                    className={`forum-sidebar-category ${filters.categoryId === cat.id ? 'active' : ''}`}
                                    onClick={() => setFilters(prev => ({ ...prev, categoryId: cat.id, page: 1 }))}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{cat.icon || '💬'}</span>
                                        <span>{cat.name}</span>
                                    </span>
                                    {(cat.threadCount || 0) > 0 && (
                                        <span className="cat-count">{cat.threadCount}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trending — Desktop Only */}
                    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] p-5">
                        <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white mb-3">Trending</h3>
                        {trendingThreads?.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No trending topics</p>
                        ) : (
                            <div className="space-y-0.5">
                                {trendingThreads?.slice(0, 5).map((thread: any, index: number) => (
                                    <div
                                        key={thread.id}
                                        className="forum-trending-item"
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
                                    >
                                        <span className="trending-rank">{index + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="trending-title">{decodeHTML(thread.title)}</p>
                                            <p className="trending-replies">{thread.replyCount || 0} replies</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Community Stats — Desktop Only */}
                    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] p-5">
                        <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white mb-4">Community</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Total Discussions</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{threads.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Categories</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{categories.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Trending Today</span>
                                <span className="font-semibold text-amber-600 dark:text-gold">{trendingThreads?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== FAB — All Screens ==================== */}
            {isAuthenticated && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="fixed z-50 flex items-center gap-2 px-5 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-charcoal shadow-xl transition-all active:scale-95 hover:shadow-2xl hover:-translate-y-0.5"
                    style={{
                        background: 'linear-gradient(135deg, #C9A84C, #B08D57)',
                        boxShadow: '0 4px 20px rgba(201,168,76,0.4), 0 2px 8px rgba(0,0,0,0.15)',
                        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                        right: '1.25rem',
                    }}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Discussion</span>
                    <span className="sm:hidden">New</span>
                </button>
            )}

            {/* Create Thread Modal */}
            <CreateThreadModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                categories={categories || []}
            />
        </PageContainer>
    );
}

export default CommunityPage;

