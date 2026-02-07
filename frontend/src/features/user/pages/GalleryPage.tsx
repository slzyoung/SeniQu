/**
 * User Gallery Page
 * Displays museums, galleries, and artworks with filtering
 */

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
    ExternalLink
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Input, Badge, Tabs } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useMuseums } from '../../../hooks/useMuseums';
import { useArtworks } from '../../../hooks/useArtworks';
import { useAddBookmark } from '../../../hooks/useUser';

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

    if (viewMode === 'list') {
        return (
            <Card variant="default" hover className="cursor-pointer" onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}>
                <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-theme-elevated">
                        <img
                            src={artwork.primaryImageUrl || artwork.images?.[0]?.url || '/placeholder-art.jpg'}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-theme-text truncate">{artwork.title}</h3>
                                <p className="text-sm text-theme-muted">{artwork.artist?.displayName || 'Unknown Artist'}</p>
                            </div>
                            {artwork.isNFT && <Badge variant="gold">NFT</Badge>}
                        </div>
                        <p className="text-xs text-theme-muted mt-2 line-clamp-2">{artwork.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-theme-muted">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {artwork.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {artwork.likes || 0}
                            </span>
                            {artwork.medium && <Badge variant="default" className="text-xs">{artwork.medium}</Badge>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onBookmark?.(artwork.id);
                            }}
                        >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-gold text-gold' : ''}`} />
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer overflow-hidden" onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}>
            <div className="relative aspect-square overflow-hidden bg-theme-elevated">
                <img
                    src={artwork.primaryImageUrl || artwork.images?.[0]?.url || '/placeholder-art.jpg'}
                    alt={artwork.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {artwork.isNFT && (
                    <Badge variant="gold" className="absolute top-3 right-3">NFT</Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <div className="flex gap-3 text-white text-xs">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {artwork.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {artwork.likes || 0}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                onBookmark?.(artwork.id);
                            }}
                        >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-gold text-gold' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-medium text-theme-text truncate group-hover:text-gold transition-colors">{artwork.title}</h3>
                <p className="text-sm text-theme-muted truncate">{artwork.artist?.displayName || 'Unknown Artist'}</p>
            </div>
        </Card>
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

    if (viewMode === 'list') {
        return (
            <Card variant="default" hover className="cursor-pointer" onClick={() => navigate(`/gallery/museum/${museum.id}`)}>
                <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-theme-elevated">
                        <img
                            src={museum.logoUrl || museum.coverImageUrl || '/placeholder-museum.jpg'}
                            alt={museum.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-theme-text">{museum.name}</h3>
                                <p className="text-sm text-theme-muted flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {museum.city}, {museum.province || museum.country}
                                </p>
                            </div>
                            {museum.isVerified && <Badge variant="success">Verified</Badge>}
                        </div>
                        <p className="text-xs text-theme-muted mt-2 line-clamp-2">{museum.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-theme-muted">
                            <span><strong>{museum.totalArtworks || 0}</strong> artworks</span>
                            <Badge variant="default">{museum.type || 'museum'}</Badge>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/gallery/museum/${museum.id}`, '_blank');
                        }}
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer overflow-hidden" onClick={() => navigate(`/gallery/museum/${museum.id}`)}>
            <div className="relative aspect-video overflow-hidden bg-theme-elevated">
                <img
                    src={museum.coverImageUrl || museum.logoUrl || '/placeholder-museum.jpg'}
                    alt={museum.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {museum.isVerified && (
                    <Badge variant="success" className="absolute top-3 right-3">Verified</Badge>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <Badge variant="default" className="mb-2">{museum.type || 'museum'}</Badge>
                    <h3 className="font-medium text-white truncate">{museum.name}</h3>
                </div>
            </div>
            <div className="p-4">
                <p className="text-sm text-theme-muted flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {museum.city}, {museum.province || museum.country}
                </p>
                <p className="text-xs text-theme-muted mt-1">
                    <strong className="text-gold">{museum.totalArtworks || 0}</strong> artworks
                </p>
            </div>
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GalleryPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabValue>('artworks');
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
        limit: filters.limit
    });

    const { data: museumData, isLoading: museumsLoading } = useMuseums({
        page: filters.page,
        limit: filters.limit
    });

    // Mutations
    const addBookmark = useAddBookmark();

    const artworks = artworkData?.data || [];
    const museums = museumData?.data || [];

    const handleBookmark = (artworkId: string) => {
        // Toggle bookmark - in real app, check if already bookmarked
        addBookmark.mutate(artworkId);
    };

    const isLoading = activeTab === 'artworks' ? artworksLoading : museumsLoading;

    // Tab configuration for the custom Tabs component
    const tabItems = [
        { id: 'artworks', label: 'Artworks', icon: <Image className="w-4 h-4" /> },
        { id: 'museums', label: 'Museums & Galleries', icon: <Building2 className="w-4 h-4" /> },
    ];

    return (
        <PageContainer
            title="Public Art Gallery"
            description="Explore museums, galleries, and artworks from across Indonesia"
            actions={
                <Button
                    variant="gold"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    onClick={() => navigate('/dashboard/nearby')}
                >
                    <span className="hidden sm:inline">Find Nearby</span>
                    <span className="sm:hidden">Nearby</span>
                </Button>
            }
        >
            {/* Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <Tabs
                    tabs={tabItems}
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(tabId as TabValue)}
                    variant="pills"
                />

                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === 'grid' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <Input
                        placeholder={`Search ${activeTab}...`}
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                    Filters
                </Button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : activeTab === 'artworks' ? (
                <>
                    {artworks.length === 0 ? (
                        <Card variant="elevated" className="text-center py-16">
                            <Image className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-theme-text mb-2">No artworks found</h3>
                            <p className="text-theme-muted">Try adjusting your filters or search terms</p>
                        </Card>
                    ) : (
                        <div className={viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
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
                        <Card variant="elevated" className="text-center py-16">
                            <Building2 className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-theme-text mb-2">No museums found</h3>
                            <p className="text-theme-muted">Try adjusting your filters or search terms</p>
                        </Card>
                    ) : (
                        <div className={viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
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

            {/* Pagination */}
            {((activeTab === 'artworks' && (artworkData?.meta?.totalPages ?? 0) > 1) ||
                (activeTab === 'museums' && (museumData?.meta?.totalPages ?? 0) > 1)) && (
                    <div className="flex justify-center gap-2 mt-8">
                        <Button
                            variant="ghost"
                            disabled={filters.page === 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-4 text-theme-muted">
                            Page {filters.page} of {activeTab === 'artworks' ? artworkData?.meta?.totalPages : museumData?.meta?.totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            disabled={filters.page >= (activeTab === 'artworks' ? (artworkData?.meta?.totalPages ?? 0) : (museumData?.meta?.totalPages ?? 0))}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                        </Button>
                    </div>
                )}
        </PageContainer>
    );
}

export default GalleryPage;
