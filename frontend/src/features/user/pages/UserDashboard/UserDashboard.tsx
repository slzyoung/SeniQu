/**
 * User Dashboard Page — National Heritage Style
 * Immersive cultural heritage explorer with city-based navigation
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    SlidersHorizontal,
    ChevronRight,
    ChevronLeft,
    MapPin,
    Landmark,
    Compass,
    ArrowRight,
    Sparkles,
    Image as ImageIcon,
} from 'lucide-react';
import {
    useCurrentUser,
    useCollections,
} from '../../../../hooks/useUser';
import { useArtworks } from '../../../../hooks/useArtworks';
import { useMuseums } from '../../../../hooks/useMuseums';
import { extractArray } from '../../../../lib/utils';
import { ROUTES } from '../../../../lib/constants';
import { CITY_WHITELIST } from '../../../../features/gallery/data/citiesRegistry';
import './UserDashboard.css';

// ============================================================
// CITY DATA — Indonesian Heritage Cities
// ============================================================

interface CityData {
    id: string;
    name: string;
    description: string;
    badge?: string;
    image: string;
    featured?: boolean;
}

const CITIES_REGIONAL_KEYWORDS: Record<string, string[]> = {
    jakarta: ['jawa', 'dki', 'capital', 'jabodetabek', 'java', 'pusat', 'selatan', 'barat', 'timur', 'utara'],
    yogyakarta: ['jawa', 'diy', 'jogja', 'java', 'sleman', 'bantul', 'gunungkidul', 'kulon progo'],
    bali: ['bali', 'denpasar', 'nusra', 'nusa tenggara', 'badung', 'ubud', 'gianyar'],
    bandung: ['jawa', 'jabar', 'jawa barat', 'java', 'lembang'],
    surabaya: ['jawa', 'jatim', 'jawa timur', 'java', 'madura'],
    semarang: ['jawa', 'jateng', 'jawa tengah', 'java', 'ungaran', 'ambarawa', 'lawang sewu'],
    medan: ['sumatera', 'sumatra', 'sumut', 'sumatera utara'],
    makassar: ['sulawesi', 'sulsel', 'sulawesi selatan', 'ujung pandang'],
    palembang: ['sumatera', 'sumatra', 'sumsel', 'sumatera selatan'],
    solo: ['jawa', 'surakarta', 'jateng', 'jawa tengah', 'java'],
    malang: ['jawa', 'jatim', 'jawa timur', 'java', 'batu'],
    balikpapan: ['kalimantan', 'kaltim', 'kalimantan timur', 'borneo'],
    samarinda: ['kalimantan', 'kaltim', 'kalimantan timur', 'borneo'],
    manado: ['sulawesi', 'sulut', 'sulawesi utara', 'bunaken'],
    pontianak: ['kalimantan', 'kalbar', 'kalimantan barat', 'borneo'],
    aceh: ['sumatera', 'sumatra', 'nad', 'banda aceh'],
    lampung: ['sumatera', 'sumatra', 'bandar lampung']
};

const HERITAGE_CITIES: CityData[] = Object.entries(CITY_WHITELIST).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    image: meta.image,
    badge: id === 'jakarta' ? 'CAPITAL CITY' :
           id === 'yogyakarta' ? 'HERITAGE HUB' :
           id === 'bali' ? 'SPIRITUAL ISLE' :
           id === 'bandung' ? 'ART DECO CITY' :
           id === 'surabaya' ? 'HERO CITY' : undefined,
    featured: id === 'jakarta',
}));

const HERO_IMAGE = 'https://cdn.seniqu.art/assets/static/hero/bromo.webp';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function ensureImageParams(url: string, width = 1200): string {
    if (!url) return '';
    if (url.includes('unsplash.com') && !url.includes('?')) {
        return `${url}?w=${width}&q=80&auto=format`;
    }
    return url;
}

function getMuseumImage(museum: any): string {
    const raw =
        museum?.coverImageUrl
        || museum?.cover_image_url
        || (museum?.images && museum.images[0])
        || '';
    if (raw) return ensureImageParams(raw);
    return 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400&q=80';
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** City Exploration Card */
function CityCard({
    city,
    index,
    onClick,
}: {
    city: CityData;
    index: number;
    onClick: () => void;
}) {
    return (
        <motion.div
            className={`heritage-city-card heritage-fade-in ${city.featured ? 'heritage-city-card--featured' : 'heritage-city-card--regular'}`}
            onClick={onClick}
            style={{ animationDelay: `${index * 0.1}s` }}
            whileHover={{ y: -4 }}
        >
            <img
                src={city.image}
                alt={city.name}
                className="heritage-city-card__img"
                loading={index < 2 ? 'eager' : 'lazy'}
            />
            <div className="heritage-city-card__gradient" />
            <div className="heritage-city-card__content">
                <h3 className="heritage-city-card__name">{city.name}</h3>
                <p className="heritage-city-card__desc">{city.description}</p>
                {city.badge && (
                    <span className="heritage-city-card__badge">{city.badge}</span>
                )}
                {city.featured && (
                    <button className="heritage-city-card__explore-btn">
                        Discover More <ArrowRight />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

/** Curated Gallery Card */
function GalleryCard({
    museum,
    index,
    onClick,
}: {
    museum: any;
    index: number;
    onClick: () => void;
}) {
    const imgUrl = getMuseumImage(museum);
    const city = museum?.city || museum?.address?.city || 'Indonesia';

    return (
        <motion.div
            className="heritage-gallery-card"
            onClick={onClick}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
                duration: 0.6,
                delay: index * 0.05,
                ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ y: -6, scale: 1.02 }}
        >
            <div className="heritage-gallery-card__img-wrap">
                <img
                    src={imgUrl}
                    alt={museum?.name}
                    className="heritage-gallery-card__img"
                    loading="lazy"
                />
            </div>
            <div className="heritage-gallery-card__info">
                <span className="heritage-gallery-card__eyebrow">
                    {museum?.type || 'Collection'}
                </span>
                <h4 className="heritage-gallery-card__name">
                    {museum?.name || 'Gallery'}
                </h4>
                <p className="heritage-gallery-card__desc">
                    {museum?.description
                        ? museum.description.substring(0, 80) + (museum.description.length > 80 ? '...' : '')
                        : `A curated journey through the artistic heritage of ${city}.`}
                </p>
            </div>
        </motion.div>
    );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export function UserDashboard() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

    const PAGE_SIZE = 7;
    const galleriesRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Fetch real data from API
    const { data: museumsData, isLoading: museumsLoading } = useMuseums({ limit: 8 });

    // Extract arrays safely
    const museums = useMemo(() => {
        const raw = museumsData;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        return extractArray(raw);
    }, [museumsData]);

    // Auto-scroll galleries effect
    useEffect(() => {
        if (isPaused || museums.length === 0) return;

        const interval = setInterval(() => {
            if (galleriesRef.current) {
                const container = galleriesRef.current;
                const maxScroll = container.scrollWidth - container.clientWidth;
                if (maxScroll <= 0) return;

                if (container.scrollLeft >= maxScroll - 10) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollGalleries('right');
                }
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [museums, isPaused]);

    const handleGalleriesScroll = () => {
        if (galleriesRef.current) {
            const container = galleriesRef.current;
            const maxScroll = container.scrollWidth - container.clientWidth;
            if (maxScroll > 0) {
                setScrollProgress(container.scrollLeft / maxScroll);
            }
        }
    };

    const scrollGalleries = (dir: 'left' | 'right') => {
        if (galleriesRef.current) {
            const container = galleriesRef.current;
            const scrollAmount = 340; // Card width + gap
            const targetScroll = container.scrollLeft + (dir === 'left' ? -scrollAmount : scrollAmount);
            container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    };

    // Filter cities based on search (including regional keywords)
    const filteredCities = useMemo(() => {
        if (!searchQuery.trim()) return HERITAGE_CITIES;
        const q = searchQuery.toLowerCase();
        return HERITAGE_CITIES.filter((c) => {
            const nameMatch = c.name.toLowerCase().includes(q);
            const descMatch = c.description.toLowerCase().includes(q);
            const kw = CITIES_REGIONAL_KEYWORDS[c.id] || [];
            const keywordMatch = kw.some(k => k.toLowerCase().includes(q));
            return nameMatch || descMatch || keywordMatch;
        });
    }, [searchQuery]);

    // Reset page to 0 when search query changes
    useEffect(() => {
        setPage(0);
    }, [searchQuery]);

    const pageCount = Math.ceil(filteredCities.length / PAGE_SIZE);

    // Paginate displayed cities
    const displayedCities = useMemo(() => {
        if (searchQuery.trim()) {
            return filteredCities; // Show all matches
        }
        const start = page * PAGE_SIZE;
        return filteredCities.slice(start, start + PAGE_SIZE);
    }, [filteredCities, searchQuery, page]);

    const totalDistricts = museums.length + filteredCities.length;

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 120 : -120,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 120 : -120,
            opacity: 0
        })
    };

    return (
        <motion.div
            className="heritage-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HERO SECTION ====== */}
            <div className="heritage-hero">
                <img
                    src={HERO_IMAGE}
                    alt="National Heritage"
                    className="heritage-hero__bg"
                    loading="eager"
                />
                <div className="heritage-hero__overlay" />
                <div className="heritage-hero__content">
                    <motion.span
                        className="heritage-hero__label"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <Sparkles /> SeniQu Gallery
                    </motion.span>
                    <motion.h1
                        className="heritage-hero__title"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        National Heritage
                    </motion.h1>
                    <motion.p
                        className="heritage-hero__subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.6 }}
                    >
                        Discover the soul of Indonesia through its curated architectural and cultural districts.
                    </motion.p>
                </div>
            </div>

            {/* ====== SEARCH BAR ====== */}
            <motion.div
                className="heritage-search"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <div className="heritage-search__bar">
                    <Search className="heritage-search__icon" />
                    <input
                        type="text"
                        className="heritage-search__input"
                        placeholder="Search heritage districts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="heritage-search__count">
                        {totalDistricts} districts
                    </span>
                    <button className="heritage-search__filter-btn">
                        <SlidersHorizontal /> FILTER
                    </button>
                </div>
            </motion.div>

            {/* ====== EXPLORE BY CITY ====== */}
            <div className="heritage-section">
                <div className="heritage-section__header">
                    <div>
                        <p className="heritage-section__eyebrow">Cultural Atlas</p>
                        <h2 className="heritage-section__title">Explore by City</h2>
                    </div>
                    <button
                        className="heritage-section__see-all"
                        onClick={() => navigate(ROUTES.USER_NEARBY)}
                    >
                        View All Districts <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                <div style={{ position: 'relative', overflow: 'hidden', minHeight: '380px', width: '100%' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={page}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            className="heritage-cities"
                        >
                            {displayedCities.map((city, i) => (
                                <CityCard
                                    key={city.id}
                                    city={city}
                                    index={i}
                                    onClick={() => navigate(`/gallery/city/${city.id}`)}
                                />
                            ))}
                            {displayedCities.length === 0 && (
                                <div className="heritage-empty" style={{ gridColumn: '1 / -1' }}>
                                    <MapPin className="heritage-empty__icon" />
                                    <p className="heritage-empty__text">
                                        No cities match &quot;{searchQuery}&quot;
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Elegant mobile-first Pagination controls for showing 7 cities at a time */}
                {!searchQuery.trim() && pageCount > 1 && (
                    <div className="flex items-center justify-between mt-8 w-full px-4 max-w-md mx-auto">
                        {/* Previous Page */}
                        <button
                            onClick={() => {
                                if (page > 0) {
                                    setDirection(-1);
                                    setPage(prev => prev - 1);
                                }
                            }}
                            disabled={page === 0}
                            className={`p-2.5 rounded-full border border-theme-border/60 text-theme-text/80 hover:text-gold hover:border-gold transition-all active:scale-95 cursor-pointer ${
                                page === 0 ? 'opacity-30 pointer-events-none' : ''
                            }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Page Indicators */}
                        <div className="flex gap-2">
                            {Array.from({ length: pageCount }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setDirection(idx > page ? 1 : -1);
                                        setPage(idx);
                                    }}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                                        page === idx ? 'bg-gold w-6' : 'bg-theme-text/20 hover:bg-theme-text/40'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Show More (Next Page) */}
                        <button
                            onClick={() => {
                                if (page < pageCount - 1) {
                                    setDirection(1);
                                    setPage(prev => prev + 1);
                                } else {
                                    setDirection(-1);
                                    setPage(0);
                                }
                            }}
                            className="px-5 py-2.5 rounded-full border border-gold/40 text-xs font-semibold text-gold hover:border-gold active:scale-95 transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                        >
                            {page === pageCount - 1 ? 'Show First 7' : 'Show More (7)'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* ====== CURATED GALLERIES ====== */}
            <div className="heritage-section">
                <div className="heritage-section__header">
                    <div>
                        <p className="heritage-section__eyebrow">Handpicked</p>
                        <h2 className="heritage-section__title">Curated Galleries</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Scroll buttons */}
                        <button
                            onClick={() => scrollGalleries('left')}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                            className="p-2 rounded-full border border-theme-border/60 text-theme-text/80 hover:text-gold hover:border-gold transition-all active:scale-95 cursor-pointer hidden sm:flex items-center justify-center bg-theme-surface/40 backdrop-blur-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scrollGalleries('right')}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                            className="p-2 rounded-full border border-theme-border/60 text-theme-text/80 hover:text-gold hover:border-gold transition-all active:scale-95 cursor-pointer hidden sm:flex items-center justify-center bg-theme-surface/40 backdrop-blur-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            className="heritage-section__see-all ml-2"
                            onClick={() => navigate(ROUTES.USER_GALLERY)}
                        >
                            View All <ChevronRight style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                </div>

                {museumsLoading ? (
                    <div className="heritage-galleries" ref={galleriesRef}>
                        {[1, 2, 3].map((n) => (
                            <div
                                key={n}
                                className="heritage-skeleton"
                                style={{
                                    flex: '0 0 300px',
                                    height: 120,
                                    borderRadius: 16,
                                }}
                            />
                        ))}
                    </div>
                ) : museums.length > 0 ? (
                    <>
                        <div 
                            className="heritage-galleries" 
                            ref={galleriesRef}
                            onScroll={handleGalleriesScroll}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                            onTouchStart={() => setIsPaused(true)}
                        >
                            {museums.slice(0, 8).map((museum: any, i: number) => (
                                <GalleryCard
                                    key={museum.id || i}
                                    museum={museum}
                                    index={i}
                                    onClick={() =>
                                        navigate(
                                            `/gallery/museum/${museum.slug || museum.id}`
                                        )
                                    }
                                />
                            ))}
                        </div>
                        {/* Scroll Progress Bar */}
                        <div className="w-full flex justify-center mt-2">
                            <div className="w-24 h-1 bg-theme-text/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gold transition-all duration-100 ease-out rounded-full"
                                    style={{ width: `${Math.max(12, scrollProgress * 100)}%` }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="heritage-empty">
                        <Landmark className="heritage-empty__icon" />
                        <p className="heritage-empty__text">
                            No galleries available yet — check back soon!
                        </p>
                        <button
                            className="heritage-empty__action"
                            onClick={() => navigate(ROUTES.GALLERY)}
                        >
                            Explore Public Gallery
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default UserDashboard;
