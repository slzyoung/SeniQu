/**
 * PublicNearbyPage — Public Nearby Museum Discovery
 * Standalone page for unauthenticated users at /nearby
 *
 * SECURITY:
 * - No auth store dependency — fully public
 * - Search input sanitized (XSS prevention)
 * - Geolocation rate-limited (max 1 request per 5s)
 * - API queries use staleTime to prevent excessive calls
 * - No sensitive data exposure
 *
 * FEATURES:
 * - Map-first immersive design
 * - Search + filter chips (All, Museum, Gallery, Heritage)
 * - Interactive pins with bottom sheet details
 * - List view toggle
 * - 360° Preview thumbnails
 * - Get Directions + Buy Ticket actions
 * - Light & Dark mode
 * - Fully responsive (mobile-first)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    MapPin,
    Navigation,
    Building2,
    Search,
    Loader2,
    Clock,
    Star,
    Map,
    AlertCircle,
    Layers,
    Locate,
    Plus,
    Minus,
    Compass,
    Users,
    Ticket,
    Image,
    ExternalLink,
    X,
    SlidersHorizontal,
} from 'lucide-react';
import { useMuseums, useNearbyMuseums } from '../../../../hooks/useMuseums';
import { extractArray } from '../../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import './PublicNearbyPage.css';

// ============================================
// TYPES
// ============================================

type FilterType = 'all' | 'museum' | 'gallery' | 'heritage';
type ViewMode = 'map' | 'list';

interface UserLocation {
    latitude: number;
    longitude: number;
}

// ============================================
// SECURITY: Input sanitization
// ============================================

/** Strip HTML tags and limit length to prevent XSS/injection */
function sanitizeInput(input: string, maxLength = 100): string {
    return input
        .replace(/<[^>]*>/g, '')
        .replace(/[<>"'&]/g, '')
        .slice(0, maxLength)
        .trim();
}

// ============================================
// DEMO DATA (fallback when API returns empty)
// ============================================

const DEMO_MUSEUMS = [
    {
        id: 'demo-1',
        name: 'National Museum of Indonesia',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        address: 'Jalan Medan Merdeka Barat No.12',
        type: 'museum',
        rating: 4.8,
        reviewCount: '1.2k',
        totalArtworks: 1500,
        crowdLevel: 'Moderate traffic',
        waitTime: '~15 mins',
        isVerified: true,
        description: 'The largest and most complete museum in Indonesia.',
        coverImageUrl: 'https://images.unsplash.com/photo-1580139446632-ec0e21067462?w=400&h=300&fit=crop',
        previewImages: [
            'https://images.unsplash.com/photo-1580139446632-ec0e21067462?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=200&h=150&fit=crop',
        ],
        latitude: -6.1762,
        longitude: 106.8222,
    },
    {
        id: 'demo-2',
        name: 'Museum of Fine Arts',
        city: 'Yogyakarta',
        province: 'DI Yogyakarta',
        address: 'Jalan Solo No.5, Yogyakarta',
        type: 'gallery',
        rating: 4.6,
        reviewCount: '890',
        totalArtworks: 850,
        crowdLevel: 'Not crowded',
        waitTime: '~5 mins',
        isVerified: true,
        description: 'A premier gallery showcasing contemporary Indonesian fine arts.',
        coverImageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=300&fit=crop',
        previewImages: [
            'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=200&h=150&fit=crop',
        ],
        latitude: -7.7886,
        longitude: 110.3571,
    },
    {
        id: 'demo-3',
        name: 'Borobudur Heritage Center',
        city: 'Magelang',
        province: 'Central Java',
        address: 'Jalan Badrawati, Borobudur',
        type: 'heritage',
        rating: 4.9,
        reviewCount: '3.5k',
        totalArtworks: 2000,
        crowdLevel: 'Busy',
        waitTime: '~25 mins',
        isVerified: true,
        description: 'A UNESCO World Heritage Site and the largest Buddhist temple in the world.',
        coverImageUrl: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&h=300&fit=crop',
        previewImages: [
            'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1555400038-63f5ba517a7b?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=200&h=150&fit=crop',
        ],
        latitude: -7.6079,
        longitude: 110.2038,
    },
];

const FILTER_CHIPS: { id: FilterType; label: string; icon?: any }[] = [
    { id: 'all', label: 'All' },
    { id: 'museum', label: 'Museum', icon: Building2 },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'heritage', label: 'Heritage', icon: Compass },
];

// ============================================
// SUB-COMPONENTS
// ============================================

/** Museum Detail Bottom Sheet */
function MuseumDetailSheet({
    museum,
    expanded,
    onToggle,
    onClose,
}: {
    museum: any;
    expanded: boolean;
    onToggle: () => void;
    onClose: () => void;
}) {
    const crowdColor = museum.crowdLevel?.includes('Busy')
        ? 'pnb-badge--red'
        : museum.crowdLevel?.includes('Moderate')
            ? 'pnb-badge--amber'
            : 'pnb-badge--green';

    return (
        <motion.div
            className={`pnb-sheet ${expanded ? 'pnb-sheet--expanded' : ''}`}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Drag handle */}
            <button className="pnb-sheet__handle" onClick={onToggle} aria-label="Toggle details">
                <span className="pnb-sheet__handle-bar" />
            </button>

            {/* Header */}
            <div className="pnb-sheet__header">
                <div className="pnb-sheet__badges">
                    <span className="pnb-type-badge">{museum.type || 'Museum'}</span>
                    <span className="pnb-rating-badge">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {museum.rating?.toFixed(1) || '4.5'} ({museum.reviewCount || '0'})
                    </span>
                </div>
                <button className="pnb-sheet__close" onClick={onClose}>
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Name + Address */}
            <h2 className="pnb-sheet__name">{museum.name}</h2>
            <p className="pnb-sheet__address">
                <MapPin className="w-3.5 h-3.5" />
                {museum.address || `${museum.city}, ${museum.province || ''}`}
            </p>

            {/* Status pills */}
            <div className="pnb-sheet__status">
                <div className={`pnb-status-pill ${crowdColor}`}>
                    <Users className="w-3.5 h-3.5" />
                    <div>
                        <span className="pnb-status-pill__label">CROWD LEVEL</span>
                        <span className="pnb-status-pill__value">{museum.crowdLevel || 'Normal traffic'}</span>
                    </div>
                </div>
                <div className="pnb-status-pill pnb-badge--blue">
                    <Clock className="w-3.5 h-3.5" />
                    <div>
                        <span className="pnb-status-pill__label">WAIT TIME</span>
                        <span className="pnb-status-pill__value">{museum.waitTime || '~10 mins'}</span>
                    </div>
                </div>
            </div>

            {/* 360° Preview */}
            {(museum.previewImages?.length > 0 || museum.coverImageUrl) && (
                <div className="pnb-preview">
                    <div className="pnb-preview__header">
                        <span>360° Preview</span>
                        <button className="pnb-preview__viewall">View All</button>
                    </div>
                    <div className="pnb-preview__scroll">
                        {(museum.previewImages || [museum.coverImageUrl]).map((img: string, i: number) => (
                            <div key={i} className="pnb-preview__thumb">
                                <img src={img} alt={`Preview ${i + 1}`} loading="lazy" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="pnb-sheet__actions">
                <button
                    className="pnb-action-btn pnb-action-btn--primary"
                    onClick={() => {
                        if (museum.latitude && museum.longitude) {
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${museum.latitude},${museum.longitude}`,
                                '_blank',
                                'noopener,noreferrer'
                            );
                        }
                    }}
                >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                </button>
                <button
                    className="pnb-action-btn pnb-action-btn--secondary"
                    onClick={() => {
                        window.open(`/gallery/museum/${museum.id}`, '_self');
                    }}
                >
                    <Ticket className="w-4 h-4" />
                    Buy Ticket
                </button>
            </div>
        </motion.div>
    );
}

/** Museum List Card */
function MuseumListCard({ museum, onSelect }: { museum: any; onSelect: () => void }) {
    return (
        <motion.div
            className="pnb-list-card"
            onClick={onSelect}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="pnb-list-card__img">
                <img
                    src={museum.coverImageUrl || 'https://images.unsplash.com/photo-1580139446632-ec0e21067462?w=200&h=200&fit=crop'}
                    alt={museum.name}
                    loading="lazy"
                />
                {museum.isVerified && <span className="pnb-list-card__verified">✓</span>}
            </div>
            <div className="pnb-list-card__info">
                <div className="pnb-list-card__top">
                    <span className="pnb-type-badge pnb-type-badge--sm">{museum.type || 'Museum'}</span>
                    {museum.rating && (
                        <span className="pnb-list-card__rating">
                            <Star className="w-3 h-3 fill-current" /> {museum.rating.toFixed(1)}
                        </span>
                    )}
                </div>
                <h3 className="pnb-list-card__name">{museum.name}</h3>
                <p className="pnb-list-card__location">
                    <MapPin className="w-3 h-3" />
                    {museum.city}{museum.province ? `, ${museum.province}` : ''}
                </p>
                <div className="pnb-list-card__meta">
                    {museum.totalArtworks && <span>{museum.totalArtworks} artworks</span>}
                    {museum.crowdLevel && <span className="pnb-list-card__crowd">{museum.crowdLevel}</span>}
                </div>
            </div>
            <ExternalLink className="w-4 h-4 pnb-list-card__arrow" />
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PublicNearbyPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedMuseum, setSelectedMuseum] = useState<any | null>(null);
    const [sheetExpanded, setSheetExpanded] = useState(false);

    // SECURITY: Rate-limit geolocation requests (5s cooldown)
    const lastLocationRequestRef = useRef<number>(0);
    const LOCATION_COOLDOWN_MS = 5000;

    const requestLocation = useCallback(() => {
        const now = Date.now();
        if (now - lastLocationRequestRef.current < LOCATION_COOLDOWN_MS) {
            return; // Throttled
        }
        lastLocationRequestRef.current = now;

        setIsLocating(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                });
                setIsLocating(false);
            },
            (err) => {
                const msgs: Record<number, string> = {
                    1: 'Location permission denied.',
                    2: 'Location unavailable.',
                    3: 'Location request timed out.',
                };
                setLocationError(msgs[err.code] || 'Error getting location.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    // API Queries — staleTime prevents excessive refetching (anti-throttling)
    const { data: nearbyMuseums, isLoading: nearbyLoading } = useNearbyMuseums({
        lat: userLocation?.latitude || 0,
        lng: userLocation?.longitude || 0,
        radius: 25,
    });
    const { data: allMuseums, isLoading: allLoading } = useMuseums({ limit: 20 });

    const rawMuseums = userLocation
        ? extractArray(nearbyMuseums)
        : extractArray(allMuseums);

    // Merge with demo data if API returns nothing
    const mergedMuseums = rawMuseums.length > 0
        ? rawMuseums.map((m: any) => ({
            ...m,
            type: m.type || 'museum',
            crowdLevel: m.crowdLevel || 'Normal traffic',
            waitTime: m.waitTime || '~10 mins',
            reviewCount: m.reviewCount || '0',
            previewImages: m.previewImages || (m.coverImageUrl ? [m.coverImageUrl] : []),
        }))
        : DEMO_MUSEUMS;

    const isLoading = userLocation ? nearbyLoading : allLoading;

    // Filter with sanitized search
    const filteredMuseums = mergedMuseums.filter((m: any) => {
        const matchesFilter = activeFilter === 'all' || m.type === activeFilter;
        const safeQuery = sanitizeInput(searchQuery);
        const matchesSearch = !safeQuery ||
            m.name?.toLowerCase().includes(safeQuery.toLowerCase()) ||
            m.city?.toLowerCase().includes(safeQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Select first museum by default
    useEffect(() => {
        if (!selectedMuseum && filteredMuseums.length > 0) {
            setSelectedMuseum(filteredMuseums[0]);
        }
    }, [filteredMuseums, selectedMuseum]);

    // SECURITY: Handle search input with sanitization
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(sanitizeInput(e.target.value));
    }, []);

    return (
        <div className="pnb-page">
            {/* ===== MAP VIEW ===== */}
            {viewMode === 'map' ? (
                <div className="pnb-map-container">
                    {/* Search + Filter overlay */}
                    <div className="pnb-search-overlay">
                        <div className="pnb-search-bar">
                            <Search className="pnb-search-bar__icon" />
                            <input
                                className="pnb-search-bar__input"
                                type="text"
                                placeholder="Search heritage sites, museums..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                maxLength={100}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <button
                                className="pnb-search-bar__filter"
                                onClick={() => setViewMode('list')}
                                aria-label="Switch to list view"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="pnb-filter-chips">
                            {FILTER_CHIPS.map((chip) => (
                                <button
                                    key={chip.id}
                                    className={`pnb-chip ${activeFilter === chip.id ? 'pnb-chip--active' : ''}`}
                                    onClick={() => setActiveFilter(chip.id)}
                                >
                                    {chip.icon && <chip.icon className="w-3.5 h-3.5" />}
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="pnb-map">
                        <div className="pnb-map__bg">
                            <img
                                src="https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/106.8456,-6.2088,11,0/800x600@2x?access_token=placeholder"
                                alt="Map"
                                className="pnb-map__img"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="pnb-map__fallback" />
                        </div>

                        {/* Museum Pins */}
                        {filteredMuseums.slice(0, 6).map((museum: any, i: number) => (
                            <button
                                key={museum.id}
                                className={`pnb-pin ${selectedMuseum?.id === museum.id ? 'pnb-pin--active' : ''}`}
                                style={{
                                    top: `${18 + (i * 12)}%`,
                                    left: `${15 + (i * 14)}%`,
                                }}
                                onClick={() => {
                                    setSelectedMuseum(museum);
                                    setSheetExpanded(false);
                                }}
                            >
                                <div className="pnb-pin__marker">
                                    <Building2 className="w-3.5 h-3.5" />
                                </div>
                                {selectedMuseum?.id === museum.id && (
                                    <motion.span
                                        className="pnb-pin__label"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {museum.name.length > 18 ? museum.name.slice(0, 18) + '…' : museum.name}
                                    </motion.span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Map Controls */}
                    <div className="pnb-map-controls">
                        <button className="pnb-map-ctrl" onClick={() => setViewMode('list')} aria-label="List view">
                            <Layers className="w-4 h-4" />
                        </button>
                        <button className="pnb-map-ctrl" onClick={requestLocation} aria-label="My location">
                            {isLocating
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Locate className="w-4 h-4" />
                            }
                        </button>
                        <button className="pnb-map-ctrl" aria-label="Zoom in"><Plus className="w-4 h-4" /></button>
                        <button className="pnb-map-ctrl" aria-label="Zoom out"><Minus className="w-4 h-4" /></button>
                    </div>

                    {/* Location error toast */}
                    <AnimatePresence>
                        {locationError && (
                            <motion.div
                                className="pnb-error-toast"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                            >
                                <AlertCircle className="w-4 h-4" />
                                <span>{locationError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom Sheet */}
                    <AnimatePresence>
                        {selectedMuseum && (
                            <MuseumDetailSheet
                                museum={selectedMuseum}
                                expanded={sheetExpanded}
                                onToggle={() => setSheetExpanded(!sheetExpanded)}
                                onClose={() => setSelectedMuseum(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                /* ===== LIST VIEW ===== */
                <div className="pnb-list-container">
                    {/* Header */}
                    <div className="pnb-list-header">
                        <div>
                            <h1 className="pnb-list-header__title">Explore Nearby</h1>
                            <p className="pnb-list-header__subtitle">
                                {filteredMuseums.length} locations found
                            </p>
                        </div>
                        <div className="pnb-list-header__actions">
                            <button className="pnb-map-ctrl" onClick={() => setViewMode('map')} aria-label="Map view">
                                <Map className="w-4 h-4" />
                            </button>
                            <button className="pnb-map-ctrl" onClick={requestLocation} aria-label="My location">
                                {isLocating
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Locate className="w-4 h-4" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Search + Filters */}
                    <div className="pnb-list-search">
                        <div className="pnb-search-bar">
                            <Search className="pnb-search-bar__icon" />
                            <input
                                className="pnb-search-bar__input"
                                placeholder="Search heritage sites, museums..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                maxLength={100}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </div>
                        <div className="pnb-filter-chips">
                            {FILTER_CHIPS.map((chip) => (
                                <button
                                    key={chip.id}
                                    className={`pnb-chip ${activeFilter === chip.id ? 'pnb-chip--active' : ''}`}
                                    onClick={() => setActiveFilter(chip.id)}
                                >
                                    {chip.icon && <chip.icon className="w-3.5 h-3.5" />}
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <div className="pnb-loading">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span>Discovering places...</span>
                        </div>
                    ) : filteredMuseums.length === 0 ? (
                        <div className="pnb-empty">
                            <Building2 className="w-12 h-12" />
                            <h3>No locations found</h3>
                            <p>Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <div className="pnb-list-items">
                            {filteredMuseums.map((museum: any) => (
                                <MuseumListCard
                                    key={museum.id}
                                    museum={museum}
                                    onSelect={() => {
                                        setSelectedMuseum(museum);
                                        setViewMode('map');
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
