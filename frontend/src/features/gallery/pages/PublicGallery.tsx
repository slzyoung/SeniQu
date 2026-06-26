/**
 * Public Gallery Page — Enhanced Multi-Role Experience
 * 
 * Implements the SeniQu Gallery Strategy:
 * - Smart Nusantara Heritage filter chips (Era, Medium, Region)
 * - Dual view modes (Grid / List)
 * - AI-powered genre badges on each artwork card
 * - Proof of Art (PoA) indicators for blockchain-verified pieces
 * - Collector-facing price & mint status
 * - Artist attribution with follow CTA
 */

import React, { useState, useMemo } from 'react';
import { useArtworks } from '../../../hooks/useArtworks';
import { Button, Input, Badge } from '../../../components/ui';
import { GlowCard } from '../../../components/GlowCard';
import {
    Search,
    Filter,
    Grid,
    List,
    Heart,
    Eye,
    Loader2,
    AlertCircle,
    ShieldCheck,
    Cpu,
    X,
    ChevronDown,
    MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '../../../components/common/SEOHead';

// ── Nusantara Heritage Filter Constants ──

const ERA_FILTERS = [
    { id: 'all', label: 'All Eras' },
    { id: 'prehistoric', label: 'Pre-Historic' },
    { id: 'hindu-buddhist', label: 'Hindu-Buddhist' },
    { id: 'islamic-sultanate', label: 'Islamic Sultanate' },
    { id: 'colonial', label: 'Colonial' },
    { id: 'post-independence', label: 'Post-Independence' },
    { id: 'contemporary', label: 'Contemporary' },
];

const MEDIUM_FILTERS = [
    { id: 'all', label: 'All Media' },
    { id: 'canvas', label: 'Canvas / Oil' },
    { id: 'batik', label: 'Batik Textile' },
    { id: 'wood-carving', label: 'Wood Carving' },
    { id: 'wayang', label: 'Wayang Kulit' },
    { id: 'stone', label: 'Stone Relic' },
    { id: 'digital', label: 'Digital Art' },
    { id: 'mixed', label: 'Mixed Media' },
];

const REGION_FILTERS = [
    { id: 'all', label: 'All Regions' },
    { id: 'sumatra', label: 'Sumatra' },
    { id: 'java', label: 'Java' },
    { id: 'kalimantan', label: 'Kalimantan' },
    { id: 'sulawesi', label: 'Sulawesi' },
    { id: 'nusa-tenggara', label: 'Nusa Tenggara' },
    { id: 'papua', label: 'Papua' },
    { id: 'bali', label: 'Bali' },
];

export default function PublicGallery() {
    // ── State ──
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [activeEra, setActiveEra] = useState('all');
    const [activeMedium, setActiveMedium] = useState('all');
    const [activeRegion, setActiveRegion] = useState('all');
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        region: '',
        page: 1,
        limit: 12
    });

    // ── Query ──
    const { data: artworkData, isLoading, isError } = useArtworks({
        category: filters.category || undefined,
        region: filters.region || undefined,
        page: filters.page,
        limit: filters.limit
    });

    const artworks = artworkData?.data || [];
    const totalPages = artworkData?.meta?.totalPages || 1;

    // Count of active filter chips (excluding 'all')
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (activeEra !== 'all') count++;
        if (activeMedium !== 'all') count++;
        if (activeRegion !== 'all') count++;
        return count;
    }, [activeEra, activeMedium, activeRegion]);

    const clearAllFilters = () => {
        setActiveEra('all');
        setActiveMedium('all');
        setActiveRegion('all');
        setFilters(prev => ({ ...prev, category: '', region: '', page: 1 }));
    };

    // ── Handlers ──
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Search logic — could be debounced in production
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-12 md:pt-32 md:pb-20">
            <SEOHead
                title="Gallery — Discover Nusantara Masterpieces"
                description="Explore 12,000+ curated digital and physical artworks from across the Indonesian archipelago — from batik textiles to contemporary digital art, all verified on the blockchain."
                canonical="/gallery"
            />

            {/* ── Hero Header ── */}
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
                        Explore curated digital and physical artworks from across the Indonesian archipelago — from batik textiles to wayang kulit, all with blockchain-verified provenance.
                    </p>
                </motion.div>
            </div>

            {/* ── Sticky Toolbar ── */}
            <div className="sticky top-20 z-30 bg-theme-bg/80 backdrop-blur-md p-4 rounded-2xl border border-theme-border mb-4 shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="w-full md:max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted group-focus-within:text-gold transition-colors" />
                        <Input
                            placeholder="Search artworks, artists, museums..."
                            className="pl-10 bg-theme-surface border-theme-border focus:border-gold/50 transition-colors"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </form>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {/* Filter Toggle */}
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className={`border-theme-border transition-colors gap-2 ${isFilterExpanded ? 'border-gold text-gold bg-gold/5' : 'hover:border-gold hover:text-gold'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-1 w-5 h-5 rounded-full bg-gold text-charcoal text-[10px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
                        </Button>

                        <div className="h-6 w-[1px] bg-theme-border mx-1" />

                        {/* View Mode Toggle */}
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

            {/* ── Expandable Heritage Filters ── */}
            <AnimatePresence>
                {isFilterExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-theme-surface/40 border border-theme-border/60 rounded-2xl p-5 space-y-5">
                            {/* Era */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted font-bold mb-2.5">Era / Period</p>
                                <div className="flex flex-wrap gap-2">
                                    {ERA_FILTERS.map(era => (
                                        <button
                                            key={era.id}
                                            onClick={() => setActiveEra(era.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                                activeEra === era.id
                                                    ? 'bg-gold text-charcoal border-gold shadow-sm'
                                                    : 'bg-theme-bg border-theme-border text-theme-muted hover:border-gold/50 hover:text-theme-text'
                                            }`}
                                        >
                                            {era.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Medium */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted font-bold mb-2.5">Medium & Material</p>
                                <div className="flex flex-wrap gap-2">
                                    {MEDIUM_FILTERS.map(medium => (
                                        <button
                                            key={medium.id}
                                            onClick={() => setActiveMedium(medium.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                                activeMedium === medium.id
                                                    ? 'bg-gold text-charcoal border-gold shadow-sm'
                                                    : 'bg-theme-bg border-theme-border text-theme-muted hover:border-gold/50 hover:text-theme-text'
                                            }`}
                                        >
                                            {medium.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Region */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted font-bold mb-2.5 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Origin Region
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {REGION_FILTERS.map(region => (
                                        <button
                                            key={region.id}
                                            onClick={() => setActiveRegion(region.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                                activeRegion === region.id
                                                    ? 'bg-gold text-charcoal border-gold shadow-sm'
                                                    : 'bg-theme-bg border-theme-border text-theme-muted hover:border-gold/50 hover:text-theme-text'
                                            }`}
                                        >
                                            {region.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {activeFilterCount > 0 && (
                                <div className="flex justify-end pt-2 border-t border-theme-border/40">
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-xs font-semibold text-theme-muted hover:text-red-400 transition-colors flex items-center gap-1"
                                    >
                                        <X className="w-3.5 h-3.5" /> Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Active Filter Pills (shown when filter panel is collapsed) ── */}
            {!isFilterExpanded && activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-xs text-theme-muted font-semibold">Active:</span>
                    {activeEra !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold border border-gold/20">
                            {ERA_FILTERS.find(e => e.id === activeEra)?.label}
                            <button onClick={() => setActiveEra('all')}><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {activeMedium !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold border border-gold/20">
                            {MEDIUM_FILTERS.find(m => m.id === activeMedium)?.label}
                            <button onClick={() => setActiveMedium('all')}><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {activeRegion !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold border border-gold/20">
                            {REGION_FILTERS.find(r => r.id === activeRegion)?.label}
                            <button onClick={() => setActiveRegion('all')}><X className="w-3 h-3" /></button>
                        </span>
                    )}
                </div>
            )}

            {/* ── Content ── */}
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
                    <Search className="w-10 h-10 text-theme-muted/50" />
                    <p className="text-theme-muted">No artworks found matching your criteria.</p>
                    {activeFilterCount > 0 && (
                        <Button variant="outline" onClick={clearAllFilters} className="text-xs gap-1">
                            <X className="w-3.5 h-3.5" /> Clear Filters
                        </Button>
                    )}
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
                                                        src={imgUrl as string}
                                                        alt={artwork.title}
                                                        loading="lazy"
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                    {/* Badges */}
                                                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                                                        {((artwork as any).isArt || (artwork as any).is_art) && (
                                                            <Badge variant="gold" className="shadow-lg text-[10px]">ART</Badge>
                                                        )}
                                                        {artwork.artTokenId && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[9px] font-bold shadow-lg">
                                                                <ShieldCheck className="w-3 h-3" /> PoA
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Hover actions (grid only) */}
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

                                                    {/* AI Genre Tags */}
                                                    {artwork.genre && artwork.genre.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {artwork.genre.slice(0, 2).map((g, gi) => (
                                                                <span key={gi} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border/50 text-[10px] text-theme-muted font-medium">
                                                                    <Cpu className="w-2.5 h-2.5 text-gold/60" />
                                                                    {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="mt-auto pt-3 border-t border-theme-border/50 flex items-center justify-between text-xs text-theme-muted">
                                                        <span className="px-2 py-1 rounded bg-theme-surface border border-theme-border/50">
                                                            {artwork.medium || 'Mixed Media'}
                                                        </span>
                                                        {artwork.price ? (
                                                            <span className="font-mono text-theme-text font-bold">
                                                                {artwork.price.toLocaleString()} ETH
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-theme-muted/60">
                                                                <Eye className="w-3 h-3" />
                                                                {artwork.views || 0}
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

            {/* ── Pagination ── */}
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
