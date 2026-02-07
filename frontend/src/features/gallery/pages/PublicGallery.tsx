/**
 * Public Gallery Page
 * Displays artworks with search, filter, and pagination
 */

import React, { useState } from 'react';
import { useArtworks } from '../../../hooks/useArtworks';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Input, Badge } from '../../../components/ui';
import { Search, Filter, Grid, List, Heart, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../lib/constants';

export default function PublicGallery() {
    // State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        region: '',
        page: 1,
        limit: 12
    });

    // Query
    const { data: artworkData, isLoading, isError } = useArtworks({
        category: filters.category || undefined,
        region: filters.region || undefined,
        page: filters.page,
        limit: filters.limit
    });

    const artworks = artworkData?.data || [];
    const totalPages = artworkData?.meta?.totalPages || 1;

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger refetch or filter (API currently doesn't support text search in 'findAll' based on controller,
        // but let's assume it might or we'll add it later. For now, filter local or just params)
        // Controller has category and region query params.
    };

    return (
        <PageContainer
            title="Art Gallery"
            description="Explore our curated collection of digital and physical artworks"
        >
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <Input
                        placeholder="Search artworks..."
                        className="pl-10"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </form>

                <div className="flex items-center gap-2">
                    <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                        Filters
                    </Button>
                    <div className="border-l border-theme-border h-8 mx-2" />
                    <Button
                        variant={viewMode === 'grid' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid className="w-4 h-4" />
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

            {/* Content */}
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : isError ? (
                <div className="py-20 text-center text-red-400">
                    Failed to load artworks. Please try again.
                </div>
            ) : artworks.length === 0 ? (
                <div className="py-20 text-center text-theme-muted">
                    No artworks found matching your criteria.
                </div>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "flex flex-col gap-4"
                }>
                    {artworks.map((artwork) => (
                        <Link
                            key={artwork.id}
                            to={ROUTES.GALLERY_ARTWORK.replace(':id', artwork.id)}
                            className="group"
                        >
                            <Card variant="default" padding="none" hover className="h-full overflow-hidden">
                                {/* Image */}
                                <div className={viewMode === 'grid' ? "aspect-square relative overflow-hidden" : "flex gap-6 p-4"}>
                                    <div className={viewMode === 'grid' ? "w-full h-full" : "w-48 h-32 flex-shrink-0 relative rounded-lg overflow-hidden"}>
                                        <img
                                            src={artwork.images?.[0]?.url || '/placeholder-art.jpg'}
                                            alt={artwork.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {artwork.isNFT && (
                                            <Badge variant="gold" className="absolute top-2 right-2">NFT</Badge>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className={viewMode === 'grid' ? "p-4" : "flex-1 flex flex-col justify-center"}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-medium text-theme-text group-hover:text-gold transition-colors line-clamp-1">
                                                    {artwork.title}
                                                </h3>
                                                <p className="text-sm text-theme-muted">{artwork.artist?.displayName || 'Unknown Artist'}</p>
                                            </div>
                                            {artwork.price && (
                                                <span className="font-mono text-gold font-medium">
                                                    {artwork.price.toLocaleString()} ETH
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-theme-muted mt-2">
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {artwork.views || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-3 h-3" />
                                                {artwork.likes || 0}
                                            </span>
                                            <span className="ml-auto px-2 py-0.5 rounded-full bg-theme-surface border border-theme-border">
                                                {artwork.medium}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination placeholder */}
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-theme-muted">
                        Page {filters.page} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={filters.page >= totalPages}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}
