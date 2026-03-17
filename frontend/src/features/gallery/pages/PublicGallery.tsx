/**
 * Public Gallery Page
 * Displays artworks with search, filter, and pagination
 */

import React, { useState } from 'react';
import { useArtworks } from '../../../hooks/useArtworks';
import { Button, Input, Badge } from '../../../components/ui';
import { GlowCard } from '../../../components/GlowCard';
import { Search, Filter, Grid, List, Heart, Eye, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

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
        // Implement search logic
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-12 md:pt-32 md:pb-20">
            {/* Custom Header Section */}
            <div className="text-center mb-10 md:mb-14">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-[1px] w-6 md:w-12 bg-gold/50" />
                        <span className="text-gold text-[10px] md:text-xs uppercase tracking-[0.2em]">
                            Nusantara Collection
                        </span>
                        <div className="h-[1px] w-6 md:w-12 bg-gold/50" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-theme-text mb-4">
                        Discover <span className="text-gold italic">Masterpieces</span>
                    </h1>
                    <p className="text-theme-muted max-w-2xl text-sm md:text-base leading-relaxed">
                        Explore our curated selection of digital and physical artworks from across the Indonesian archipelago, verified on the blockchain.
                    </p>
                </motion.div>
            </div>

            {/* Toolbar */}
            <div className="sticky top-20 z-30 bg-theme-bg/80 backdrop-blur-md p-4 rounded-2xl border border-theme-border mb-8 shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <form onSubmit={handleSearch} className="w-full md:max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted group-focus-within:text-gold transition-colors" />
                        <Input
                            placeholder="Search artworks..."
                            className="pl-10 bg-theme-surface border-theme-border focus:border-gold/50 transition-colors"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </form>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <Button variant="outline" className="border-theme-border hover:border-gold hover:text-gold transition-colors gap-2">
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                        </Button>
                        <div className="h-6 w-[1px] bg-theme-border mx-1" />
                        <div className="bg-theme-surface p-1 rounded-lg border border-theme-border flex items-center gap-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gold text-charcoal shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-gold text-charcoal shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-gold animate-spin" />
                    <p className="text-theme-muted text-sm animate-pulse">Curating gallery...</p>
                </div>
            ) : isError ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <AlertCircle className="w-10 h-10 text-red-500/50" />
                    <p className="text-red-400">Failed to load artworks. Please check your connection.</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                </div>
            ) : artworks.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4 border border-dashed border-theme-border rounded-2xl bg-theme-surface/30">
                    <Sparkles className="w-10 h-10 text-theme-muted/50" />
                    <p className="text-theme-muted">No artworks found matching your criteria.</p>
                </div>
            ) : (
                <motion.div
                    layout
                    className={viewMode === 'grid'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        : "flex flex-col gap-4"
                    }
                >
                    <AnimatePresence>
                        {artworks.map((artwork, index) => {
                            const imgUrl = (Array.isArray(artwork.images) && artwork.images.length > 0)
                                ? (artwork.images[0]?.url || artwork.images[0])
                                : ((artwork as any).primaryImageUrl || (artwork as any).primary_image_url || (artwork as any).imageUrl || '/placeholder-art.jpg');

                            return (
                                <motion.div
                                    key={artwork.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link
                                        to={ROUTES.GALLERY_ARTWORK.replace(':id', artwork.id)}
                                        className="group block h-full"
                                    >
                                        <GlowCard
                                            className="h-full overflow-hidden border border-theme-border hover:border-gold/30"
                                            glowColor="var(--text-gold)"
                                        >
                                            <div className={viewMode === 'grid' ? "flex flex-col h-full" : "flex flex-row h-40 gap-6"}>
                                                {/* Image Container */}
                                                <div className={viewMode === 'grid' ? "aspect-[4/5] relative overflow-hidden" : "w-40 h-full relative overflow-hidden"}>
                                                    <div className="absolute inset-0 bg-theme-surface animate-pulse" />
                                                    <img
                                                        src={imgUrl}
                                                        alt={artwork.title}
                                                        loading="lazy"
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                    {((artwork as any).isArt || (artwork as any).is_art) && (
                                                        <Badge variant="gold" className="absolute top-3 right-3 shadow-lg z-10">Art</Badge>
                                                    )}

                                                {viewMode === 'grid' && (
                                                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                        <div className="flex gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-gold hover:text-charcoal hover:border-gold transition-colors">
                                                                <Eye className="w-4 h-4" />
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500 transition-colors">
                                                                <Heart className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Container */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <div>
                                                        <h3 className="font-serif font-bold text-lg text-theme-text group-hover:text-gold transition-colors line-clamp-1">
                                                            {artwork.title}
                                                        </h3>
                                                        <p className="text-xs text-gold/80 font-medium tracking-wide uppercase mt-1">
                                                            {artwork.artist?.displayName || 'Unknown Artist'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-theme-border/50 flex items-center justify-between text-xs text-theme-muted">
                                                    <span className="px-2 py-1 rounded bg-theme-surface border border-theme-border/50">
                                                        {artwork.medium || 'Mixed Media'}
                                                    </span>
                                                    {artwork.price && (
                                                        <span className="font-mono text-theme-text font-bold">
                                                            {artwork.price.toLocaleString()} ETH
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </GlowCard>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Pagination placeholder */}
            {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="hover:bg-gold/10 hover:text-gold"
                    >
                        Previous
                    </Button>
                    <div className="flex items-center px-4 font-mono text-sm text-theme-muted bg-theme-surface rounded-md border border-theme-border">
                        {filters.page} / {totalPages}
                    </div>
                    <Button
                        variant="ghost"
                        disabled={filters.page >= totalPages}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="hover:bg-gold/10 hover:text-gold"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
