/**
 * Arts Marketplace Page for User Dashboard
 * Browse and collect verified artworks — Proof of Art (PoA)
 */

import { useState } from 'react';
import {
    Search,
    Filter,
    Grid3X3,
    List,
    Wallet,
    TrendingUp,
    ShoppingCart,
    Eye,
    Heart,
    Loader2,
    Sparkles
} from 'lucide-react';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button, Input, Badge, Select } from '../../../components/ui';
import type { SelectOption } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useNFTMarketplace, useNFTStats, useOwnedNFTs, useBuyNFT } from '../../../hooks/useNFT';

// ============================================
// TYPES
// ============================================

type ViewMode = 'grid' | 'list';
type SortOption = 'price-low' | 'price-high' | 'newest' | 'popular';

// ============================================
// COMPONENTS
// ============================================

function StatCard({
    title,
    value,
    icon: Icon,
    color,
    isLoading
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    isLoading?: boolean;
}) {
    return (
        <Card variant="elevated" className="relative overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-theme-muted">{title}</p>
                    {isLoading ? (
                        <div className="h-8 w-16 bg-theme-elevated animate-pulse rounded mt-1" />
                    ) : (
                        <p className="text-xl sm:text-2xl font-bold text-theme-text mt-1">{value}</p>
                    )}
                </div>
                <div className={`p-2 sm:p-3 rounded-xl ${color} flex-shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            </div>
        </Card>
    );
}

function NFTCard({
    nft,
    viewMode,
    onBuy
}: {
    nft: any;
    viewMode: ViewMode;
    onBuy?: (nftId: string) => void;
}) {
    const navigate = useNavigate();

    if (viewMode === 'list') {
        return (
            <Card variant="default" hover className="cursor-pointer touch-manipulation active:bg-theme-elevated/50 transition-colors" onClick={() => navigate(`/marketplace/nft/${nft.id}`)}>
                <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="w-full xs:w-20 xs:h-20 sm:w-28 sm:h-28 aspect-square rounded-xl overflow-hidden flex-shrink-0 bg-theme-elevated">
                        <img
                            src={nft.artwork?.primaryImageUrl || '/placeholder-nft.jpg'}
                            alt={nft.artwork?.title || 'Artwork'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-medium text-theme-text truncate text-sm sm:text-base">{nft.artwork?.title || 'Untitled'}</h3>
                                    <p className="text-xs sm:text-sm text-theme-muted truncate">by {nft.creator?.displayName || 'Unknown'}</p>
                                </div>
                                <Badge variant="gold" className="flex-shrink-0 flex items-center gap-1 scale-90 sm:scale-100 origin-right">
                                    <Sparkles className="w-3 h-3" />
                                    PoA
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-theme-muted">
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> {nft.artwork?.views || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" /> {nft.artwork?.likes || 0}
                                </span>
                                <Badge variant="default" className="scale-90 origin-left">{nft.blockchain || 'Solana'}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 gap-2">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-theme-muted truncate">Current Price</p>
                                <p className="font-mono text-sm sm:text-lg font-bold text-gold truncate">
                                    {nft.listingPrice || nft.price} {nft.currency || 'SOL'}
                                </p>
                            </div>
                            <Button
                                variant="gold"
                                size="sm"
                                leftIcon={<ShoppingCart className="w-4 h-4" />}
                                className="flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBuy?.(nft.id);
                                }}
                            >
                                Buy
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer overflow-hidden touch-manipulation active:scale-[0.98] transition-all duration-200" onClick={() => navigate(`/marketplace/nft/${nft.id}`)}>
            <div className="relative aspect-square overflow-hidden bg-theme-elevated">
                <img
                    src={nft.artwork?.primaryImageUrl || '/placeholder-nft.jpg'}
                    alt={nft.artwork?.title || 'Artwork'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                />
                <Badge variant="gold" className="absolute top-3 left-3 flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    PoA
                </Badge>
                {/* Mobile Buy Button (Visible always on small screens, or adjust as needed. Here keeping hover behavior but adding mobile support if needed) */}
                {/* For mobile, hover doesn't exist, so we rely on clicking card to go to detail, where they can buy. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <div className="absolute bottom-4 left-4 right-4">
                        <Button
                            variant="gold"
                            className="w-full"
                            leftIcon={<ShoppingCart className="w-4 h-4" />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onBuy?.(nft.id);
                            }}
                        >
                            Collect Now
                        </Button>
                    </div>
                </div>
            </div>
            <div className="p-3 sm:p-4">
                <h3 className="font-medium text-theme-text truncate group-hover:text-gold transition-colors text-sm sm:text-base">
                    {nft.artwork?.title || 'Untitled'}
                </h3>
                <p className="text-xs sm:text-sm text-theme-muted truncate">by {nft.creator?.displayName || 'Unknown'}</p>
                <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-theme-border">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-theme-muted truncate">Price</p>
                        <p className="font-mono font-bold text-gold text-sm sm:text-base truncate">
                            {nft.listingPrice || nft.price} {nft.currency || 'SOL'}
                        </p>
                    </div>
                    <Badge variant="default" className="text-[10px] sm:text-xs scale-90 sm:scale-100 origin-right">{nft.blockchain || 'SOL'}</Badge>
                </div>
            </div>
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NFTMarketplacePage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filters, setFilters] = useState({
        page: 1,
        limit: 12,
        minPrice: undefined as number | undefined,
        maxPrice: undefined as number | undefined,
    });

    // Queries
    const { data: marketplaceData, isLoading } = useNFTMarketplace({
        page: filters.page,
        limit: filters.limit,
        sortBy: sortBy === 'price-low' || sortBy === 'price-high' ? 'price' : sortBy === 'newest' ? 'createdAt' : 'views',
        sortOrder: sortBy === 'price-low' ? 'asc' : 'desc',
    });

    const { data: stats, isLoading: statsLoading } = useNFTStats();
    const { data: ownedData } = useOwnedNFTs({ limit: 5 });

    // Mutations
    const buyNFT = useBuyNFT();

    const nfts = marketplaceData?.data || [];
    const ownedNFTs = ownedData?.data || [];

    const handleBuy = (nftId: string) => {
        // In real app, show confirmation modal
        buyNFT.mutate(nftId);
    };

    // Sort options for Select component
    const sortOptions: SelectOption[] = [
        { value: 'newest', label: 'Newest' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
    ];

    return (
        <PageContainer
            title="Arts Marketplace"
            subtitle="Discover and collect verified heritage artworks"
            actions={
                <Button
                    variant="gold"
                    leftIcon={<Wallet className="w-4 h-4" />}
                    onClick={() => navigate('/dashboard/my-nfts')}
                >
                    <span className="hidden sm:inline">My Arts</span>
                    <span className="sm:hidden">My Arts</span>
                </Button>
            }
        >
            {/* Stats */}
            <StatsGrid>
                <StatCard
                    title="Total Artworks"
                    value={stats?.totalNFTs?.toLocaleString() || '0'}
                    icon={Sparkles}
                    color="bg-purple-500/10 text-purple-500"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Listed for Sale"
                    value={stats?.totalListed?.toLocaleString() || '0'}
                    icon={ShoppingCart}
                    color="bg-blue-500/10 text-blue-500"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Total Volume"
                    value={`${stats?.totalVolume?.toFixed(2) || '0'} SOL`}
                    icon={TrendingUp}
                    color="bg-green-500/10 text-green-500"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Your Arts"
                    value={ownedNFTs.length.toString()}
                    icon={Wallet}
                    color="bg-gold/10 text-gold"
                />
            </StatsGrid>

            {/* Search & Filters */}
            <Card variant="elevated" className="my-6">
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                            <Input
                                placeholder="Search artworks by name, artist, or collection..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                            <Select
                                options={sortOptions}
                                value={sortBy}
                                onChange={(value) => setSortBy(value as SortOption)}
                                placeholder="Sort by"
                                className="w-[140px] sm:w-[180px] flex-shrink-0"
                            />
                            <Button variant="outline" size="sm" className="sm:h-10 text-xs sm:text-sm whitespace-nowrap" leftIcon={<Filter className="w-3 h-3 sm:w-4 sm:h-4" />}>
                                Filters
                            </Button>
                            <div className="border-l border-theme-border h-6 sm:h-8 mx-1 sm:mx-2 hidden xs:block" />
                            <div className="flex items-center gap-1">
                                <Button
                                    variant={viewMode === 'grid' ? 'gold' : 'ghost'}
                                    size="icon"
                                    className="w-8 h-8 sm:w-10 sm:h-10"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'gold' : 'ghost'}
                                    size="icon"
                                    className="w-8 h-8 sm:w-10 sm:h-10"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* NFT Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : nfts.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <Sparkles className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">No Artworks Listed</h3>
                    <p className="text-theme-muted mb-4">The marketplace is awaiting its first listings</p>
                </Card>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                    : "flex flex-col gap-4"
                }>
                    {nfts.map((nft: any) => (
                        <NFTCard
                            key={nft.id}
                            nft={nft}
                            viewMode={viewMode}
                            onBuy={handleBuy}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {(marketplaceData?.meta?.totalPages ?? 0) > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    <Button
                        variant="ghost"
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-theme-muted">
                        Page {filters.page} of {marketplaceData?.meta?.totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={filters.page >= (marketplaceData?.meta?.totalPages ?? 0)}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}

export default NFTMarketplacePage;
