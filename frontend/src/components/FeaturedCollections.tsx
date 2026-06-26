import React, { useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform
} from
  'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  ArrowRight,
  Heart,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight
} from
  'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { useArtworks } from '../hooks/useArtworks';
import { ROUTES } from '../lib/constants';

interface CollectionData {
  id: string; // Changed to string to match UUID
  category: string;
  title: string;
  origin: string;
  artist: string;
  year: string;
  technique: string;
  pieces: number;
  gradient: string;
  pattern: string;
  imageUrl?: string;
}

const categories = [
  'All',
  'Painting',
  'Sculpture',
  'Digital',
  'Photography',
  'Installation'
];

// Helper to generate consistent gradients based on index
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

interface CollectionCardProps {
  data: CollectionData;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}
const CollectionCard = React.forwardRef<HTMLDivElement, CollectionCardProps>(({
  data,
  isFavorite,
  onToggleFavorite
}, ref) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const navigate = useNavigate();
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), {
    stiffness: 150,
    damping: 20
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), {
    stiffness: 150,
    damping: 20
  });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div
      ref={ref}
      layout
      initial={{
        opacity: 0,
        scale: 0.95
      }}
      animate={{
        opacity: 1,
        scale: 1
      }}
      exit={{
        opacity: 0,
        scale: 0.95
      }}
      transition={{
        duration: 0.35
      }}
      className="relative h-[280px] sm:h-[320px] md:h-[380px] w-full"
      style={{
        perspective: 800
      }}>

      <motion.div
        className="w-full h-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}>

        <GlowCard
          className="h-full rounded-xl md:rounded-2xl overflow-hidden"
          hover={true}>

          <div
            className="relative h-full w-full group cursor-pointer"
            onClick={() => navigate(`/gallery/artwork/${data.id}`)}
          >
            {/* Background Image / Fallback */}
            <div className="absolute inset-0 overflow-hidden bg-theme-elevated">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${data.gradient} transition-transform duration-700 group-hover:scale-110`}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: data.pattern,
                      backgroundSize: '20px 20px'
                    }}
                  />
                </div>
              )}

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-80 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>

            {/* Top Bar Actions */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
              <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] md:text-xs font-medium text-white border border-white/20 shadow-sm">
                {data.category}
              </span>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(data.id);
                }}
                className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${isFavorite ? 'bg-red-500/20 text-red-500 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'}`}
                aria-label={isFavorite ? `Remove ${data.title} from favorites` : `Add ${data.title} to favorites`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            {/* Card Content (Title & Origin) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex flex-col justify-end z-10 pointer-events-none transition-transform duration-500 ease-out md:translate-y-0 md:group-hover:-translate-y-14">
              <h3 className="text-lg md:text-xl font-serif text-white font-bold mb-1.5 group-hover:text-gold transition-colors drop-shadow-md line-clamp-2">
                {data.title}
              </h3>
              <p className="text-xs text-white/80 flex items-center gap-2 drop-shadow-md font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_5px_rgba(201,168,76,0.8)]" />
                {data.origin}
              </p>
            </div>

            {/* Glass Info Bar — Always visible on mobile, slide-up on desktop */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 p-3 md:p-4 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-500 ease-out z-20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-white/90 font-medium">
                    <span className="truncate">{data.artist}</span>
                    <span className="text-white/40">•</span>
                    <span className="whitespace-nowrap text-white/70">{data.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-gold text-[10px] md:text-[11px] font-semibold tracking-wide uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Verified Masterpiece</span>
                  </div>
                </div>
                <button 
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-gold text-black flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all shadow-md"
                  aria-label={`View details of ${data.title}`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </GlowCard>
      </motion.div>
    </motion.div>);
});
CollectionCard.displayName = 'CollectionCard';

export function FeaturedCollections() {
  const { ref, isVisible } = useScrollAnimation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Fetch real artworks
  const { data: artworksData, isLoading } = useArtworks({
    limit: 6,
    category: activeCategory === 'All' ? undefined : activeCategory
  });

  // Map to CollectionData format
  const collections: CollectionData[] = artworksData?.data?.map((artwork: any, index: number) => {
    const imageUrl = artwork.primaryImageUrl || artwork.images?.[0]?.url;

    return {
      id: artwork.id,
      category: artwork.genre?.[0] || 'Art',
      title: artwork.title,
      origin: 'Indonesia', // Static for now as API might not provide
      artist: artwork.artist?.displayName || 'Unknown Artist',
      year: artwork.year?.toString() || new Date().getFullYear().toString(),
      technique: artwork.medium || 'Mixed Media',
      pieces: 1,
      gradient: getGradient(index),
      pattern: 'radial-gradient(circle, rgba(201, 168, 76, 0.1) 2px, transparent 2px)',
      imageUrl: imageUrl
    };
  }) || [];

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const filteredCollections = collections; // Already filtered by API params

  // Carousel manual navigation
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.85; // Scroll 85% of visible width
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Carousel autoplay logic with pause-on-hover best practice
  React.useEffect(() => {
    if (filteredCollections.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 25) {
          // Wrap back smoothly
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
  }, [filteredCollections.length, isHovered]);



  return (
    <section
      id="collections"
      className="py-16 md:py-24 bg-theme-bg relative transition-colors duration-300 overflow-hidden">

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div
          ref={ref}
          className={`text-center mb-8 md:mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
            <div className="h-[1px] w-6 md:w-8 bg-gold/50" />
            <span className="text-gold text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em]">
              Curated Gallery
            </span>
            <div className="h-[1px] w-6 md:w-8 bg-gold/50" />
          </div>
          <h2 className="text-3xl md:text-5xl font-serif text-theme-text mb-3 md:mb-4">
            Featured <span className="text-gold italic">Artworks</span>
          </h2>
          <p className="text-theme-muted text-sm md:text-base max-w-2xl mx-auto flex items-center justify-center gap-2">
            <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Discover our diverse collection of Indonesian masterpieces
          </p>
        </div>

        {/* Category Tabs */}
        <div className="relative mb-8 md:mb-12">
          <div className="flex overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory justify-start md:justify-center gap-2 md:gap-3 -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((cat) =>
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-3.5 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all snap-center whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${activeCategory === cat ? 'text-charcoal' : 'text-theme-muted hover:text-theme-text bg-theme-surface/50 border border-theme-border'}`}>

                {activeCategory === cat &&
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-gold rounded-full -z-10 shadow-[0_0_15px_rgba(201,168,76,0.4)]"
                    transition={{
                      type: 'spring',
                      bounce: 0.2,
                      duration: 0.6
                    }} />

                }
                <span>{cat}</span>
              </button>
            )}
          </div>
          <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-theme-bg to-transparent md:hidden pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-theme-bg to-transparent md:hidden pointer-events-none" />
        </div>

        {/* Grid or Loader */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : (
          <div 
            className="relative group/slider w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Scrollable Carousel Wrapper */}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-4 md:gap-6 pb-6 pt-2 hide-scrollbar snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <AnimatePresence mode="popLayout">
                {filteredCollections.length > 0 ? (
                  filteredCollections.map((collection) => (
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
                  ))
                ) : (
                  <div className="w-full text-center py-10 text-theme-muted snap-center">
                    No artworks found in this category.
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Overlay Arrows */}
            {filteredCollections.length > 1 && (
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
        )}

        {/* View All CTA */}
        <div className="text-center mt-10 md:mt-16">
          <button
            onClick={() => navigate(ROUTES.COLLECTIONS)}
            className="group relative inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full border border-gold text-gold font-medium overflow-hidden transition-all hover:text-charcoal text-sm md:text-base"
          >
            <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10">View All Gallery</span>
            <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>);

}