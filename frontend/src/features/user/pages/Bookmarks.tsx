/**
 * Bookmarks Page
 * Uses real API data with useBookmarks hook
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, Heart, Trash2, Filter, Search, Loader2, Image as ImageIcon } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useBookmarks, useRemoveBookmark } from '../../../hooks/useUser';
import { extractArray, extractPagination } from '../../../lib/utils';

interface BookmarkedArtwork {
    id: string;
    artworkId: string;
    title: string;
    artist: string;
    image: string;
    museum?: string;
    genre?: string;
    bookmarkedAt: string;
    isArt?: boolean;
}

function ArtworkGridCard({
    artwork,
    onRemove,
    onClick,
    isRemoving
}: {
    artwork: BookmarkedArtwork;
    onRemove: () => void;
    onClick: () => void;
    isRemoving?: boolean;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <Card variant="default" hover padding="none" className="group overflow-hidden cursor-pointer" onClick={onClick}>
                <div className="relative aspect-[4/3] bg-theme-elevated">
                    {artwork.image ? (
                        <img
                            src={artwork.image}
                            alt={artwork.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-theme-muted/40" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            {artwork.genre && (
                                <Badge variant="gold" className="text-xs">{artwork.genre}</Badge>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                disabled={isRemoving}
                                className="p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                            >
                                {isRemoving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    {artwork.isArt && (
                        <Badge variant="gold" className="absolute top-3 right-3">NFT</Badge>
                    )}
                </div>
                <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-theme-text truncate text-sm sm:text-base">{artwork.title}</h3>
                    <p className="text-xs sm:text-sm text-theme-muted truncate">{artwork.artist}</p>
                    {artwork.museum && (
                        <p className="text-xs text-theme-muted mt-1 truncate">{artwork.museum}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border">
                        <span className="text-xs text-theme-muted flex items-center gap-1">
                            <Heart className="w-3 h-3 text-pink-500" /> Saved {artwork.bookmarkedAt}
                        </span>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

function ArtworkListItem({
    artwork,
    onRemove,
    onClick,
    isRemoving
}: {
    artwork: BookmarkedArtwork;
    onRemove: () => void;
    onClick: () => void;
    isRemoving?: boolean;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <Card variant="default" className="group cursor-pointer" onClick={onClick}>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-theme-elevated">
                        {artwork.image ? (
                            <img
                                src={artwork.image}
                                alt={artwork.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-theme-muted/40" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-theme-text truncate text-sm sm:text-base">{artwork.title}</h3>
                            {artwork.isArt && <Badge variant="gold" size="sm">NFT</Badge>}
                        </div>
                        <p className="text-xs sm:text-sm text-theme-muted truncate">{artwork.artist}</p>
                        <div className="flex items-center gap-3 mt-1">
                            {artwork.museum && (
                                <span className="text-xs text-theme-muted truncate">{artwork.museum}</span>
                            )}
                            {artwork.genre && (
                                <>
                                    <span className="text-xs text-theme-muted hidden sm:inline">•</span>
                                    <Badge variant="default" size="sm" className="hidden sm:inline-flex">{artwork.genre}</Badge>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-theme-muted whitespace-nowrap hidden sm:block">
                            {artwork.bookmarkedAt}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            disabled={isRemoving}
                            className="p-2 text-theme-muted hover:text-red-500 hover:bg-theme-elevated rounded-lg transition-colors"
                        >
                            {isRemoving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

export function Bookmarks() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Real data hooks
    const { data: bookmarksData, isLoading } = useBookmarks(page, 20);
    const removeBookmark = useRemoveBookmark();

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Transform API data to component format (use extractArray for robust extraction)
    const rawBookmarks = extractArray(bookmarksData);
    const pagination = extractPagination(bookmarksData);
    const bookmarks: BookmarkedArtwork[] = rawBookmarks.map((b: any) => ({
        id: b.id,
        artworkId: b.artworkId,
        title: b.artwork?.title || 'Untitled',
        artist: b.artwork?.artist?.displayName || 'Unknown Artist',
        image: b.artwork?.imageUrl || b.artwork?.image_url || '',
        museum: b.artwork?.museum?.name || b.artwork?.institution?.name,
        genre: b.artwork?.category,
        bookmarkedAt: b.createdAt ? formatRelativeTime(b.createdAt) : 'Recently',
        isArt: b.artwork?.isArt,
    }));

    const handleRemove = async (id: string) => {
        setRemovingId(id);
        try {
            await removeBookmark.mutateAsync(id);
        } finally {
            setRemovingId(null);
        }
    };

    const filteredBookmarks = bookmarks.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer
            title="Bookmarks"
            description={`${pagination.total || bookmarks.length} saved artworks`}
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                            ? 'bg-gold/10 text-gold'
                            : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated'
                            }`}
                    >
                        <Grid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                            ? 'bg-gold/10 text-gold'
                            : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated'
                            }`}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            }
        >
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bookmarks..."
                        className="w-full pl-10 pr-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                    />
                </div>
                <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
                    <span className="hidden sm:inline">Filter</span>
                </Button>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                    <p className="text-theme-muted">Loading bookmarks...</p>
                </div>
            ) : filteredBookmarks.length === 0 ? (
                <Card variant="elevated" className="text-center py-12">
                    <Heart className="w-12 h-12 text-theme-muted mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">No bookmarks yet</h3>
                    <p className="text-theme-muted mb-4">Start exploring and save artworks you love</p>
                    <Button variant="primary" onClick={() => navigate('/gallery')}>Explore Gallery</Button>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredBookmarks.map((artwork) => (
                        <ArtworkGridCard
                            key={artwork.id}
                            artwork={artwork}
                            onRemove={() => handleRemove(artwork.id)}
                            onClick={() => navigate(`/artwork/${artwork.artworkId}`)}
                            isRemoving={removingId === artwork.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredBookmarks.map((artwork) => (
                        <ArtworkListItem
                            key={artwork.id}
                            artwork={artwork}
                            onRemove={() => handleRemove(artwork.id)}
                            onClick={() => navigate(`/artwork/${artwork.artworkId}`)}
                            isRemoving={removingId === artwork.id}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.total > 20 && (
                <div className="flex justify-center gap-2 mt-8">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-theme-muted">
                        Page {page} of {Math.ceil(pagination.total / 20)}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= Math.ceil(pagination.total / 20)}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}

export default Bookmarks;
