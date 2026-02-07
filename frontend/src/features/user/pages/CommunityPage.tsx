/**
 * Community Forum Page for User Dashboard
 * Browse and participate in forum discussions
 */

import { useState } from 'react';
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
    Filter
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input, Badge, Tabs, Avatar } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useForumCategories, useForumThreads, useTrendingThreads, useCreateThread } from '../../../hooks/useForum';
import { useAuthStore } from '../../../stores/useAuthStore';
import { extractArray } from '../../../lib/utils';

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
                        src={thread.author?.avatarUrl}
                        name={thread.author?.displayName || 'User'}
                        size="md"
                        className="w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                            {thread.isPinned && (
                                <Badge variant="warning" className="flex items-center gap-1 scale-90 sm:scale-100 origin-left">
                                    <Pin className="w-3 h-3" /> <span className="hidden sm:inline">Pinned</span>
                                </Badge>
                            )}
                            {thread.isFeatured && (
                                <Badge variant="gold" className="flex items-center gap-1 scale-90 sm:scale-100 origin-left">
                                    <Award className="w-3 h-3" /> <span className="hidden sm:inline">Featured</span>
                                </Badge>
                            )}
                            <Badge variant="default" size="sm" className="scale-90 sm:scale-100 origin-left">
                                {thread.category?.name || 'General'}
                            </Badge>
                        </div>
                        <h3 className="font-medium text-theme-text group-hover:text-gold line-clamp-1 text-sm sm:text-base">
                            {thread.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-theme-muted line-clamp-2 mt-1">{thread.content}</p>
                        <div className="flex items-center gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-theme-muted">
                            <span className="font-medium text-theme-text truncate max-w-[80px] sm:max-w-none">
                                {thread.author?.displayName || 'Anonymous'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTime(thread.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {thread.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {thread.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {thread.replyCount || 0}
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

    const createThread = useCreateThread();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createThread.mutate({
            categoryId,
            title,
            content,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }, {
            onSuccess: () => {
                onClose();
                setTitle('');
                setContent('');
                setCategoryId('');
                setTags('');
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card variant="elevated" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <CardHeader title="Create New Discussion" />
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1">Category</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full p-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text focus:ring-2 focus:ring-gold focus:border-transparent"
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's your discussion about?"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1">Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your thoughts..."
                                rows={5}
                                className="w-full p-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-1">Tags (comma separated)</label>
                            <Input
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="art, digital, nft"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="gold"
                                className="flex-1"
                                disabled={createThread.isPending}
                            >
                                {createThread.isPending ? 'Creating...' : 'Create Discussion'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
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
    const categories = extractArray(categoriesData);
    const threads = extractArray(threadsData);
    const trendingThreads = extractArray(trendingData);

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
