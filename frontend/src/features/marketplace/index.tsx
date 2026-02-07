/**
 * Marketplace Feature - NFT Marketplace and Details
 * Uses real API data with useArtworks hook for NFT listings
 */

import { useState } from 'react';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, Button, Badge } from '../../components/ui';
import {
    ShoppingBag,
    Search,
    Grid,
    List,
    Heart,
    Eye,
    Loader2,
    Image as ImageIcon
} from 'lucide-react';
import { useArtworks } from '../../hooks/useArtworks';
import { Link, useParams } from 'react-router-dom';

interface NFTItem {
    id: string;
    title: string;
    imageUrl?: string;
    images?: { url: string }[];
    price?: number;
    artist?: { displayName: string };
    views?: number;
    likes?: number;
    isNFT?: boolean;
}

function NFTCard({ item }: { item: NFTItem }) {
    const imageUrl = item.imageUrl || item.images?.[0]?.url;

    return (
        <Card variant="elevated" hover padding="none" className="group overflow-hidden">
            <div className="relative aspect-square bg-theme-elevated">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-theme-muted/40" />
                    </div>
                )}
                {item.isNFT && (
                    <Badge variant="gold" className="absolute top-3 right-3">NFT</Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-4">
                <h3 className="font-medium text-theme-text truncate">{item.title}</h3>
                <p className="text-sm text-theme-muted">{item.artist?.displayName || 'Unknown Artist'}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border">
                    <span className="font-semibold text-gold">
                        {item.price ? `${item.price} ETH` : 'Not for sale'}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-theme-muted">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {item.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" /> {item.likes || 0}
                        </span>
                    </div>
                </div>
            </div>
            <Link
                to={`/marketplace/nft/${item.id}`}
                className="absolute inset-0"
            />
        </Card>
    );
}

export function Marketplace() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);

    // Fetch NFT artworks using real API
    const { data: artworkData, isLoading, isError } = useArtworks({
        category: category || undefined,
        page,
        limit: 12,
    });

    const artworks = artworkData?.data || [];
    const totalPages = artworkData?.meta?.totalPages || 1;
    const nftArtworks = artworks.filter((a: any) => a.isNFT);

    const filteredArtworks = nftArtworks.filter((artwork: NFTItem) =>
        artwork.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer
            className="max-w-7xl mx-auto"
            title="NFT Marketplace"
            subtitle="Discover and collect rare digital art"
            actions={
                <Button variant="gold" leftIcon={<ShoppingBag className="w-4 h-4" />}>
                    My Collection
                </Button>
            }
        >
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search NFTs..."
                        className="w-full pl-10 pr-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        className="px-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text"
                    >
                        <option value="">All Categories</option>
                        <option value="digital">Digital Art</option>
                        <option value="traditional">Traditional</option>
                        <option value="photography">Photography</option>
                        <option value="abstract">Abstract</option>
                    </select>
                    <div className="flex items-center border border-theme-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 ${viewMode === 'grid' ? 'bg-gold/10 text-gold' : 'text-theme-muted hover:text-theme-text'}`}
                        >
                            <Grid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 ${viewMode === 'list' ? 'bg-gold/10 text-gold' : 'text-theme-muted hover:text-theme-text'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : isError ? (
                <Card variant="elevated" className="text-center py-16">
                    <p className="text-red-400">Failed to load NFTs. Please try again.</p>
                </Card>
            ) : filteredArtworks.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <ShoppingBag className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-theme-text mb-2">No NFTs Found</h3>
                    <p className="text-theme-muted max-w-sm mx-auto">
                        {searchQuery ? 'Try adjusting your search' : 'No NFTs are currently listed for sale'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredArtworks.map((artwork: NFTItem) => (
                        <NFTCard key={artwork.id} item={artwork} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-theme-muted">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}

export function NFTDetail() {
    const { id } = useParams<{ id: string }>();

    // Use useArtwork hook to fetch single NFT
    // For now, show a detailed view placeholder
    return (
        <PageContainer title="NFT Details" subtitle="View artwork details and purchase options">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card variant="elevated" className="aspect-square bg-theme-elevated flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-theme-muted/40" />
                </Card>
                <div className="space-y-6">
                    <div>
                        <Badge variant="gold" className="mb-2">NFT</Badge>
                        <h1 className="text-3xl font-bold text-theme-text">Loading...</h1>
                        <p className="text-theme-muted mt-2">NFT ID: {id}</p>
                    </div>
                    <Card variant="default" className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-theme-muted">Current Price</span>
                            <span className="text-2xl font-bold text-gold">-- ETH</span>
                        </div>
                        <Button variant="gold" className="w-full">
                            Buy Now
                        </Button>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

export default { Marketplace, NFTDetail };
