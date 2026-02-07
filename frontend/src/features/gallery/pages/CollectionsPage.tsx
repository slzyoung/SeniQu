import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Loader2, ArrowDown } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { MobileNav } from '../../../components/MobileNav';
import { Footer } from '../../../components/Footer';
import { CollectionCard, CollectionData } from '../../../components/CollectionCard';
import { useArtworks } from '../../../hooks/useArtworks';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { Artwork } from '../../../lib/types';

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

export default function CollectionsPage() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [accumulatedArtworks, setAccumulatedArtworks] = useState<CollectionData[]>([]);
    const { ref, isVisible } = useScrollAnimation();

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

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text font-sans transition-colors duration-300 pb-20 md:pb-0">
            <Navbar />

            <main className="pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
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

                {/* Artworks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {accumulatedArtworks.map((collection) => (
                            <CollectionCard
                                key={collection.id}
                                data={collection}
                                isFavorite={favorites.includes(collection.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))}
                    </AnimatePresence>
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
            </main>

            <Footer />
            <MobileNav />
        </div>
    );
}
