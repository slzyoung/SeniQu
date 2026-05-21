/**
 * NearbyMuseumsPage — Explore & Nearby
 * Map-first immersive museum discovery experience
 * Inspired by Google Arts & Culture / Google Maps design
 *
 * Features:
 * - Search bar with filter chips (All, Museum, Gallery, Heritage)
 * - Interactive map placeholder with pins
 * - Bottom sheet with museum details, crowd level, wait time
 * - 360° Preview thumbnails carousel
 * - Action buttons: Get Directions, Buy Ticket
 * - Light & Dark mode compatible
 */

import { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useMuseums, useNearbyMuseums } from '../../../../hooks/useMuseums';
import { extractArray } from '../../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import './NearbyMuseumsPage.css';

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
// DEMO DATA (when no API results)
// ============================================

const DEMO_MUSEUMS = [
    {
        id: '1',
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
        description: 'The largest and most complete museum in Indonesia, displaying over 140,000 objects.',
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
        id: '2',
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
        id: '3',
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

/** Museum Detail Bottom Sheet Card */
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
    const navigate = useNavigate();

    const crowdColor = museum.crowdLevel?.includes('Busy')
        ? 'nbm-badge--red'
        : museum.crowdLevel?.includes('Moderate')
            ? 'nbm-badge--amber'
            : 'nbm-badge--green';

    return (
        <motion.div
            className={`nbm-sheet ${expanded ? 'nbm-sheet--expanded' : ''}`}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Drag handle */}
            <button
                className="nbm-sheet__handle"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onToggle();
                }}
                aria-label="Toggle details"
            >
                <span className="nbm-sheet__handle-bar" />
            </button>

            {/* Header — badge + rating */}
            <div className="nbm-sheet__header">
                <div className="nbm-sheet__badges">
                    <span className="nbm-type-badge">{museum.type || 'Museum'}</span>
                    <span className="nbm-rating-badge">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {museum.rating?.toFixed(1) || '4.5'} ({museum.reviewCount || '0'})
                    </span>
                </div>
                <button
                    className="nbm-sheet__close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}
                    aria-label="Close details"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Name + Address */}
            <h2 className="nbm-sheet__name">{museum.name}</h2>
            <p className="nbm-sheet__address">
                <MapPin className="w-3.5 h-3.5" />
                {museum.address || `${museum.city}, ${museum.province || museum.country}`}
            </p>

            {/* Status pills */}
            <div className="nbm-sheet__status">
                <div className={`nbm-status-pill ${crowdColor}`}>
                    <Users className="w-3.5 h-3.5" />
                    <div>
                        <span className="nbm-status-pill__label">CROWD LEVEL</span>
                        <span className="nbm-status-pill__value">{museum.crowdLevel || 'Normal traffic'}</span>
                    </div>
                </div>
                <div className="nbm-status-pill nbm-badge--blue">
                    <Clock className="w-3.5 h-3.5" />
                    <div>
                        <span className="nbm-status-pill__label">WAIT TIME</span>
                        <span className="nbm-status-pill__value">{museum.waitTime || '~10 mins'}</span>
                    </div>
                </div>
            </div>

            {/* 360° Preview */}
            {(museum.previewImages?.length > 0 || museum.coverImageUrl) && (
                <div className="nbm-preview">
                    <div className="nbm-preview__header">
                        <span>360° Preview</span>
                        <button className="nbm-preview__viewall">View All</button>
                    </div>
                    <div className="nbm-preview__scroll">
                        {(museum.previewImages || [museum.coverImageUrl]).map((img: string, i: number) => (
                            <div key={i} className="nbm-preview__thumb">
                                <img src={img} alt={`Preview ${i + 1}`} loading="lazy" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="nbm-sheet__actions">
                <button
                    className="nbm-action-btn nbm-action-btn--primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        const destLat = museum.coordinates?.lat ?? museum.latitude;
                        const destLng = museum.coordinates?.lng ?? museum.longitude;
                        const latVal = typeof destLat === 'string' ? parseFloat(destLat) : destLat;
                        const lngVal = typeof destLng === 'string' ? parseFloat(destLng) : destLng;

                        if (typeof latVal === 'number' && !isNaN(latVal) && typeof lngVal === 'number' && !isNaN(lngVal)) {
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${latVal},${lngVal}`,
                                '_blank',
                                'noopener,noreferrer'
                            );
                        } else {
                            console.error("Invalid coordinates for directions link");
                        }
                    }}
                >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                </button>
                <button
                    className="nbm-action-btn nbm-action-btn--secondary"
                    onClick={() => navigate(`/gallery/museum/${museum.id}`)}
                >
                    <Ticket className="w-4 h-4" />
                    Buy Ticket
                </button>
            </div>
        </motion.div>
    );
}

/** Museum List Card (for list view) */
function MuseumListCard({ museum, onSelect }: { museum: any; onSelect: () => void }) {
    return (
        <motion.div
            className="nbm-list-card"
            onClick={onSelect}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="nbm-list-card__img">
                <img
                    src={museum.coverImageUrl || museum.logoUrl || 'https://images.unsplash.com/photo-1580139446632-ec0e21067462?w=200&h=200&fit=crop'}
                    alt={museum.name}
                    loading="lazy"
                />
                {museum.isVerified && <span className="nbm-list-card__verified">✓</span>}
            </div>
            <div className="nbm-list-card__info">
                <div className="nbm-list-card__top">
                    <span className="nbm-type-badge nbm-type-badge--sm">{museum.type || 'Museum'}</span>
                    {museum.rating && (
                        <span className="nbm-list-card__rating">
                            <Star className="w-3 h-3 fill-current" /> {museum.rating.toFixed(1)}
                        </span>
                    )}
                </div>
                <h3 className="nbm-list-card__name">{museum.name}</h3>
                <p className="nbm-list-card__location">
                    <MapPin className="w-3 h-3" />
                    {museum.city}{museum.province ? `, ${museum.province}` : ''}
                </p>
                <div className="nbm-list-card__meta">
                    {museum.totalArtworks && (
                        <span>{museum.totalArtworks} artworks</span>
                    )}
                    {museum.crowdLevel && (
                        <span className="nbm-list-card__crowd">{museum.crowdLevel}</span>
                    )}
                </div>
            </div>
            <ExternalLink className="w-4 h-4 nbm-list-card__arrow" />
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NearbyMuseumsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [radius] = useState('100');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedMuseum, setSelectedMuseum] = useState<any | null>(null);
    const [sheetExpanded, setSheetExpanded] = useState(false);

    // Location
    const requestLocation = () => {
        setIsLocating(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            setIsLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
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
    };

    useEffect(() => { requestLocation(); }, []);

    // Queries — use real data if available, fall back to demo
    const { data: nearbyMuseums, isLoading: nearbyLoading } = useNearbyMuseums({
        lat: userLocation?.latitude || 0,
        lng: userLocation?.longitude || 0,
        radius: parseInt(radius),
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

    // Filter
    const filteredMuseums = mergedMuseums.filter((m: any) => {
        const matchesFilter = activeFilter === 'all' || m.type === activeFilter;
        const matchesSearch = !searchQuery ||
            m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.city?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Select first museum by default, and update selection if the current selection is filtered out
    useEffect(() => {
        if (selectedMuseum) {
            const isStillVisible = filteredMuseums.some(m => m.id === selectedMuseum.id);
            if (!isStillVisible) {
                setSelectedMuseum(filteredMuseums.length > 0 ? filteredMuseums[0] : null);
            }
        } else if (filteredMuseums.length > 0) {
            setSelectedMuseum(filteredMuseums[0]);
        }
    }, [filteredMuseums, selectedMuseum]);

    const { isAuthenticated } = useAuthStore();
    // When rendered in PublicLayout (not authenticated), the fixed Navbar needs extra offset
    const isPublic = !isAuthenticated;

    return (
        <div className={`nbm-page ${isPublic ? 'nbm-page--public' : ''}`}>
            {/* ===== MAP VIEW ===== */}
            {viewMode === 'map' ? (
                <div className="nbm-map-container">
                    {/* Search + Filter overlay */}
                    <div className="nbm-search-overlay">
                        <div className="nbm-search-bar">
                            <Search className="nbm-search-bar__icon" />
                            <input
                                className="nbm-search-bar__input"
                                type="text"
                                placeholder="Search heritage sites, museums..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                className="nbm-search-bar__filter"
                                onClick={() => setViewMode('list')}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="nbm-filter-chips">
                            {FILTER_CHIPS.map((chip) => (
                                <button
                                    key={chip.id}
                                    className={`nbm-chip ${activeFilter === chip.id ? 'nbm-chip--active' : ''}`}
                                    onClick={() => setActiveFilter(chip.id)}
                                >
                                    {chip.icon && <chip.icon className="w-3.5 h-3.5" />}
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="nbm-map">
                        {/* Placeholder map background */}
                        <div className="nbm-map__bg">
                            <img
                                src="https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/106.8456,-6.2088,11,0/800x600@2x?access_token=placeholder"
                                alt="Map"
                                className="nbm-map__img"
                                onError={(e) => {
                                    // Fallback to a gradient if Mapbox fails
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="nbm-map__fallback" />
                        </div>

                        {/* Museum Pins */}
                        {filteredMuseums.slice(0, 6).map((museum: any, i: number) => (
                            <button
                                key={museum.id}
                                className={`nbm-pin ${selectedMuseum?.id === museum.id ? 'nbm-pin--active' : ''}`}
                                style={{
                                    top: `${18 + (i * 12)}%`,
                                    left: `${15 + (i * 14)}%`,
                                }}
                                onClick={() => {
                                    setSelectedMuseum(museum);
                                    setSheetExpanded(false);
                                }}
                            >
                                <div className="nbm-pin__marker">
                                    <Building2 className="w-3.5 h-3.5" />
                                </div>
                                {selectedMuseum?.id === museum.id && (
                                    <motion.span
                                        className="nbm-pin__label"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {museum.name.length > 18 ? museum.name.slice(0, 18) + '…' : museum.name}
                                    </motion.span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Map Controls (right side) */}
                    <div className="nbm-map-controls">
                        <button className="nbm-map-ctrl" onClick={() => setViewMode('list')}>
                            <Layers className="w-4 h-4" />
                        </button>
                        <button className="nbm-map-ctrl" onClick={requestLocation}>
                            {isLocating
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Locate className="w-4 h-4" />
                            }
                        </button>
                        <button className="nbm-map-ctrl"><Plus className="w-4 h-4" /></button>
                        <button className="nbm-map-ctrl"><Minus className="w-4 h-4" /></button>
                    </div>

                    {/* Location error toast */}
                    <AnimatePresence>
                        {locationError && (
                            <motion.div
                                className="nbm-error-toast"
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
                <div className="nbm-list-container">
                    {/* Header */}
                    <div className="nbm-list-header">
                        <div>
                            <h1 className="nbm-list-header__title">Explore Nearby</h1>
                            <p className="nbm-list-header__subtitle">
                                {filteredMuseums.length} locations found
                            </p>
                        </div>
                        <div className="nbm-list-header__actions">
                            <button className="nbm-map-ctrl" onClick={() => setViewMode('map')}>
                                <Map className="w-4 h-4" />
                            </button>
                            <button className="nbm-map-ctrl" onClick={requestLocation}>
                                {isLocating
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Locate className="w-4 h-4" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Search + Filters */}
                    <div className="nbm-list-search">
                        <div className="nbm-search-bar">
                            <Search className="nbm-search-bar__icon" />
                            <input
                                className="nbm-search-bar__input"
                                placeholder="Search heritage sites, museums..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="nbm-filter-chips">
                            {FILTER_CHIPS.map((chip) => (
                                <button
                                    key={chip.id}
                                    className={`nbm-chip ${activeFilter === chip.id ? 'nbm-chip--active' : ''}`}
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
                        <div className="nbm-loading">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span>Discovering places...</span>
                        </div>
                    ) : filteredMuseums.length === 0 ? (
                        <div className="nbm-empty">
                            <Building2 className="w-12 h-12" />
                            <h3>No locations found</h3>
                            <p>Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <div className="nbm-list-items">
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

export default NearbyMuseumsPage;
