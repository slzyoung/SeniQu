/**
 * Community Forum Page for User Dashboard
 * Browse and participate in forum discussions
 */

import React, { useState, useRef } from 'react';
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
    Award,
    Filter,
    Image as ImageIcon,
    Video,
    X
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input, Badge, Tabs, Avatar } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useForumCategories, useForumThreads, useTrendingThreads, useCreateThread } from '../../../hooks/useForum';
import { useAuthStore } from '../../../stores/useAuthStore';
import { extractArray } from '../../../lib/utils';
import { uploadFile } from '../../../lib/api';
import { useToast } from '../../../stores/useNotificationStore';

// ============================================
// TYPES
// ============================================

type SortBy = 'latest' | 'popular' | 'views';

// ============================================
// COMPONENTS
// ============================================

function ThreadCard({ thread }: { thread: any }) {
    const navigate = useNavigate();

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <Card
            variant="default"
            hover
            className="cursor-pointer"
            onClick={() => navigate(`/community/thread/${thread.id}`)}
        >
            <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                    <Avatar
                        src={thread.author?.avatar_url || thread.author?.avatarUrl}
                        name={thread.author?.display_name || thread.author?.displayName || 'User'}
                        size="md"
                        className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 border-2 border-gold/10"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {(thread.is_pinned || thread.isPinned) && (
                                <Badge variant="warning" className="flex items-center gap-1 scale-90 sm:scale-100 origin-left">
                                    <Pin className="w-3 h-3" /> <span className="hidden sm:inline">Pinned</span>
                                </Badge>
                            )}
                            {(thread.is_featured || thread.isFeatured) && (
                                <Badge variant="gold" className="flex items-center gap-1 scale-90 sm:scale-100 origin-left">
                                    <Award className="w-3 h-3" /> <span className="hidden sm:inline">Featured</span>
                                </Badge>
                            )}
                            <Badge variant="default" size="sm" className="scale-90 sm:scale-100 origin-left">
                                {thread.category?.name || 'General'}
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-lg text-theme-text group-hover:text-gold transition-colors line-clamp-2">
                            {thread.title}
                        </h3>
                        <p className="text-sm text-theme-muted line-clamp-3 mt-1.5 leading-relaxed">{thread.content}</p>
                        
                        {/* Media Preview Thumbnail */}
                        {(thread.media_url || thread.mediaUrl) && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-theme-border/20 h-36 sm:h-44 relative">
                                {(thread.media_type || thread.mediaType) === 'video' ? (
                                    <video src={thread.media_url || thread.mediaUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={thread.media_url || thread.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" loading="lazy" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                            </div>
                        )}
                        <div className="flex items-center gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-theme-muted">
                            <span className="font-medium text-theme-text truncate max-w-[80px] sm:max-w-none">
                                {thread.author?.display_name || thread.author?.displayName || 'Anonymous'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTime(thread.created_at || thread.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {thread.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {thread.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {thread.reply_count || thread.replyCount || 0}
                            </span>
                        </div>
                        {thread.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {thread.tags.slice(0, 3).map((tag: string, index: number) => (
                                    <Badge key={index} variant="default" size="sm" className="scale-90 sm:scale-100 origin-left">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

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
                mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                const uploadResult = await uploadFile(file, 'general');
                mediaUrl = uploadResult.url;
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
                    setFile(null);
                }
            });
        } catch (error: any) {
            toast.error('Upload Failed', error.message || 'Could not upload media.');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <Card variant="elevated" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-theme-background border-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.15)] rounded-2xl relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 text-theme-muted hover:text-gold transition-colors z-10 bg-theme-surface p-2 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-serif font-bold text-gold-hologram mb-6">Create New Discussion</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                            <label className="block text-sm font-medium text-theme-text mb-1.5 pl-1">Category <span className="text-red-500">*</span></label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-theme-border/70 text-white focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all appearance-none pr-10 shadow-inner"
                                required
                            >
                                <option value="" disabled className="text-gray-500">Select an appropriate category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id} className="bg-[#121212] text-white py-2">{cat.name}</option>
                                ))}
                            </select>
                            <div className="absolute top-[38px] right-4 pointer-events-none text-theme-muted">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1.5 pl-1">Title <span className="text-red-500">*</span></label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's your discussion about?"
                                className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-theme-border/70 text-white placeholder-gray-500 focus:ring-gold/50 focus:border-gold"
                                required
                                minLength={5}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1.5 pl-1">Content <span className="text-red-500">*</span></label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Detail your thoughts, ask questions, or share insights..."
                                rows={6}
                                className="w-full p-4 rounded-xl bg-[#0a0a0a] border border-theme-border/70 text-white placeholder-gray-500 focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none shadow-inner"
                                required
                                minLength={10}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-2 pl-1">Attach Media (Optional)</label>
                            {file ? (
                                <div className="flex items-center justify-between gap-4 bg-theme-surface/80 p-3 rounded-xl border border-gold/30 shadow-sm animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {file.type.startsWith('video/') ? 
                                            <div className="p-2 bg-blue-500/10 rounded-lg"><Video className="text-blue-400 w-5 h-5" /></div> : 
                                            <div className="p-2 bg-pink-500/10 rounded-lg"><ImageIcon className="text-pink-400 w-5 h-5" /></div>
                                        }
                                        <span className="text-sm font-medium text-theme-text truncate flex-1">{file.name}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg">
                                        <X className="w-4 h-4 mr-1" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        leftIcon={<ImageIcon className="w-4 h-4 text-gold" />}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-6 border-dashed border-2 hover:border-gold hover:bg-gold/5 transition-all text-theme-muted hover:text-theme-text"
                                    >
                                        Upload Poster, Image, or Video
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

                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1.5 pl-1">Tags (Optional)</label>
                            <Input
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="e.g. art, digital, nft, exhibition (comma separated)"
                                className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-theme-border/70 text-white placeholder-gray-500 focus:ring-gold/50 focus:border-gold"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-4 pt-6 border-t border-theme-border/50 mt-8">
                            <Button type="button" variant="ghost" onClick={onClose} className="px-6 rounded-xl hover:bg-theme-surface">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="gold"
                                className="px-8 rounded-xl shadow-lg shadow-gold/20"
                                isLoading={isUploading || createThread.isPending}
                            >
                                {isUploading ? 'Uploading Media...' : createThread.isPending ? 'Posting...' : '🚀 Post Discussion'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
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

    // Tab configuration
    const tabs = [
        { id: 'latest', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
        { id: 'popular', label: 'Popular', icon: <Heart className="w-4 h-4" /> },
        { id: 'views', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
    ];

    // Queries
    const { data: categoriesData, isLoading: categoriesLoading } = useForumCategories();
    const { data: threadsData, isLoading: threadsLoading } = useForumThreads({
        ...filters,
        sortBy,
    });
    const { data: trendingData } = useTrendingThreads(5);

    // Use extractArray for safe data extraction
    const fetchedCategories = extractArray(categoriesData);
    const threads = extractArray(threadsData);
    const trendingThreads = extractArray(trendingData);
    
    // Robust fallback categories for enterprise-grade safe UI
    const defaultCategories = [
        { id: 'bc5c6d36-8aed-4fd3-9b6f-7d1c67d710f1', name: 'Museums & Galleries', icon: '🏛️' },
        { id: 'd2ea67f9-3d57-4180-a681-37faba49fb42', name: 'Cultural Heritage & Sites', icon: '🏺' },
        { id: 'e1c9a173-6a9b-4e08-912c-0e868a2cbbe1', name: 'Traditional to Digital Arts', icon: '🎨' },
        { id: 'f875dc91-3b7c-48c4-b778-90f77ea6bbcd', name: 'AI & Tech Innovations', icon: '🤖' },
        { id: 'a571c482-5d9c-4b36-9b8e-32b0051e4590', name: 'Community Hub & Announcements', icon: '📢' }
    ];

    const categories = fetchedCategories.length > 0 ? fetchedCategories : defaultCategories;

    return (
        <PageContainer
            title="Community Forum"
            description="Join discussions with art enthusiasts and collectors"
            actions={
                isAuthenticated && (
                    <Button
                        variant="gold"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span className="hidden sm:inline">New Discussion</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                )
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Search */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                            <Input
                                placeholder="Search discussions..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                            Filters
                        </Button>
                    </div>

                    {/* Mobile Categories (Horizontal Scroll) */}
                    <div className="lg:hidden w-full overflow-x-auto pb-2 hide-scrollbar">
                        <div className="flex gap-2">
                            <Button
                                variant={filters.categoryId ? 'outline' : 'gold'}
                                size="sm"
                                className="whitespace-nowrap rounded-full"
                                onClick={() => setFilters(prev => ({ ...prev, categoryId: undefined }))}
                            >
                                All
                            </Button>
                            {categories?.map((category: any) => (
                                <Button
                                    key={category.id}
                                    variant={filters.categoryId === category.id ? 'gold' : 'outline'}
                                    size="sm"
                                    className="whitespace-nowrap rounded-full"
                                    onClick={() => setFilters(prev => ({ ...prev, categoryId: category.id }))}
                                >
                                    {category.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs
                        tabs={tabs}
                        activeTab={sortBy}
                        onChange={(tabId) => setSortBy(tabId as SortBy)}
                        variant="pills"
                    />

                    {/* Threads */}
                    {threadsLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-gold animate-spin" />
                        </div>
                    ) : threads.length === 0 ? (
                        <Card variant="elevated" className="text-center py-16">
                            <MessageSquare className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-theme-text mb-2">No discussions yet</h3>
                            <p className="text-theme-muted mb-4">Be the first to start a conversation!</p>
                            {isAuthenticated && (
                                <Button variant="gold" onClick={() => setShowCreateModal(true)}>
                                    Start Discussion
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {threads.map((thread: any) => (
                                <ThreadCard key={thread.id} thread={thread} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {threadsData?.meta && threadsData.meta.totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="ghost"
                                disabled={filters.page === 1}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-4 text-theme-muted">
                                Page {filters.page} of {threadsData.meta.totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                disabled={filters.page >= threadsData.meta.totalPages}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Categories - Hidden on mobile as we have the horizontal scroll above */}
                    <Card variant="elevated" className="hidden lg:block">
                        <CardHeader title="Categories" />
                        <CardContent className="space-y-2">
                            {categoriesLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                                </div>
                            ) : categories?.length === 0 ? (
                                <p className="text-sm text-theme-muted text-center py-4">No categories</p>
                            ) : (
                                categories?.slice(0, 5).map((category: any) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-theme-elevated cursor-pointer transition-colors"
                                        onClick={() => setFilters(prev => ({ ...prev, categoryId: category.id }))}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>{category.icon || '💬'}</span>
                                            <span className="text-sm text-theme-text">{category.name}</span>
                                        </span>
                                        <Badge variant="default" size="sm">{category.threadCount || 0}</Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Trending */}
                    <Card variant="elevated">
                        <CardHeader title="Trending Now" />
                        <CardContent className="space-y-3">
                            {trendingThreads?.length === 0 ? (
                                <p className="text-sm text-theme-muted text-center py-4">No trending topics</p>
                            ) : (
                                trendingThreads?.slice(0, 5).map((thread: any, index: number) => (
                                    <div
                                        key={thread.id}
                                        className="flex items-start gap-3 cursor-pointer hover:bg-theme-elevated p-2 rounded-lg transition-colors"
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
                                    >
                                        <span className="text-lg font-bold text-gold">{index + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-theme-text line-clamp-2">{thread.title}</p>
                                            <p className="text-xs text-theme-muted mt-1">
                                                {thread.replyCount || 0} replies
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

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
