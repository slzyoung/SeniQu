import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Loader2, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { CollectionCard, CollectionData } from '../../../components/CollectionCard';
import { useArtworks } from '../../../hooks/useArtworks';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { Artwork } from '../../../lib/types';
import { SEOHead } from '../../../components/common/SEOHead';

// Helper to generate consistent gradients
const getGradient = (index: number) => {
    const gradients = [
        'from-[#3E2723] to-[#5D4037]',
        'from-[#1A237E] to-[#000000]',
        'from-[#424242] to-[#212121]',
        'from-[#880E4F] to-[#4A148C]',
        'from-[#2E7D32] to-[#1B5E20]',
        'from-[#4E342E] to-[#3E2723]',
    ];
    return gradients[index % gradients.length];
};

const CATEGORIES = ['All', 'Painting', 'Sculpture', 'Digital', 'Photography', 'Installation'];

import React from 'react';

export default function CollectionsPage() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [accumulatedArtworks, setAccumulatedArtworks] = useState<CollectionData[]>([]);
    const { ref, isVisible } = useScrollAnimation();
    
    const [isHovered, setIsHovered] = useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Fetch real artworks
    const { data: artworksData, isLoading, isFetching } = useArtworks({
        limit: 12,
        page: page,
        category: activeCategory === 'All' ? undefined : activeCategory
    });

    // Reset accumulation when category changes
    useEffect(() => {
        setPage(1);
        setAccumulatedArtworks([]);
    }, [activeCategory]);

    // Transform and accumulate data
    useEffect(() => {
        if (artworksData?.data) {
            const newItems: CollectionData[] = artworksData.data.map((artwork: Artwork, index: number) => ({
                id: artwork.id,
                category: artwork.genre?.[0] || 'Art',
                title: artwork.title,
                origin: 'Indonesia',
                artist: artwork.artist?.displayName || 'Unknown Artist',
                year: artwork.year?.toString() || new Date().getFullYear().toString(),
                technique: artwork.medium || 'Mixed Media',
                pieces: 1,
                gradient: getGradient(index + (page - 1) * 12),
                pattern: 'radial-gradient(circle, rgba(201, 168, 76, 0.1) 2px, transparent 2px)',
                imageUrl: artwork.images?.find(img => img.isPrimary)?.url || artwork.images?.[0]?.url
            }));

            setAccumulatedArtworks(prev => {
                // Avoid duplicates just in case
                const existingIds = new Set(prev.map(item => item.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                return [...prev, ...uniqueNewItems];
            });
        }
    }, [artworksData, page]);

    const toggleFavorite = (id: string) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const handleLoadMore = () => {
        if (!isFetching && artworksData?.meta && page < artworksData.meta.totalPages) {
            setPage(prev => prev + 1);
        }
    };

    const hasMore = artworksData?.meta ? page < artworksData.meta.totalPages : false;

    // Carousel manual navigation
    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollAmount = clientWidth * 0.85;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Carousel autoplay loop with hover check
    useEffect(() => {
        if (accumulatedArtworks.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            if (scrollContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                if (scrollLeft + clientWidth >= scrollWidth - 25) {
                    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollContainerRef.current.scrollTo({
                        left: scrollLeft + clientWidth * 0.85,
                        behavior: 'smooth'
                    });
                }
            }
        }, 4500);
        return () => clearInterval(interval);
    }, [accumulatedArtworks.length, isHovered]);

    return (
        <PageContainer className="max-w-7xl mx-auto pt-12 px-4 sm:px-6">
            <SEOHead
                title="Collections"
                description="Curated collections of Indonesian heritage artworks including paintings sculptures digital art and verified photography."
                canonical="/collections"
            />
            {/* Header */}
            <div
                ref={ref}
                className={`text-center mb-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="h-[1px] w-8 bg-gold/50" />
                    <span className="text-gold text-xs uppercase tracking-[0.2em] font-medium">
                        Discover
                    </span>
                    <div className="h-[1px] w-8 bg-gold/50" />
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                    Curated <span className="text-gold italic">Collections</span>
                </h1>
                <p className="text-theme-muted max-w-xl mx-auto flex items-center justify-center gap-2">
                    <Filter className="w-4 h-4" />
                    Explore verified masterpieces from the archipelago
                </p>
            </div>

            {/* Category Tabs */}
            <div className="sticky top-20 z-30 bg-theme-bg/80 backdrop-blur-md py-4 -mx-4 px-4 md:mx-0 md:px-0 mb-8 border-b border-theme-border/50">
                <div className="flex overflow-x-auto hide-scrollbar gap-2 md:justify-center">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat
                                ? 'text-charcoal'
                                : 'text-theme-muted hover:text-theme-text bg-theme-surface/50'
                                }`}
                        >
                            {activeCategory === cat && (
                                <motion.div
                                    layoutId="activeCollectionCat"
                                    className="absolute inset-0 bg-gold rounded-full -z-10 shadow-lg shadow-gold/20"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Artworks Carousel */}
            <div 
                className="relative group/slider w-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 md:gap-6 pb-6 pt-2 hide-scrollbar snap-x snap-mandatory scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <AnimatePresence mode="popLayout">
                        {accumulatedArtworks.map((collection) => (
                            <div 
                                key={collection.id} 
                                className="w-[85%] sm:w-[46%] lg:w-[31.8%] flex-shrink-0 snap-center"
                            >
                                <CollectionCard
                                    data={collection}
                                    isFavorite={favorites.includes(collection.id)}
                                    onToggleFavorite={toggleFavorite}
                                />
                            </div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Navigation Overlay Arrows */}
                {accumulatedArtworks.length > 1 && (
                    <>
                        <button
                            onClick={() => handleScroll('left')}
                            className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/75 border border-white/10 text-white hover:text-gold hover:border-gold/50 flex items-center justify-center backdrop-blur-md z-30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.55)] opacity-0 group-hover/slider:opacity-100 focus:opacity-100 hover:scale-105 duration-300"
                            aria-label="Previous artwork"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleScroll('right')}
                            className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/75 border border-white/10 text-white hover:text-gold hover:border-gold/50 flex items-center justify-center backdrop-blur-md z-30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.55)] opacity-0 group-hover/slider:opacity-100 focus:opacity-100 hover:scale-105 duration-300"
                            aria-label="Next artwork"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            {/* Load More Trigger */}
            <div className="mt-12 text-center">
                {isLoading && page === 1 ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                        <span className="text-theme-muted text-sm">Loading collections...</span>
                    </div>
                ) : hasMore ? (
                    <button
                        onClick={handleLoadMore}
                        disabled={isFetching}
                        className="group relative inline-flex items-center gap-2 px-8 py-3 rounded-full border border-gold/30 hover:border-gold bg-transparent text-theme-text hover:text-gold transition-all disabled:opacity-50"
                    >
                        {isFetching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Load More</span>
                                <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                            </>
                        )}
                    </button>
                ) : accumulatedArtworks.length > 0 ? (
                    <span className="text-theme-muted text-sm italic">You've reached the end of the collection.</span>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-theme-muted text-lg">No collections found.</p>
                        <button
                            onClick={() => setActiveCategory('All')}
                            className="mt-4 text-gold hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
