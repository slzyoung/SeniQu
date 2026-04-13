/**
 * User Dashboard Page — National Heritage Style
 * Immersive cultural heritage explorer with city-based navigation
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    SlidersHorizontal,
    ChevronRight,
    MapPin,
    Landmark,
    Compass,
    ArrowRight,
    Sparkles,
    Image as ImageIcon,
} from 'lucide-react';
import {
    useCurrentUser,
    useBookmarks,
    useCollections,
} from '../../../hooks/useUser';
import { useArtworks } from '../../../hooks/useArtworks';
import { useMuseums } from '../../../hooks/useMuseums';
import { extractArray } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';
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

const HERITAGE_CITIES: CityData[] = [
    {
        id: 'jakarta',
        name: 'Jakarta',
        description: 'Where colonial history meets modern arts. Explore the Old Town\'s colonial architecture and galleries.',
        badge: 'CAPITAL CITY',
        image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1200&q=80',
        featured: true,
    },
    {
        id: 'yogyakarta',
        name: 'Yogyakarta',
        description: 'The heart of Javanese culture and their royal heritage.',
        badge: 'HERITAGE HUB',
        image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80',
    },
    {
        id: 'bali',
        name: 'Bali',
        description: 'Island of arts, temples, and living traditions.',
        badge: 'SPIRITUAL ISLE',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
    },
    {
        id: 'bandung',
        name: 'Bandung',
        description: 'Known for its Art Deco architecture and creative energy.',
        badge: 'ART DECO CITY',
        image: 'https://images.unsplash.com/photo-1580481072645-022f17cc738b?w=1200&q=80',
    },
    {
        id: 'surabaya',
        name: 'Surabaya',
        description: 'The hero city with a rich maritime and trade heritage.',
        badge: 'HERO CITY',
        image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=80',
    },
    {
        id: 'semarang',
        name: 'Semarang',
        description: 'Explore Dutch colonial history and the vibrant Chinatown heritage.',
        image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=1200&q=80',
    },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1800&q=85';

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
            className="heritage-gallery-card heritage-fade-in"
            onClick={onClick}
            style={{ animationDelay: `${index * 0.08}s` }}
            whileHover={{ y: -3 }}
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

    // Filter cities based on search
    const filteredCities = useMemo(() => {
        if (!searchQuery.trim()) return HERITAGE_CITIES;
        const q = searchQuery.toLowerCase();
        return HERITAGE_CITIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const totalDistricts = museums.length + HERITAGE_CITIES.length;

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

                <div className="heritage-cities">
                    {filteredCities.map((city, i) => (
                        <CityCard
                            key={city.id}
                            city={city}
                            index={i}
                            onClick={() => navigate(ROUTES.USER_NEARBY)}
                        />
                    ))}
                    {filteredCities.length === 0 && (
                        <div className="heritage-empty" style={{ gridColumn: '1 / -1' }}>
                            <MapPin className="heritage-empty__icon" />
                            <p className="heritage-empty__text">
                                No cities match &quot;{searchQuery}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== CURATED GALLERIES ====== */}
            <div className="heritage-section">
                <div className="heritage-section__header">
                    <div>
                        <p className="heritage-section__eyebrow">Handpicked</p>
                        <h2 className="heritage-section__title">Curated Galleries</h2>
                    </div>
                    <button
                        className="heritage-section__see-all"
                        onClick={() => navigate(ROUTES.USER_GALLERY)}
                    >
                        View All <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {museumsLoading ? (
                    <div className="heritage-galleries">
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
                    <div className="heritage-galleries">
                        {museums.slice(0, 6).map((museum: any, i: number) => (
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
