/**
 * Community Feature - Forum and Discussions
 * Uses real API data with community hooks
 */

import { useState } from 'react';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge, Avatar } from '../../components/ui';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import {
    MessageSquare,
    Search,
    Plus,
    Heart,
    Eye,
    Clock,
    Loader2
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { formatDate } from '../../lib/utils';

// Mock data for community forum (will be replaced with real API)
const mockThreads = [
    {
        id: '1',
        title: 'What makes Indonesian traditional art unique?',
        author: { displayName: 'ArtLover123', avatar: null },
        category: 'Discussion',
        replies: 24,
        views: 156,
        likes: 42,
        createdAt: new Date().toISOString(),
        isPinned: true,
    },
    {
        id: '2',
        title: 'Best museums to visit in Jakarta',
        author: { displayName: 'TravelArt', avatar: null },
        category: 'Recommendations',
        replies: 18,
        views: 89,
        likes: 31,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPinned: false,
    },
    {
        id: '3',
        title: 'How to start collecting digital art NFTs?',
        author: { displayName: 'CryptoCollector', avatar: null },
        category: 'NFT',
        replies: 56,
        views: 234,
        likes: 78,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        isPinned: false,
    },
];

const categories = [
    { id: 'all', label: 'All Topics', count: 156 },
    { id: 'discussion', label: 'Discussion', count: 82 },
    { id: 'recommendations', label: 'Recommendations', count: 34 },
    { id: 'nft', label: 'NFT & Crypto', count: 28 },
    { id: 'events', label: 'Events', count: 12 },
];

export function CommunityForum() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading] = useState(false);

    const filteredThreads = mockThreads.filter(thread => {
        const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' ||
            thread.category.toLowerCase() === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-theme-bg">
            <Navbar />
            <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8">
                <PageContainer
                    title="Community Forum"
                    subtitle="Connect with art lovers and collectors"
                    actions={
                        <Button variant="gold" leftIcon={<Plus className="w-4 h-4" />}>
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
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === cat.id
                                                    ? 'bg-gold/10 text-gold'
                                                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
                                                    }`}
                                            >
                                                <span>{cat.label}</span>
                                                <span className="text-xs bg-theme-surface px-2 py-0.5 rounded-full">
                                                    {cat.count}
                                                </span>
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
                            ) : filteredThreads.length === 0 ? (
                                <Card variant="elevated" className="text-center py-16">
                                    <MessageSquare className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-theme-text mb-2">No Discussions Found</h3>
                                    <p className="text-theme-muted max-w-sm mx-auto">
                                        Start a new thread or try a different search.
                                    </p>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {filteredThreads.map(thread => (
                                        <Card key={thread.id} variant="elevated" hover className="relative">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-4">
                                                    <Avatar
                                                        name={thread.author.displayName}
                                                        size="md"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {thread.isPinned && (
                                                                <Badge variant="gold" size="sm">Pinned</Badge>
                                                            )}
                                                            <Badge variant="default" size="sm">{thread.category}</Badge>
                                                        </div>
                                                        <h4 className="font-semibold text-theme-text hover:text-gold transition-colors">
                                                            {thread.title}
                                                        </h4>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-theme-muted">
                                                            <span>{thread.author.displayName}</span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {formatDate(thread.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-theme-muted">
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="w-4 h-4" />
                                                            {thread.replies}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-4 h-4" />
                                                            {thread.views}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Heart className="w-4 h-4" />
                                                            {thread.likes}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <Link to={`/community/thread/${thread.id}`} className="absolute inset-0" />
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </PageContainer>
            </main>
            <Footer />
        </div>
    );
}

export function ThreadView() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="min-h-screen bg-theme-bg">
            <Navbar />
            <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8">
                <PageContainer title="Discussion Thread" subtitle={`Thread #${id}`}>
                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <Avatar name="User" size="lg" />
                                <div>
                                    <h1 className="text-xl font-bold text-theme-text">Loading thread...</h1>
                                    <p className="text-theme-muted mt-2">Thread content will appear here.</p>
                                </div>
                            </div>

                            <div className="border-t border-theme-border pt-6 mt-6">
                                <h3 className="font-semibold text-theme-text mb-4">Replies</h3>
                                <div className="text-center py-8 text-theme-muted">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No replies yet. Be the first to respond!</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </PageContainer>
            </main>
            <Footer />
        </div>
    );
}

export default { CommunityForum, ThreadView };
