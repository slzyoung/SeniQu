import { useState } from 'react';
import {
    Search,
    Building2,
    Image,
    MapPin,
    Filter,
    Grid3X3,
    List,
    Heart,
    Eye,
    Loader2,
    Bookmark,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Input, Badge, Tabs } from '../../../components/ui';
import { GlowCard } from '../../../components/GlowCard';
import { useNavigate } from 'react-router-dom';
import { useMuseums } from '../../../hooks/useMuseums';
import { useArtworks } from '../../../hooks/useArtworks';
import { useAddBookmark } from '../../../hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

type ViewMode = 'grid' | 'list';
type TabValue = 'artworks' | 'museums';

// ============================================
// COMPONENTS
// ============================================

function ArtworkCard({
    artwork,
    viewMode,
    onBookmark,
    isBookmarked
}: {
    artwork: any;
    viewMode: ViewMode;
    onBookmark?: (id: string) => void;
    isBookmarked?: boolean;
}) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <GlowCard
                className={`cursor-pointer group overflow-hidden border border-theme-border hover:border-gold/30 ${viewMode === 'list' ? 'flex flex-row h-40' : 'flex flex-col h-full'}`}
                onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}
                glowColor="var(--text-gold)"
            >
                {/* Image Container */}
                <div className={viewMode === 'list' ? "w-40 h-full relative" : "aspect-[4/5] relative overflow-hidden"}>
                    <div className="absolute inset-0 bg-theme-surface animate-pulse" />
                    <img
                        src={artwork.imageUrl || artwork.images?.[0]?.url || '/placeholder-art.jpg'}
                        alt={artwork.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {artwork.isArt && (
                        <Badge variant="gold" className="absolute top-2 right-2 shadow-lg z-10 text-[10px] px-1.5 py-0.5">Art</Badge>
                    )}

                    {viewMode === 'grid' && (
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-gold hover:text-charcoal hover:border-gold transition-colors">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-gold hover:text-charcoal hover:border-gold transition-colors p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onBookmark?.(artwork.id);
                                    }}
                                >
                                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-gold text-gold' : ''}`} />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <div>
                            <h3 className="font-serif font-bold text-lg text-theme-text group-hover:text-gold transition-colors line-clamp-1">
                                {artwork.title}
                            </h3>
                            <p className="text-xs text-gold/80 font-medium tracking-wide uppercase mt-1">
                                {artwork.artist?.displayName || 'Unknown Artist'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-theme-border/50 flex items-center justify-between text-xs text-theme-muted">
                        <span className="px-2 py-1 rounded bg-theme-surface border border-theme-border/50">
                            {artwork.medium || 'Mixed Media'}
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {artwork.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {artwork.likes || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </GlowCard>
        </motion.div>
    );
}

function MuseumCard({
    museum,
    viewMode
}: {
    museum: any;
    viewMode: ViewMode;
}) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <GlowCard
                className={`cursor-pointer group overflow-hidden border border-theme-border hover:border-gold/30 ${viewMode === 'list' ? 'flex flex-row h-40' : 'flex flex-col h-full'}`}
                onClick={() => navigate(`/gallery/museum/${museum.id}`)} // Use ID not slug for consistency with routes if needed, or slug if backend supports
                glowColor="var(--text-gold)"
            >
                {/* Image Container */}
                <div className={viewMode === 'list' ? "w-40 h-full relative" : "aspect-video relative overflow-hidden"}>
                    <div className="absolute inset-0 bg-theme-surface animate-pulse" />
                    <img
                        src={museum.images?.[0] || museum.coverImageUrl || '/placeholder-museum.jpg'}
                        alt={museum.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                    {museum.isVerified && (
                        <Badge variant="success" className="absolute top-2 right-2 shadow-lg z-10 text-[10px] px-1.5 py-0.5 backdrop-blur-md bg-green-500/20 border-green-500/50 text-green-400">Verified</Badge>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                        <Badge variant="default" className="mb-2 bg-gold/20 text-gold border-gold/30 backdrop-blur-sm hover:bg-gold/30">{museum.type || 'Museum'}</Badge>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-serif font-bold text-lg text-theme-text group-hover:text-gold transition-colors truncate">
                        {museum.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-theme-muted mt-1 mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gold/70" />
                        <span className="truncate">{museum.address?.city || museum.city}, {museum.address?.country || museum.country}</span>
                    </div>

                    <p className="text-xs text-theme-muted line-clamp-2 mb-4 flex-1">
                        {museum.description}
                    </p>

                    <div className="pt-3 border-t border-theme-border/50 flex items-center justify-between text-xs">
                        <span className="text-theme-text font-medium"><strong className="text-gold">{museum.artworksCount || museum.totalArtworks || 0}</strong> artworks</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:text-gold hover:bg-gold/10 -mr-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to details
                                navigate(`/gallery/museum/${museum.id}`);
                            }}
                        >
                            View Details <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </div>
            </GlowCard>
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GalleryPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabValue>('museums'); // Default to museums as requested
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        category: '',
        region: '',
        page: 1,
        limit: 12
    });

    // Queries
    const { data: artworkData, isLoading: artworksLoading } = useArtworks({
        category: filters.category || undefined,
        region: filters.region || undefined,
        page: filters.page,
        limit: filters.limit,
        search: searchQuery || undefined
    });

    const { data: museumData, isLoading: museumsLoading } = useMuseums({
        page: filters.page,
        limit: filters.limit,
        // search: searchQuery || undefined // Add search to useMuseums if supported
    });

    // Mutations
    const addBookmark = useAddBookmark();

    const artworks = artworkData?.data || [];
    const museums = museumData?.data || [];

    // Calculate total pages safely
    const artworkTotalPages = artworkData?.meta?.totalPages || 1;
    const museumTotalPages = museumData?.meta?.totalPages || 1;

    const handleBookmark = (artworkId: string) => {
        // Toggle bookmark - in real app, check if already bookmarked
        addBookmark.mutate(artworkId);
    };

    const isLoading = activeTab === 'artworks' ? artworksLoading : museumsLoading;

    // Tab configuration for the custom Tabs component
    const tabItems = [
        { id: 'museums', label: 'Museums & Galleries', icon: <Building2 className="w-4 h-4" /> },
        { id: 'artworks', label: 'Artworks', icon: <Image className="w-4 h-4" /> },
    ];

    return (
        <PageContainer
            title="SeniQu Gallery"
            subtitle="Explore museums, galleries, and artworks from across Indonesia"
            actions={
                <Button
                    variant="gold"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    onClick={() => navigate('/dashboard/nearby')}
                    className="shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all duration-300"
                >
                    <span className="hidden sm:inline">Find Nearby</span>
                    <span className="sm:hidden">Nearby</span>
                </Button>
            }
        >
            <div className="space-y-8">
                {/* Tabs & Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-theme-surface/50 p-2 rounded-2xl border border-theme-border/50 backdrop-blur-sm">
                    <Tabs
                        tabs={tabItems}
                        activeTab={activeTab}
                        onChange={(tabId) => setActiveTab(tabId as TabValue)}
                        variant="pills"
                        className="w-full md:w-auto"
                    />

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                            <Input
                                placeholder={`Search ${activeTab}...`}
                                className="pl-10 h-10 bg-theme-bg border-theme-border/50 focus:border-gold/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="h-8 w-[1px] bg-theme-border/50 mx-1 hidden md:block" />

                        <div className="flex bg-theme-bg rounded-lg border border-theme-border/50 p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'gold' : 'ghost'}
                                size="icon"
                                className={`w-8 h-8 rounded-md ${viewMode === 'grid' ? 'shadow-sm' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'gold' : 'ghost'}
                                size="icon"
                                className={`w-8 h-8 rounded-md ${viewMode === 'list' ? 'shadow-sm' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>

                        <Button variant="outline" size="icon" className="w-10 h-10 border-theme-border/50 bg-theme-bg" onClick={() => { }}>
                            <Filter className="w-4 h-4 text-theme-muted" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-10 h-10 text-gold animate-spin" />
                        <p className="text-theme-muted animate-pulse">Curating your experience...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'artworks' ? (
                                <>
                                    {artworks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-theme-border/50 rounded-3xl bg-theme-surface/30">
                                            <Sparkles className="w-12 h-12 text-theme-muted mb-4 opacity-50" />
                                            <h3 className="text-lg font-medium text-theme-text mb-2">No artworks found</h3>
                                            <p className="text-theme-muted max-w-sm">We couldn't find any artworks matching your search. Try adjusting your filters.</p>
                                        </div>
                                    ) : (
                                        <div className={viewMode === 'grid'
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                            : "flex flex-col gap-4"
                                        }>
                                            {artworks.map((artwork: any) => (
                                                <ArtworkCard
                                                    key={artwork.id}
                                                    artwork={artwork}
                                                    viewMode={viewMode}
                                                    onBookmark={handleBookmark}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {museums.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-theme-border/50 rounded-3xl bg-theme-surface/30">
                                            <Building2 className="w-12 h-12 text-theme-muted mb-4 opacity-50" />
                                            <h3 className="text-lg font-medium text-theme-text mb-2">No museums found</h3>
                                            <p className="text-theme-muted max-w-sm">We couldn't find any museums matching your search. Try adjusting your location or filters.</p>
                                        </div>
                                    ) : (
                                        <div className={viewMode === 'grid'
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                                            : "flex flex-col gap-4"
                                        }>
                                            {museums.map((museum: any) => (
                                                <MuseumCard
                                                    key={museum.id}
                                                    museum={museum}
                                                    viewMode={viewMode}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Pagination */}
                {((activeTab === 'artworks' && artworkTotalPages > 1) ||
                    (activeTab === 'museums' && museumTotalPages > 1)) && (
                        <div className="flex justify-center gap-2 mt-12">
                            <Button
                                variant="ghost"
                                disabled={filters.page === 1}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                className="hover:text-gold hover:bg-gold/10"
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-4 font-mono text-sm text-theme-muted bg-theme-surface rounded-lg border border-theme-border/50">
                                Page {filters.page} of {activeTab === 'artworks' ? artworkTotalPages : museumTotalPages}
                            </span>
                            <Button
                                variant="ghost"
                                disabled={filters.page >= (activeTab === 'artworks' ? artworkTotalPages : museumTotalPages)}
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                className="hover:text-gold hover:bg-gold/10"
                            >
                                Next
                            </Button>
                        </div>
                    )}
            </div>
        </PageContainer>
    );
}

export default GalleryPage;
