/**
 * AI Curation Page for User Dashboard
 * Personalized artwork recommendations
 */

import { useState } from 'react';
import {
    Sparkles,
    Eye,
    Bookmark,
    RefreshCw,
    Loader2,
    SlidersHorizontal,
    Palette,
    DollarSign,
    Grid3X3,
    List
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Badge } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedRecommendations, useCurate, useGenres } from '../../../hooks/useAI';
import { useAddBookmark } from '../../../hooks/useUser';

// ============================================
// TYPES
// ============================================

type ViewMode = 'grid' | 'list';

// ============================================
// COMPONENTS
// ============================================

function RecommendationCard({
    recommendation,
    viewMode,
    onBookmark
}: {
    recommendation: any;
    viewMode: ViewMode;
    onBookmark?: (artworkId: string) => void;
}) {
    const navigate = useNavigate();
    const artwork = recommendation.artwork;

    if (viewMode === 'list') {
        return (
            <Card variant="default" hover className="cursor-pointer" onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}>
                <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-theme-elevated">
                        <img
                            src={artwork.primaryImageUrl}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-medium text-theme-text truncate">{artwork.title}</h3>
                                <p className="text-sm text-theme-muted">by {artwork.artist?.displayName || 'Unknown'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {artwork.isNFT && <Badge variant="gold">NFT</Badge>}
                                <Badge variant="success" className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {(recommendation.score * 100).toFixed(0)}%
                                </Badge>
                            </div>
                        </div>
                        <p className="text-xs text-theme-muted mt-2 line-clamp-1 italic">
                            "{recommendation.reason}"
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {artwork.genres?.slice(0, 3).map((genre: string) => (
                                <Badge key={genre} variant="default" className="text-xs">{genre}</Badge>
                            ))}
                        </div>
                        {artwork.price && (
                            <p className="font-mono text-gold mt-2">
                                {artwork.price.toLocaleString()} {artwork.isNFT ? 'ETH' : 'IDR'}
                            </p>
                        )}
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
                            <Bookmark className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer overflow-hidden" onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}>
            <div className="relative aspect-[4/5] overflow-hidden bg-theme-elevated">
                <img
                    src={artwork.primaryImageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 right-3 flex justify-between">
                    {artwork.isNFT && <Badge variant="gold">NFT</Badge>}
                    <Badge variant="success" className="flex items-center gap-1 ml-auto">
                        <Sparkles className="w-3 h-3" />
                        {(recommendation.score * 100).toFixed(0)}%
                    </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white text-sm italic mb-3 line-clamp-2">"{recommendation.reason}"</p>
                        <div className="flex gap-2">
                            <Button
                                variant="gold"
                                size="sm"
                                className="flex-1"
                                leftIcon={<Eye className="w-4 h-4" />}
                            >
                                View
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBookmark?.(artwork.id);
                                }}
                            >
                                <Bookmark className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-medium text-theme-text truncate group-hover:text-gold transition-colors">
                    {artwork.title}
                </h3>
                <p className="text-sm text-theme-muted truncate">by {artwork.artist?.displayName || 'Unknown'}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                    {artwork.genres?.slice(0, 2).map((genre: string) => (
                        <Badge key={genre} variant="default" className="text-xs">{genre}</Badge>
                    ))}
                </div>
            </div>
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AICurationPage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        genres: [] as string[],
        priceRange: { min: 0, max: 100 },
        excludeOwned: false,
        context: 'discovery' as 'collection' | 'purchase' | 'discovery' | 'similar',
    });

    // Queries
    const { data: recommendations, isLoading, refetch, isFetching } = usePersonalizedRecommendations(20);
    const { data: genres } = useGenres();
    const curate = useCurate();

    // Mutations
    const addBookmark = useAddBookmark();

    const handleBookmark = (artworkId: string) => {
        addBookmark.mutate(artworkId);
    };

    const handleRefresh = () => {
        if (filters.genres.length > 0 || filters.excludeOwned) {
            curate.mutate({
                preferences: {
                    genres: filters.genres.length > 0 ? filters.genres : undefined,
                    priceRange: filters.priceRange.max > 0 ? filters.priceRange : undefined,
                    excludeOwned: filters.excludeOwned,
                },
                context: filters.context,
                limit: 20,
            });
        } else {
            refetch();
        }
    };

    const toggleGenre = (genre: string) => {
        setFilters(prev => ({
            ...prev,
            genres: prev.genres.includes(genre)
                ? prev.genres.filter(g => g !== genre)
                : [...prev.genres, genre],
        }));
    };

    const displayRecommendations = curate.data?.recommendations || recommendations || [];
    const isLoadingData = isLoading || curate.isPending;

    return (
        <PageContainer
            title="AI Curation"
            description="Personalized artwork recommendations just for you"
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <span className="hidden sm:inline">Preferences</span>
                    </Button>
                    <Button
                        variant="gold"
                        leftIcon={isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        onClick={handleRefresh}
                        disabled={isFetching}
                    >
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            }
        >
            {/* Filters Panel */}
            {showFilters && (
                <Card variant="elevated" className="mb-6">
                    <CardHeader title="Curation Preferences" />
                    <CardContent className="space-y-6">
                        {/* Genres */}
                        <div>
                            <h4 className="text-sm font-medium text-theme-text mb-3 flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Preferred Genres
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {genres?.slice(0, 10).map((genre: any) => (
                                    <button
                                        key={genre.name}
                                        type="button"
                                        onClick={() => toggleGenre(genre.name)}
                                        className="focus:outline-none focus:ring-2 focus:ring-gold/50 rounded-full"
                                    >
                                        <Badge
                                            variant={filters.genres.includes(genre.name) ? 'gold' : 'default'}
                                            className="cursor-pointer transition-colors hover:opacity-80"
                                        >
                                            {genre.name}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Range */}
                        <div>
                            <h4 className="text-sm font-medium text-theme-text mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Price Range (ETH)
                            </h4>
                            <div className="px-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={filters.priceRange.max}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        priceRange: { ...prev.priceRange, max: parseInt(e.target.value) }
                                    }))}
                                    className="w-full h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-gold"
                                />
                                <div className="flex justify-between text-xs text-theme-muted mt-1">
                                    <span>0 ETH</span>
                                    <span>{filters.priceRange.max} ETH</span>
                                </div>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.excludeOwned}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        excludeOwned: e.target.checked
                                    }))}
                                    className="w-4 h-4 rounded border-theme-border bg-theme-surface text-gold focus:ring-gold"
                                />
                                <span className="text-sm text-theme-text">Exclude artworks I own</span>
                            </label>
                        </div>

                        {/* Apply */}
                        <div className="flex gap-3 pt-4 border-t border-theme-border">
                            <Button
                                variant="ghost"
                                onClick={() => setFilters({
                                    genres: [],
                                    priceRange: { min: 0, max: 100 },
                                    excludeOwned: false,
                                    context: 'discovery',
                                })}
                            >
                                Reset
                            </Button>
                            <Button variant="gold" onClick={handleRefresh} disabled={curate.isPending}>
                                {curate.isPending ? 'Curating...' : 'Apply & Curate'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* View Mode Toggle */}
            <div className="flex justify-between items-center mb-6">
                <p className="text-theme-muted">
                    {displayRecommendations.length} recommendations based on your taste
                </p>
                <div className="flex items-center gap-1">
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

            {/* Recommendations Grid */}
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
                    <p className="text-theme-muted">Curating artworks for you...</p>
                </div>
            ) : displayRecommendations.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <Sparkles className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">No Recommendations Yet</h3>
                    <p className="text-theme-muted mb-4 max-w-md mx-auto">
                        Explore some artworks and bookmark your favorites to help our AI learn your taste
                    </p>
                    <Button variant="gold" onClick={() => navigate('/dashboard/gallery')}>
                        Explore Gallery
                    </Button>
                </Card>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                    : "flex flex-col gap-4"
                }>
                    {displayRecommendations.map((rec: any) => (
                        <RecommendationCard
                            key={rec.id || rec.artworkId}
                            recommendation={rec}
                            viewMode={viewMode}
                            onBookmark={handleBookmark}
                        />
                    ))}
                </div>
            )}

            {/* Curated Info */}
            {curate.data && (
                <div className="mt-6 text-center text-sm text-theme-muted">
                    <p>
                        Curated in {curate.data.processingTime}ms • {curate.data.totalMatches} total matches
                    </p>
                </div>
            )}
        </PageContainer>
    );
}

export default AICurationPage;
