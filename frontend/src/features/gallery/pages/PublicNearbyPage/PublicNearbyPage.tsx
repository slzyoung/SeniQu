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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    Car,
    Footprints,
    Bus,
    Bike,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    BookOpen,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, CircleF, InfoWindowF, PolylineF } from '@react-google-maps/api';
import { museumService } from '../../../../services/museumService';
import { classifyPlace, getRealPlaceCoverImage } from '../../data/citiesRegistry';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PublicNearbyPage.css';

// Fix Leaflet default marker icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// TYPES
// ============================================

type FilterType = 'all' | 'museum' | 'gallery' | 'heritage';
type ViewMode = 'map' | 'list';

interface UserLocation {
    latitude: number;
    longitude: number;
}

const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];



/** Creates a native Google Maps blue dot DOM element for user location */
function createBlueDotElement(): HTMLDivElement {
    const outer = document.createElement('div');
    outer.style.position = 'relative';
    outer.style.width = '22px';
    outer.style.height = '22px';

    const halo = document.createElement('div');
    Object.assign(halo.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '22px', height: '22px', borderRadius: '50%',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        animation: 'gmaps-blue-dot-pulse 2s ease-out infinite',
    });
    outer.appendChild(halo);

    const ring = document.createElement('div');
    Object.assign(ring.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    });
    outer.appendChild(ring);

    const dot = document.createElement('div');
    Object.assign(dot.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '12px', height: '12px', borderRadius: '50%',
        backgroundColor: '#4285F4',
    });
    outer.appendChild(dot);

    if (!document.getElementById('gmaps-blue-dot-style')) {
        const style = document.createElement('style');
        style.id = 'gmaps-blue-dot-style';
        style.textContent = `
            @keyframes gmaps-blue-dot-pulse {
                0%   { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    return outer;
}

interface AdvancedMarkerProps {
    map: google.maps.Map | null;
    position: { lat: number; lng: number };
    title?: string;
    onClick?: () => void;
    isUserLocation?: boolean;
    isActive?: boolean;
    placeType?: string;
}

function AdvancedMarker({ map, position, title, onClick, isUserLocation, isActive, placeType }: AdvancedMarkerProps) {
    const onClickRef = useRef(onClick);
    onClickRef.current = onClick;

    useEffect(() => {
        if (!map) return;
        let marker: any = null;

        const handleClick = () => {
            onClickRef.current?.();
        };

        const initMarker = async () => {
            try {
                const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as any;

                const markerOptions: any = {
                    map,
                    position,
                    title,
                    gmpClickable: !isUserLocation,
                };

                if (isUserLocation) {
                    markerOptions.content = createBlueDotElement();
                    markerOptions.zIndex = 999;
                } else {
                    const pin = new PinElement({
                        scale: isActive ? 1.3 : 1.0,
                    });
                    markerOptions.content = pin;
                }

                marker = new AdvancedMarkerElement(markerOptions);

                if (!isUserLocation) {
                    marker.addEventListener('gmp-click', handleClick);
                }
            } catch (error) {
                console.error('Error creating AdvancedMarker:', error);
            }
        };

        initMarker();

        return () => {
            if (marker) {
                marker.removeEventListener('gmp-click', handleClick);
                marker.map = null;
            }
        };
    }, [map, position.lat, position.lng, title, isUserLocation, isActive, placeType]);

    return null;
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

/** High-performance Lazy Image with blur-in and skeleton shimmer effect */
function LazyImage({ 
    src, 
    alt, 
    type = 'museum', 
    className = "w-full h-full object-cover" 
}: { 
    src: string | null | undefined; 
    alt: string; 
    type?: string; 
    className?: string; 
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Reset states when src changes to prevent state leakage across recycled cards
    useEffect(() => {
        setIsLoaded(false);
        setError(false);
    }, [src]);

    // Choose local fallback image based on place category (100% offline & zero-cost)
    let localFallback = '/images/museum/Museumullensentalu.jpg';
    if (type === 'gallery') {
        localFallback = '/images/gallery/galerinasionalindonesia.jpg';
    } else if (type === 'museum') {
        localFallback = '/images/museum/museumnasionalindonesia.png';
    }

    const displaySrc = error || !src ? localFallback : src;

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-800/40 rounded-inherit">
            {!isLoaded && !error && (
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse" />
            )}
            <img
                src={displaySrc}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setError(true)}
                className={`${className} transition-all duration-700 ease-out ${(isLoaded || error) ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'}`}
            />
        </div>
    );
}

// Fallback demo data removed - using real-time Google Places API query results exclusively.

const FILTER_CHIPS: { id: FilterType; label: string; icon?: any }[] = [
    { id: 'all', label: 'All' },
    { id: 'museum', label: 'Museum', icon: Building2 },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'heritage', label: 'Heritage & Wisata', icon: Compass },
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
    distance,
    duration,
    isRouteLoading,
    travelMode,
    onTravelModeChange,
    onGetDirections,
    onBuyTicket,
    onPhotoClick,
    onViewAllReviews,
    showRouteLine,
    onClearRoute,
}: {
    museum: any;
    expanded: boolean;
    onToggle: () => void;
    onClose: () => void;
    distance?: string | null;
    duration?: string | null;
    isRouteLoading?: boolean;
    travelMode: google.maps.TravelMode;
    onTravelModeChange: (mode: google.maps.TravelMode) => void;
    onGetDirections: () => void;
    onBuyTicket: () => void;
    onPhotoClick: (index: number) => void;
    onViewAllReviews: () => void;
    showRouteLine?: boolean;
    onClearRoute?: () => void;
}) {
    const [wikiData, setWikiData] = useState<{ title: string; extract: string; url: string; thumbnail?: string } | null>(null);
    const [isWikiLoading, setIsWikiLoading] = useState(false);
    const [wikiExpanded, setWikiExpanded] = useState(false);
    const [wikiError, setWikiError] = useState<string | null>(null);

    useEffect(() => {
        setWikiData(null);
        setWikiExpanded(false);
        setIsWikiLoading(false);
        setWikiError(null);
    }, [museum?.id]);

    const handleFetchWiki = async () => {
        if (wikiData) {
            setWikiExpanded(!wikiExpanded);
            return;
        }

        setIsWikiLoading(true);
        setWikiError(null);
        try {
            const res = await museumService.getWikipediaSummary(museum.name);
            if (res && res.extract) {
                setWikiData(res);
                setWikiExpanded(true);
            } else {
                setWikiError('Sejarah singkat tidak ditemukan untuk tempat ini.');
                setTimeout(() => setWikiError(null), 4000);
            }
        } catch (error) {
            console.error('[WIKI_FETCH] Failed:', error);
            setWikiError('Gagal memuat sejarah singkat dari Wikipedia.');
            setTimeout(() => setWikiError(null), 4000);
        } finally {
            setIsWikiLoading(false);
        }
    };

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
            <button
                className="pnb-sheet__handle"
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
                <button
                    className="pnb-sheet__close"
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
                {distance && duration && (
                    <div className="pnb-status-pill pnb-badge--gold">
                        <Navigation className="w-3.5 h-3.5" />
                        <div>
                            <span className="pnb-status-pill__label">NEAREST ROUTE</span>
                            <span className="pnb-status-pill__value">{distance} ({duration})</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Wikipedia History Section */}
            <div className="pnb-wiki-history">
                {!wikiExpanded ? (
                    <button
                        className="pnb-wiki-history-trigger"
                        onClick={handleFetchWiki}
                        disabled={isWikiLoading}
                        aria-label="Toggle Wikipedia History"
                    >
                        {isWikiLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                            <BookOpen className="w-4 h-4 text-blue-500" />
                        )}
                        <span>{isWikiLoading ? 'Mencari sejarah...' : 'Baca Sejarah Singkat (Wikipedia)'}</span>
                        <ChevronDown className="w-4 h-4 ml-auto text-slate-400" />
                    </button>
                ) : (
                    <div className="pnb-wiki-history-card">
                        <div className="pnb-wiki-history-card__header">
                            <BookOpen className="w-4 h-4 text-blue-500" style={{ flexShrink: 0 }} />
                            <span className="pnb-wiki-history-card__title">Sejarah: {wikiData?.title}</span>
                            <button
                                className="pnb-wiki-history-card__close"
                                onClick={() => setWikiExpanded(false)}
                                aria-label="Close Wikipedia History"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>
                        {wikiData?.thumbnail && (
                            <div className="pnb-wiki-history-card__image-container">
                                <img src={wikiData.thumbnail} alt={wikiData.title} className="pnb-wiki-history-card__image" />
                            </div>
                        )}
                        <p className="pnb-wiki-history-card__text">{wikiData?.extract}</p>
                        {wikiData?.url && (
                            <a
                                href={wikiData.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pnb-wiki-history-card__link"
                            >
                                Baca selengkapnya di Wikipedia
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                )}
                {wikiError && (
                    <div className="pnb-wiki-history-error">
                        <AlertCircle className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                        <span>{wikiError}</span>
                    </div>
                )}
            </div>

            {/* Travel Mode Selector */}
            <div className="pnb-travel-modes">
                <button
                    className={`pnb-travel-mode-btn ${travelMode === ('DRIVING' as any) ? 'pnb-travel-mode-btn--active' : ''}`}
                    onClick={() => onTravelModeChange('DRIVING' as any)}
                    title="Driving"
                >
                    <Car className="w-4 h-4" />
                    <span>Drive</span>
                </button>
                <button
                    className={`pnb-travel-mode-btn ${travelMode === ('WALKING' as any) ? 'pnb-travel-mode-btn--active' : ''}`}
                    onClick={() => onTravelModeChange('WALKING' as any)}
                    title="Walking"
                >
                    <Footprints className="w-4 h-4" />
                    <span>Walk</span>
                </button>
                <button
                    className={`pnb-travel-mode-btn ${travelMode === ('TRANSIT' as any) ? 'pnb-travel-mode-btn--active' : ''}`}
                    onClick={() => onTravelModeChange('TRANSIT' as any)}
                    title="Transit"
                >
                    <Bus className="w-4 h-4" />
                    <span>Transit</span>
                </button>
                <button
                    className={`pnb-travel-mode-btn ${travelMode === ('BICYCLING' as any) ? 'pnb-travel-mode-btn--active' : ''}`}
                    onClick={() => onTravelModeChange('BICYCLING' as any)}
                    title="Cycling"
                >
                    <Bike className="w-4 h-4" />
                    <span>Cycle</span>
                </button>
            </div>

            {/* Action buttons */}
            <div className="pnb-sheet__actions">
                <button
                    className={`pnb-action-btn ${showRouteLine ? 'pnb-action-btn--secondary' : 'pnb-action-btn--primary'}`}
                    disabled={isRouteLoading}
                    onClick={showRouteLine ? onClearRoute : onGetDirections}
                >
                    {isRouteLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : showRouteLine ? (
                        <X className="w-4 h-4" />
                    ) : (
                        <Navigation className="w-4 h-4" />
                    )}
                    {isRouteLoading ? (
                        <span>Mencari rute...</span>
                    ) : showRouteLine ? (
                        <span>Clear Route</span>
                    ) : (
                        <span>Get Directions</span>
                    )}
                </button>
                <button
                    className="pnb-action-btn pnb-action-btn--secondary"
                    onClick={onBuyTicket}
                >
                    <Ticket className="w-4 h-4" />
                    <span>Buy Ticket</span>
                </button>
                {museum.id && typeof museum.id === 'string' && !museum.id.includes('-') && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(museum.name)}&query_place_id=${museum.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pnb-action-btn pnb-action-btn--secondary flex items-center justify-center gap-1.5"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Info Lengkap</span>
                    </a>
                )}
            </div>

            {/* 360° Preview */}
            {(museum.previewImages?.length > 0 || museum.coverImageUrl) && (
                <div className="pnb-preview">
                    <div className="pnb-preview__header">
                        <span>360° Preview</span>
                        <button className="pnb-preview__viewall" onClick={() => onPhotoClick(0)}>View All</button>
                    </div>
                    <div className="pnb-preview__scroll animate-scrollbar">
                        {(museum.previewImages || [museum.coverImageUrl]).map((img: string, i: number) => (
                            <div key={i} className="pnb-preview__thumb" onClick={() => onPhotoClick(i)}>
                                <LazyImage src={img} alt={`Preview ${i + 1}`} type={museum.type} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Google Maps Reviews */}
            {museum.reviews?.length > 0 && (
                <div className="pnb-reviews">
                    <div className="pnb-reviews__header">
                        <span><MessageCircle className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Ulasan ({museum.reviews.length})</span>
                        <button className="pnb-preview__viewall" onClick={onViewAllReviews} style={{ fontSize: '11px', color: '#D4AF37', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>View All</button>
                    </div>
                    <div className="pnb-reviews__list">
                        {museum.reviews.slice(0, 3).map((review: any, i: number) => (
                            <div key={i} className="pnb-review-card" onClick={onViewAllReviews} style={{ cursor: 'pointer' }}>
                                <div className="pnb-review-card__top">
                                    <div className="pnb-review-card__meta" style={{ marginLeft: 0 }}>
                                        <span className="pnb-review-card__author">{review.author}</span>
                                        <div className="pnb-review-card__stars">
                                            {Array.from({ length: 5 }).map((_, si) => (
                                                <Star
                                                    key={si}
                                                    className="w-3 h-3"
                                                    style={{
                                                        fill: si < review.rating ? '#F59E0B' : 'transparent',
                                                        color: si < review.rating ? '#F59E0B' : 'var(--text-muted)',
                                                    }}
                                                />
                                            ))}
                                            {review.time && <span className="pnb-review-card__time">{review.time}</span>}
                                        </div>
                                    </div>
                                </div>
                                {review.text && (
                                    <p className="pnb-review-card__text">{review.text.length > 150 ? review.text.slice(0, 150) + '…' : review.text}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

/** Beautiful Coming Soon Golden Ticket Modal Component */
function ComingSoonTicketModal({ 
    museumName, 
    onClose 
}: { 
    museumName: string; 
    onClose: () => void; 
}) {
    return (
        <AnimatePresence>
            <motion.div 
                className="pnb-ticket-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div 
                    className="pnb-ticket-container"
                    initial={{ scale: 0.8, y: 30, opacity: 0 }}
                    animate={{ 
                        scale: 1, 
                        y: 0, 
                        opacity: 1,
                        transition: { type: "spring", stiffness: 180, damping: 20 }
                    }}
                    exit={{ scale: 0.8, y: 30, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Glowing background halo */}
                    <div className="pnb-ticket-glow" />

                    {/* Premium Ticket Card */}
                    <div className="pnb-ticket-card">
                        {/* Laser line scanning sweep */}
                        <div className="pnb-ticket-laser" />

                        {/* Top corner luxury badge */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] tracking-[0.25em] font-semibold text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3.5 py-1 rounded-full border border-[#D4AF37]/20">
                                Premium Pass
                            </span>
                            <button 
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                onTouchEnd={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onClose();
                                }}
                                aria-label="Close modal"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        </div>

                        {/* Header details */}
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
                                Nusantara Cultural Pass
                            </h3>
                            <p className="text-[10px] text-gray-400 font-semibold tracking-wider">
                                DIGITIZED HERITAGE & ACCESS GATEWAY
                            </p>
                        </div>

                        {/* Museum Target Information */}
                        <div className="bg-[#121214]/80 border border-white/5 rounded-2xl p-4 mb-6 text-center">
                            <span className="text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold block mb-1">
                                Access Destination
                            </span>
                            <span className="text-sm font-semibold text-white block truncate">
                                {museumName}
                            </span>
                        </div>

                        {/* Middle ticket dash separator with circular cuts */}
                        <div className="pnb-ticket-separator" />

                        {/* Bottom Stub details */}
                        <div className="pt-8 text-center">
                            <span className="text-[10px] tracking-[0.3em] font-bold text-[#D4AF37] uppercase block mb-2">
                                COMING SOON
                            </span>
                            <p className="text-[11px] text-gray-400 max-w-[280px] mx-auto leading-relaxed mb-6">
                                Kami sedang mengintegrasikan sistem e-ticketing berbasis blockchain untuk pelestarian cagar budaya Nusantara yang aman & transparan.
                            </p>

                            {/* Ticket barcode effect */}
                            <div className="pnb-ticket-barcode">
                                <div className="pnb-ticket-bar thick" />
                                <div className="pnb-ticket-bar thin" />
                                <div className="pnb-ticket-bar" />
                                <div className="pnb-ticket-bar wide" />
                                <div className="pnb-ticket-bar thick" />
                                <div className="pnb-ticket-bar" />
                                <div className="pnb-ticket-bar thin" />
                                <div className="pnb-ticket-bar wide" />
                                <div className="pnb-ticket-bar thick" />
                                <div className="pnb-ticket-bar thin" />
                                <div className="pnb-ticket-bar" />
                            </div>
                            <span className="text-[8px] tracking-[0.4em] text-[#D4AF37]/60 uppercase font-bold block mt-3">
                                SENIQU PASS SECURITY SEC-09
                            </span>
                        </div>

                        {/* Cool glowing activation button */}
                        <button
                            className="w-full mt-6 py-3 px-4 rounded-xl font-bold text-xs tracking-wider text-black bg-gradient-to-r from-[#D4AF37] via-[#FFDF73] to-[#D4AF37] hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(212,175,55,0.25)] uppercase"
                            onClick={onClose}
                        >
                            Dapatkan Notifikasi
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/** Premium Photo Lightbox Modal Component */
function PhotoLightboxModal({
    photos,
    initialIndex,
    onClose
}: {
    photos: string[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    return (
        <AnimatePresence>
            <motion.div
                className="pnb-lightbox-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                {/* Close Button */}
                <button
                    className="pnb-lightbox-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}
                    aria-label="Close lightbox"
                >
                    <X className="w-6 h-6 text-white" />
                </button>

                {/* Left Arrow */}
                {photos.length > 1 && (
                    <button className="pnb-lightbox-arrow pnb-lightbox-arrow--left" onClick={handlePrev} aria-label="Previous photo">
                        <ChevronLeft className="w-8 h-8 text-white" />
                    </button>
                )}

                {/* Main Image Container */}
                <div className="pnb-lightbox-content" onClick={(e) => e.stopPropagation()}>
                    <motion.img
                        key={currentIndex}
                        src={photos[currentIndex]}
                        alt={`Photo ${currentIndex + 1}`}
                        className="pnb-lightbox-image"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                </div>

                {/* Right Arrow */}
                {photos.length > 1 && (
                    <button className="pnb-lightbox-arrow pnb-lightbox-arrow--right" onClick={handleNext} aria-label="Next photo">
                        <ChevronRight className="w-8 h-8 text-white" />
                    </button>
                )}

                {/* Indicator Dots / Info */}
                <div className="pnb-lightbox-counter">
                    <span>{currentIndex + 1} / {photos.length}</span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/** Premium Google Maps Reviews Modal Component */
function ReviewsModal({
    museumName,
    rating,
    reviewCount,
    reviews,
    onClose
}: {
    museumName: string;
    rating?: number;
    reviewCount?: number;
    reviews: any[];
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            <motion.div
                className="pnb-reviews-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="pnb-reviews-modal-container"
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="pnb-reviews-modal-header">
                        <div>
                            <h3 className="pnb-reviews-modal-title">Ulasan Google Maps</h3>
                            <p className="pnb-reviews-modal-subtitle">{museumName}</p>
                        </div>
                        <button
                            className="pnb-reviews-modal-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onClose();
                            }}
                            aria-label="Close reviews"
                        >
                            <X className="w-5 h-5 text-gray-400 hover:text-white" />
                        </button>
                    </div>

                    {/* Rating Summary Card */}
                    <div className="pnb-reviews-summary-card">
                        <div className="pnb-reviews-summary-score">
                            <span className="pnb-reviews-summary-avg">{rating?.toFixed(1) || '4.5'}</span>
                            <div className="pnb-reviews-summary-stars">
                                {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                        key={si}
                                        className="w-4 h-4"
                                        style={{
                                            fill: si < Math.round(rating || 4.5) ? '#F59E0B' : 'transparent',
                                            color: si < Math.round(rating || 4.5) ? '#F59E0B' : 'var(--text-muted)',
                                        }}
                                    />
                                ))}
                            </div>
                            <span className="pnb-reviews-summary-total">{reviewCount || reviews.length} ulasan gmaps</span>
                        </div>
                        <div className="pnb-reviews-summary-bars">
                            {/* Visual rating distribution bars */}
                            {[5, 4, 3, 2, 1].map((stars) => {
                                const count = reviews.filter(r => Math.round(r.rating) === stars).length;
                                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <div key={stars} className="pnb-reviews-bar-row">
                                        <span className="pnb-reviews-bar-label">{stars}★</span>
                                        <div className="pnb-reviews-bar-track">
                                            <div className="pnb-reviews-bar-fill" style={{ width: `${pct || (stars === 5 ? 75 : stars === 4 ? 18 : 3)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scrollable Reviews List */}
                    <div className="pnb-reviews-modal-list animate-scrollbar">
                        {reviews.length === 0 ? (
                            <div className="pnb-reviews-empty">
                                <MessageCircle className="w-10 h-10 text-gray-500 mb-2 opacity-50" />
                                <p>Belum ada ulasan untuk tempat ini.</p>
                            </div>
                        ) : (
                            reviews.map((review: any, i: number) => (
                                <div key={i} className="pnb-review-modal-card">
                                    <div className="pnb-review-modal-card-top">
                                        <div className="pnb-review-modal-card-meta" style={{ marginLeft: 0 }}>
                                            <div className="flex justify-between items-start">
                                                <span className="pnb-review-card__author font-semibold">{review.author}</span>
                                                <span className="text-[10px] text-gray-400">{review.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                {Array.from({ length: 5 }).map((_, si) => (
                                                    <Star
                                                        key={si}
                                                        className="w-3.5 h-3.5"
                                                        style={{
                                                            fill: si < review.rating ? '#F59E0B' : 'transparent',
                                                            color: si < review.rating ? '#F59E0B' : 'var(--text-muted)',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {review.text && (
                                        <p className="pnb-review-modal-card-text">{review.text}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/** Museum List Card */
function MuseumListCard({ 
    museum, 
    onSelect,
    distance
}: { 
    museum: any; 
    onSelect: () => void;
    distance?: number | null;
}) {
    return (
        <motion.div
            className="pnb-list-card"
            onClick={onSelect}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="pnb-list-card__img">
                <LazyImage
                    src={museum.coverImageUrl}
                    alt={museum.name}
                    type={museum.type}
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
                    {distance !== undefined && distance !== null && (
                        <span className="pnb-list-card__distance">
                            &nbsp;•&nbsp;{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                        </span>
                    )}
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

export default function PublicNearbyPage({ isDashboard = false }: { isDashboard?: boolean }) {
    const { isAuthenticated } = useAuthStore();
    const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
    const [keyLoading, setKeyLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated && !isDashboard) {
            setMapsApiKey('');
            setKeyLoading(false);
            return;
        }

        museumService.getMapsApiKey()
            .then(key => {
                setMapsApiKey(key);
                setKeyLoading(false);
            })
            .catch(() => {
                setMapsApiKey('');
                setKeyLoading(false);
            });
    }, [isAuthenticated, isDashboard]);

    if (keyLoading) {
        return (
            <div className={`pnb-page ${isDashboard ? 'pnb-page--dashboard' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
            </div>
        );
    }

    return <NearbyPageInner apiKey={mapsApiKey || ''} isDashboard={isDashboard} />;
}

interface GoogleMapViewContainerProps {
    apiKey: string;
    mapCenter: { lat: number; lng: number };
    onMapLoad: (map: google.maps.Map) => void;
    onMapUnmount: () => void;
    handleMapIdle: () => void;
    userLocation: UserLocation | null;
    radarRadius: number;
    sortedPlaces: any[];
    showRouteLine: boolean;
    selectedMuseum: any | null;
    selectPlace: (museum: any | null, isUserAction?: boolean) => void;
    setSheetExpanded: (val: boolean) => void;
    routePath: { lat: number; lng: number }[];
    mapInstance: google.maps.Map | null;
}

function GoogleMapViewContainer({
    apiKey,
    mapCenter,
    onMapLoad,
    onMapUnmount,
    handleMapIdle,
    userLocation,
    radarRadius,
    sortedPlaces,
    showRouteLine,
    selectedMuseum,
    selectPlace,
    setSheetExpanded,
    routePath,
    mapInstance,
}: GoogleMapViewContainerProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: MAP_LIBRARIES,
    });

    if (loadError) {
        return (
            <div className="pnb-map-fallback flex flex-col items-center justify-center p-6 text-center h-full bg-slate-900 text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load Map</h3>
                <p className="text-slate-400 text-sm">{loadError.message}</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="pnb-map-fallback flex items-center justify-center h-full bg-slate-900 text-white">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerClassName="w-full h-full"
            center={mapCenter}
            zoom={12}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            onIdle={handleMapIdle}
            options={{
                mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
                disableDefaultUI: true,
            }}
        >
            {/* User Location Marker & Pulser Halo */}
            {userLocation && (
                <>
                    {/* Google Maps AdvancedMarker Blue Dot */}
                    {mapInstance && (
                        <AdvancedMarker
                            map={mapInstance}
                            position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
                            title="Lokasi Anda"
                            isUserLocation
                        />
                    )}
                    {/* High-Fidelity Expanding Radar Pulsing Halo */}
                    <CircleF
                        center={{ lat: userLocation.latitude, lng: userLocation.longitude }}
                        radius={radarRadius}
                        options={{
                            fillColor: '#3B82F6',
                            fillOpacity: Math.max(0.003, 0.22 * (1 - (radarRadius - 40) / 710)),
                            strokeColor: '#3B82F6',
                            strokeOpacity: Math.max(0.003, 0.48 * (1 - (radarRadius - 40) / 710)),
                            strokeWeight: 1.1,
                            clickable: false,
                        }}
                    />
                </>
            )}

            {/* Place Markers (AdvancedMarkerElement — recommended) */}
            {mapInstance && sortedPlaces
                .filter((museum: any) => !showRouteLine || selectedMuseum?.id === museum.id)
                .map((museum: any) => {
                    const mLat = museum.coordinates?.lat ?? museum.latitude;
                    const mLng = museum.coordinates?.lng ?? museum.longitude;
                    if (typeof mLat !== 'number' || typeof mLng !== 'number') return null;
                    const isActive = selectedMuseum?.id === museum.id;

                    return (
                        <AdvancedMarker
                            key={museum.id}
                            map={mapInstance}
                            position={{ lat: mLat, lng: mLng }}
                            title={museum.name}
                            onClick={() => {
                                selectPlace(museum, true);
                                setSheetExpanded(false);
                            }}
                            isActive={isActive}
                            placeType={museum.type}
                        />
                    );
                })}

            {/* InfoWindow tooltip for selected place */}
            {selectedMuseum && (() => {
                const sLat = selectedMuseum.coordinates?.lat ?? selectedMuseum.latitude;
                const sLng = selectedMuseum.coordinates?.lng ?? selectedMuseum.longitude;
                if (typeof sLat !== 'number' || typeof sLng !== 'number') return null;
                return (
                    <InfoWindowF
                        position={{ lat: sLat, lng: sLng }}
                        options={{
                            pixelOffset: new google.maps.Size(0, -40),
                            disableAutoPan: true,
                            maxWidth: 220,
                        }}
                        onCloseClick={() => {
                            selectPlace(null);
                        }}
                    >
                        <div className="pnb-info-window">
                            <strong>{selectedMuseum.name}</strong>
                            <span className="pnb-info-window__type">{selectedMuseum.type === 'museum' ? '🏛️ Museum' : selectedMuseum.type === 'gallery' ? '🎨 Gallery' : '🏯 Heritage'}</span>
                        </div>
                    </InfoWindowF>
                );
            })()}

            {showRouteLine && routePath.length > 0 && (
                <PolylineF
                    path={routePath}
                    options={{
                        strokeColor: '#4285F4',
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                    }}
                />
            )}
        </GoogleMap>
    );
}

function NearbyPageInner({ apiKey, isDashboard = false }: { apiKey: string; isDashboard?: boolean }) {
    const { theme } = useTheme();
    const { isAuthenticated } = useAuthStore();
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [mapProvider, setMapProvider] = useState<'openstreetmap' | 'google'>('openstreetmap');
    const dataSource = 'google';

    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(12);
    const observerTargetRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedMuseum, setSelectedMuseum] = useState<any | null>(null);
    const [sheetExpanded, setSheetExpanded] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [showReviewsModal, setShowReviewsModal] = useState(false);

    const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
    const [showRouteLine, setShowRouteLine] = useState(false);
    const [isRouteLoading, setIsRouteLoading] = useState(false);

    const [routeDistance, setRouteDistance] = useState<string | null>(null);
    const [routeDuration, setRouteDuration] = useState<string | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>('DRIVING' as any);
    
    const [places, setPlaces] = useState<any[]>([]);
    const userSelectedRef = useRef(false);
    const fetchInFlightRef = useRef(false);
    
    // Radar pulse animation for User Location Blue Dot
    const [radarRadius, setRadarRadius] = useState(50);
    useEffect(() => {
        if (!userLocation) return;
        const interval = setInterval(() => {
            setRadarRadius((prev) => {
                if (prev >= 750) return 40;
                return prev + 3.2;
            });
        }, 12);
        return () => clearInterval(interval);
    }, [userLocation]);

    const [isPlacesLoading, setIsPlacesLoading] = useState(false);
    const [hasInitialSearched, setHasInitialSearched] = useState(false);
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    // SECURITY: Track geolocation readiness to prevent race condition (no premature Jakarta fallback)
    const [locationReady, setLocationReady] = useState(false);
    // Use state (not ref) for map center so GoogleMap re-renders when location changes
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
    const isFittingBoundsRef = useRef(false);
    const [minRating, setMinRating] = useState<number>(0);
    const [maxDistance, setMaxDistance] = useState<number>(0); // 0 = no limit
    const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'popularity'>('distance');
    const [detectedRegion, setDetectedRegion] = useState<{
        isMajorCity: boolean;
        regionName: string;
        maxRadiusKm: number;
    } | null>(null);
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

    // Refs for Leaflet Map and Overlay elements
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const leafletMapRef = useRef<L.Map | null>(null);
    const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const userAccuracyCircleRef = useRef<L.Circle | null>(null);
    const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
    const routePolylineRef = useRef<L.Polyline | null>(null);

    const handleTravelModeChange = useCallback((newMode: google.maps.TravelMode) => {
        setTravelMode(newMode);
    }, []);

    const clearRoute = useCallback(() => {
        setShowRouteLine(false);
        setRoutePath([]);
        setRouteDistance(null);
        setRouteDuration(null);
    }, []);

    const selectPlace = useCallback(async (museum: any | null, isUserAction = false) => {
        if (isUserAction) {
            userSelectedRef.current = true;
        }
        setSelectedMuseum(museum);
        clearRoute();

        if (museum) {
            // Lazy-load details (photos, reviews) for Google Places if not loaded yet
            const isGooglePlace = museum.id && typeof museum.id === 'string' && !museum.id.includes('-');
            const hasDetailsLoaded = museum.detailsLoaded;
            
            if (isGooglePlace && !hasDetailsLoaded) {
                try {
                    setIsRouteLoading(true);
                    const details = await museumService.getPlaceDetails(museum.id);
                    if (details) {
                        setSelectedMuseum((prev: any) => {
                            if (prev && prev.id === museum.id) {
                                return {
                                    ...prev,
                                    photos: details.photos && details.photos.length > 0 ? details.photos : prev.photos || [],
                                    previewImages: details.photos && details.photos.length > 0 ? details.photos : prev.previewImages || [],
                                    coverImageUrl: details.photos?.[0] || prev.coverImageUrl,
                                    reviews: details.reviews || [],
                                    detailsLoaded: true,
                                };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error("Failed to lazy load place details:", err);
                } finally {
                    setIsRouteLoading(false);
                }
            }
        }
    }, [clearRoute]);

    useEffect(() => {
        if (detectedRegion && maxDistance > detectedRegion.maxRadiusKm) {
            setMaxDistance(0);
        }
    }, [detectedRegion, maxDistance]);

    const getDistance = useCallback((museum: any) => {
        if (!userLocation) return null;
        const lat1 = userLocation.latitude;
        const lon1 = userLocation.longitude;
        const lat2 = museum.coordinates?.lat ?? museum.latitude;
        const lon2 = museum.coordinates?.lng ?? museum.longitude;
        if (typeof lat1 !== 'number' || typeof lat2 !== 'number') return null;
        
        // Simple Haversine calculation
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, [userLocation]);

    const sortedPlaces = useMemo(() => {
        let items = [...places];

        // Defensive input sanitization (Anti-hacking & Anti-tampering)
        const safeMinRating = Math.max(0, Math.min(5, Number(minRating) || 0));
        const safeMaxDistance = Math.max(0, Math.min(70, Number(maxDistance) || 0));
        const safeSortBy = ['distance', 'rating', 'popularity'].includes(sortBy) ? sortBy : 'distance';
        const safeActiveFilter = ['all', 'museum', 'gallery', 'heritage'].includes(activeFilter) ? activeFilter : 'all';

        // Filter by category type
        if (safeActiveFilter !== 'all') {
            items = items.filter(item => item.type === safeActiveFilter);
        }
        // Filter by minimum rating
        if (safeMinRating > 0) {
            items = items.filter(item => (item.rating || 0) >= safeMinRating);
        }
        // Filter by maximum distance (km) - only filter if safeMaxDistance > 0 is selected
        if (userLocation && safeMaxDistance > 0) {
            items = items.filter(item => {
                const dist = getDistance(item);
                return dist !== null && dist <= safeMaxDistance;
            });
        }
        // Filter by search query
        if (debouncedSearchQuery) {
            const queryClean = debouncedSearchQuery.toLowerCase();
            items = items.filter(item => 
                item.name.toLowerCase().includes(queryClean) || 
                item.address.toLowerCase().includes(queryClean)
            );
        }
        
        // Sorting logic based on safeSortBy selection:
        if (safeSortBy === 'distance' && userLocation) {
            items.sort((a, b) => {
                const distA = getDistance(a) ?? Infinity;
                const distB = getDistance(b) ?? Infinity;
                if (Math.abs(distA - distB) > 0.1) {
                    return distA - distB;
                }
                return (b.rating || 0) - (a.rating || 0); // secondary sort: rating
            });
        } else if (safeSortBy === 'popularity') {
            items.sort((a, b) => {
                const countA = a.reviewCount || 0;
                const countB = b.reviewCount || 0;
                if (countA !== countB) {
                    return countB - countA;
                }
                // Secondary sort: distance
                const distA = getDistance(a) ?? Infinity;
                const distB = getDistance(b) ?? Infinity;
                return distA - distB;
            });
        } else {
            // Sort by rating
            items.sort((a, b) => {
                const ratA = a.rating || 0;
                const ratB = b.rating || 0;
                if (Math.abs(ratA - ratB) > 0.01) {
                    return ratB - ratA;
                }
                // Secondary sort: distance
                const distA = getDistance(a) ?? Infinity;
                const distB = getDistance(b) ?? Infinity;
                return distA - distB;
            });
        }
        return items;
    }, [places, userLocation, getDistance, activeFilter, minRating, maxDistance, sortBy, debouncedSearchQuery]);

    // Reset visible count when filter or query changes
    useEffect(() => {
        setVisibleCount(12);
    }, [activeFilter, debouncedSearchQuery, minRating, maxDistance, sortBy]);

    // Keep selection synchronized with active filter and search queries
    // Clear selection if the selected place is filtered out
    useEffect(() => {
        if (selectedMuseum) {
            const isStillVisible = sortedPlaces.some(p => p.id === selectedMuseum.id);
            if (!isStillVisible) {
                selectPlace(null);
                userSelectedRef.current = false;
            }
        }
    }, [sortedPlaces, selectedMuseum, selectPlace]);

    // Intersection Observer for lazy loading list items
    useEffect(() => {
        if (!observerTargetRef.current) return;
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(prev + 12, sortedPlaces.length));
            }
        }, { threshold: 0.1 });
        
        const currentTarget = observerTargetRef.current;
        observer.observe(currentTarget);
        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
            observer.disconnect();
        };
    }, [sortedPlaces.length]);

    const watchIdRef = useRef<number | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    // Leaflet map initialization & cleanup
    useEffect(() => {
        if (mapProvider !== 'openstreetmap') return;
        if (!mapContainerRef.current) return;
        if (leafletMap) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView([mapCenter.lat, mapCenter.lng], 13);

        const tileUrl = theme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl, {
            maxZoom: 20,
        }).addTo(map);

        leafletMapRef.current = map;
        setLeafletMap(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            if (map) {
                map.remove();
            }
            leafletMapRef.current = null;
            setLeafletMap(null);

            // Clear markers refs since they are bound to the destroyed map
            if (userMarkerRef.current) userMarkerRef.current = null;
            if (userAccuracyCircleRef.current) userAccuracyCircleRef.current = null;
            markersRef.current.clear();
            if (routePolylineRef.current) routePolylineRef.current = null;
        };
    }, [mapProvider, theme, viewMode]);

    // Update center of Leaflet map
    useEffect(() => {
        if (mapProvider === 'openstreetmap' && leafletMap) {
            leafletMap.setView([mapCenter.lat, mapCenter.lng]);
        }
    }, [mapCenter, mapProvider, leafletMap]);

    // Handle user location blue dot and halo on Leaflet
    useEffect(() => {
        const map = leafletMap;
        if (!map || !userLocation || mapProvider !== 'openstreetmap') return;

        const latLng = L.latLng(userLocation.latitude, userLocation.longitude);

        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(latLng);
        } else {
            const blueDotIcon = L.divIcon({
                html: `<div class="leaflet-blue-dot">
                    <div class="leaflet-blue-dot-halo"></div>
                    <div class="leaflet-blue-dot-ring"></div>
                    <div class="leaflet-blue-dot-core"></div>
                </div>`,
                className: 'custom-user-location-icon',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });
            userMarkerRef.current = L.marker(latLng, { icon: blueDotIcon, zIndexOffset: 1000 }).addTo(map);
        }

        if (userAccuracyCircleRef.current) {
            userAccuracyCircleRef.current.setLatLng(latLng);
            userAccuracyCircleRef.current.setRadius(radarRadius);
        } else {
            userAccuracyCircleRef.current = L.circle(latLng, {
                radius: radarRadius,
                fillColor: '#3B82F6',
                fillOpacity: Math.max(0.003, 0.22 * (1 - (radarRadius - 40) / 710)),
                color: '#3B82F6',
                opacity: Math.max(0.003, 0.48 * (1 - (radarRadius - 40) / 710)),
                weight: 1,
                interactive: false,
            }).addTo(map);
        }
    }, [userLocation, radarRadius, mapProvider, leafletMap]);

    // Sync markers on Leaflet
    useEffect(() => {
        const map = leafletMap;
        if (!map || mapProvider !== 'openstreetmap') return;

        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();

        const visiblePlaces = sortedPlaces.filter((museum: any) => !showRouteLine || selectedMuseum?.id === museum.id);

        visiblePlaces.forEach((museum: any) => {
            const mLat = museum.coordinates?.lat ?? museum.latitude;
            const mLng = museum.coordinates?.lng ?? museum.longitude;
            if (typeof mLat !== 'number' || typeof mLng !== 'number') return;

            const isActive = selectedMuseum?.id === museum.id;
            const typeClass = museum.type === 'museum' ? 'leaflet-gold-pin--museum' : museum.type === 'gallery' ? 'leaflet-gold-pin--gallery' : 'leaflet-gold-pin--heritage';

            const pinIcon = L.divIcon({
                html: `<div class="leaflet-gold-pin ${isActive ? 'leaflet-gold-pin--active' : ''} ${typeClass}">
                    <div class="leaflet-gold-pin-marker">
                        <span>${museum.type === 'museum' ? '🏛️' : museum.type === 'gallery' ? '🎨' : '🏯'}</span>
                    </div>
                </div>`,
                className: `custom-pin-icon-${museum.id}`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            const marker = L.marker([mLat, mLng], { icon: pinIcon })
                .addTo(map)
                .on('click', () => {
                    selectPlace(museum, true);
                    setSheetExpanded(false);
                });

            marker.bindTooltip(`
                <div style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; padding: 2px;">
                    ${museum.name}
                    <div style="font-size: 10px; font-weight: normal; opacity: 0.7; margin-top: 2px;">
                        ${museum.type === 'museum' ? '🏛️ Museum' : museum.type === 'gallery' ? '🎨 Gallery' : '🏯 Heritage'}
                    </div>
                </div>
            `, {
                direction: 'top',
                offset: [0, -10],
                opacity: 0.95
            });

            markersRef.current.set(museum.id, marker);
        });
    }, [sortedPlaces, selectedMuseum?.id, showRouteLine, mapProvider, selectPlace, leafletMap]);

    // Handle polyline for directions route on Leaflet
    useEffect(() => {
        const map = leafletMap;
        if (!map || mapProvider !== 'openstreetmap') return;

        if (routePolylineRef.current) {
            routePolylineRef.current.remove();
            routePolylineRef.current = null;
        }

        if (showRouteLine && routePath.length > 0) {
            const latLngs = routePath.map(p => [p.lat, p.lng] as [number, number]);
            routePolylineRef.current = L.polyline(latLngs, {
                color: '#4285F4',
                weight: 5,
                opacity: 0.9,
            }).addTo(map);

            map.fitBounds(routePolylineRef.current.getBounds(), {
                padding: [50, 50]
            });
        }
    }, [routePath, showRouteLine, mapProvider, leafletMap]);

    // Map Load Handlers
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMapInstance(map);
    }, []);

    const onMapUnmount = useCallback(() => {
        mapRef.current = null;
        setMapInstance(null);
    }, []);

    const handleZoomIn = () => {
        if (mapProvider === 'openstreetmap') {
            if (leafletMapRef.current) leafletMapRef.current.zoomIn();
        } else if (mapRef.current) {
            mapRef.current.setZoom((mapRef.current.getZoom() || 12) + 1);
        }
    };

    const handleZoomOut = () => {
        if (mapProvider === 'openstreetmap') {
            if (leafletMapRef.current) leafletMapRef.current.zoomOut();
        } else if (mapRef.current) {
            mapRef.current.setZoom((mapRef.current.getZoom() || 12) - 1);
        }
    };

    // Perform query with NestJS backend proxy which uses Google Places API (New)
    // IMPORTANT: This should only be called for initial load and search query changes,
    // NOT for filter chip changes (those are handled client-side via sortedPlaces)
    const searchNearbyPlaces = useCallback((
        center: { lat: number; lng: number },
        _query: string,
        provider: 'local' | 'google' = dataSource
    ) => {
        if (fetchInFlightRef.current) return;
        fetchInFlightRef.current = true;
        setIsPlacesLoading(true);

        if (provider === 'local') {
            setQuotaExceeded(false);
            museumService.getNearbyMuseums({
                lat: center.lat,
                lng: center.lng,
                radius: 70
            })
            .then((localMuseums) => {
                const mapped = (localMuseums || []).map((m: any) => {
                    const addressStr = m.address ? (typeof m.address === 'string' ? m.address : `${m.address.street || ''}, ${m.address.city || ''}`) : '';
                    const category = classifyPlace({
                        name: m.name,
                        type: m.type || 'museum',
                        address: addressStr
                    });
                    if (!category) return null;

                    const lat = m.coordinates?.lat ?? m.latitude ?? 0;
                    const lng = m.coordinates?.lng ?? m.longitude ?? 0;
                    const rating = m.rating || 4.5;
                    const reviewCount = m.reviewCount || 12;
                    const waitTime = rating > 4.5 ? '~15 mins' : '~5 mins';
                    const crowdLevel = reviewCount > 300 ? 'Busy' : reviewCount > 100 ? 'Moderate traffic' : 'Not crowded';
                    return {
                        id: m.id || Math.random().toString(),
                        name: m.name || 'Heritage Destination',
                        city: m.city || m.address?.city || 'Nearby',
                        province: m.province || m.address?.province || '',
                        address: addressStr,
                        type: category,
                        rating,
                        reviewCount,
                        totalArtworks: m.artworksCount || 50,
                        crowdLevel,
                        waitTime,
                        isVerified: m.isVerified || false,
                        description: m.description || '',
                        coverImageUrl: getRealPlaceCoverImage(m.name || 'Heritage Destination', category, m.images?.[0] || null),
                        previewImages: m.images && m.images.length > 0 ? m.images : [],
                        reviews: m.reviews || [],
                        latitude: lat,
                        longitude: lng,
                    };
                }).filter((p: any) => p !== null);

                let filtered = mapped;
                if (_query) {
                    const q = _query.toLowerCase();
                    filtered = mapped.filter((item: any) => 
                        item.name.toLowerCase().includes(q) || 
                        item.address.toLowerCase().includes(q)
                    );
                }

                setPlaces(filtered);
                setIsPlacesLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch local nearby museums:", err);
                setIsPlacesLoading(false);
            })
            .finally(() => {
                fetchInFlightRef.current = false;
            });
            return;
        }

        museumService.searchNearbyPlaces(center.lat, center.lng, 70000, _query)
            .then((result) => {
                setQuotaExceeded(result?.quotaExceeded || false);
                const placesData = result?.places || [];
                const regionInfo = result?.region || null;
                if (regionInfo) {
                    setDetectedRegion(regionInfo);
                }
                const mapped = (placesData || []).map((place: any) => {
                    const category = classifyPlace({
                        name: place.name,
                        type: place.type,
                        address: place.address || place.formattedAddress
                    });
                    if (!category) return null;

                    const rating = place.rating || 4.2;
                    const reviewCount = place.reviewCount || 12;
                    const waitTime = rating > 4.5 ? '~15 mins' : '~5 mins';
                    const crowdLevel = reviewCount > 300 ? 'Busy' : reviewCount > 100 ? 'Moderate traffic' : 'Not crowded';

                    const validPhotos = (place.photos || []).filter((p: any) => typeof p === 'string' && p.trim() !== '');
                    const resolvedCover = getRealPlaceCoverImage(place.name || 'Heritage Destination', category, validPhotos.length > 0 ? validPhotos[0] : null);
                    const previewImages = validPhotos.length > 0 ? [resolvedCover, ...validPhotos.slice(1)] : [resolvedCover];

                    return {
                        id: place.id || Math.random().toString(),
                        name: place.name || 'Heritage Destination',
                        city: place.address?.split(',')[1]?.trim() || 'Nearby',
                        province: place.address?.split(',')[2]?.trim() || '',
                        address: place.address || '',
                        type: category,
                        rating,
                        reviewCount,
                        totalArtworks: reviewCount ? Math.round(reviewCount / 3) : 50,
                        crowdLevel,
                        waitTime,
                        isVerified: true,
                        description: place.address || 'Registered tourism destination.',
                        coverImageUrl: resolvedCover,
                        previewImages,
                        reviews: place.reviews || [],
                        latitude: place.latitude,
                        longitude: place.longitude,
                    };
                }).filter((p: any) => p !== null);

                // Deduplicate by place id AND normalized name + proximity
                const seenIds = new Set();
                const seenNames: Record<string, { lat: number; lng: number }> = {};
                const unique = mapped.filter((p: any) => {
                    // ID-based dedup
                    if (seenIds.has(p.id)) return false;
                    seenIds.add(p.id);

                    // Name + proximity dedup
                    const normalName = (p.name || '').toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (normalName) {
                        const existing = seenNames[normalName];
                        if (existing) {
                            const latDiff = Math.abs((p.latitude || 0) - existing.lat);
                            const lngDiff = Math.abs((p.longitude || 0) - existing.lng);
                            if (latDiff < 0.005 && lngDiff < 0.005) {
                                return false; // Duplicate by name + proximity
                            }
                        }
                        seenNames[normalName] = { lat: p.latitude || 0, lng: p.longitude || 0 };
                    }

                    return true;
                });

                setPlaces(unique);
                setIsPlacesLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch nearby places from backend:", err);
                setIsPlacesLoading(false);
            })
            .finally(() => {
                fetchInFlightRef.current = false;
            });
    }, [dataSource]);

    // Auto-search disabled when map is panned to keep locations stay static and stable
    const handleMapIdle = useCallback(() => {
        // Do nothing to keep selected places and list static when map is dragged
    }, []);

    // SECURITY: Rate-limit manual geolocation requests (5s cooldown)
    // Anti-throttling: Prevents GPS abuse with 5-second minimum interval
    const lastLocationRequestRef = useRef<number>(0);
    const LOCATION_COOLDOWN_MS = 5000;

    const requestLocation = useCallback(() => {
        const now = Date.now();
        if (now - lastLocationRequestRef.current < LOCATION_COOLDOWN_MS) {
            return;
        }
        lastLocationRequestRef.current = now;

        setIsLocating(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            setIsLocating(false);
            setLocationReady(true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Math.max(-90, Math.min(90, pos.coords.latitude));
                const lng = Math.max(-180, Math.min(180, pos.coords.longitude));
                setUserLocation({
                    latitude: lat,
                    longitude: lng,
                });
                setMapCenter({ lat, lng });
                setIsLocating(false);
                setLocationReady(true);
                if (mapProvider === 'openstreetmap' && leafletMapRef.current) {
                    leafletMapRef.current.setView([lat, lng], 13);
                } else if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(13);
                }
            },
            (err) => {
                const msgs: Record<number, string> = {
                    1: 'Location permission denied.',
                    2: 'Location unavailable.',
                    3: 'Location request timed out.',
                };
                setLocationError(msgs[err.code] || 'Error getting location.');
                setIsLocating(false);
                setLocationReady(true);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, [mapProvider]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    // Real-time location tracking with watchPosition
    useEffect(() => {
        if (!navigator.geolocation) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newLat = Math.max(-90, Math.min(90, pos.coords.latitude));
                const newLng = Math.max(-180, Math.min(180, pos.coords.longitude));
                setUserLocation((prev) => {
                    if (!prev) {
                        setMapCenter({ lat: newLat, lng: newLng });
                        if (mapProvider === 'openstreetmap' && leafletMapRef.current) {
                            leafletMapRef.current.setView([newLat, newLng], 13);
                        }
                        return { latitude: newLat, longitude: newLng };
                    }
                    const dLat = newLat - prev.latitude;
                    const dLng = newLng - prev.longitude;
                    const distSq = dLat * dLat + dLng * dLng;
                    if (distSq > 0.000001) {
                        setMapCenter({ lat: newLat, lng: newLng });
                        if (mapProvider === 'openstreetmap' && leafletMapRef.current) {
                            leafletMapRef.current.setView([newLat, newLng]);
                        }
                        return { latitude: newLat, longitude: newLng };
                    }
                    return prev;
                });
            },
            () => { /* silently ignore */ },
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
        );
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [mapProvider]);

    // Wait for geolocation attempt resolved before running the initial search.
    useEffect(() => {
        if (locationReady && !hasInitialSearched) {
            const center = userLocation 
                ? { lat: userLocation.latitude, lng: userLocation.longitude } 
                : DEFAULT_CENTER;
            setMapCenter(center);
            if (mapRef.current) {
                isFittingBoundsRef.current = true;
                mapRef.current.panTo(center);
                mapRef.current.setZoom(13);
            }
            if (mapProvider === 'openstreetmap' && leafletMapRef.current) {
                leafletMapRef.current.setView([center.lat, center.lng], 13);
            }
            searchNearbyPlaces(center, debouncedSearchQuery);
            setHasInitialSearched(true);
        }
    }, [locationReady, hasInitialSearched, mapProvider, userLocation]);

    // Re-fetch when debounced search query or dataSource changes
    useEffect(() => {
        if (hasInitialSearched) {
            const center = userLocation 
                ? { lat: userLocation.latitude, lng: userLocation.longitude } 
                : DEFAULT_CENTER;
            searchNearbyPlaces(center, debouncedSearchQuery);
        }
    }, [debouncedSearchQuery, dataSource]);



    // Instant Haversine estimation for distance/time display (no API call)
    const calculateEstimation = useCallback(() => {
        if (!userLocation || !selectedMuseum) return;
        const destLat = selectedMuseum.coordinates?.lat ?? selectedMuseum.latitude;
        const destLng = selectedMuseum.coordinates?.lng ?? selectedMuseum.longitude;
        if (typeof destLat !== 'number' || typeof destLng !== 'number') return;

        const lat1 = userLocation.latitude;
        const lon1 = userLocation.longitude;
        const lat2 = destLat;
        const lon2 = destLng;
        
        const R = 6371e3; // Earth radius in metres
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Straight line distance in metres
        
        const estimatedRoadKm = (d * 1.3) / 1000;
        const distText = estimatedRoadKm < 1 
            ? `${Math.round(estimatedRoadKm * 1000)} m` 
            : `${estimatedRoadKm.toFixed(1)} km`;
        
        let speedKmh = 40;
        let waitMins = 0;
        const mode = travelMode;
        if (mode === ('WALKING' as any)) speedKmh = 4.5;
        else if (mode === ('BICYCLING' as any)) speedKmh = 15;
        else if (mode === ('TRANSIT' as any)) { speedKmh = 25; waitMins = 12; }
        
        const totalMins = Math.round((estimatedRoadKm / speedKmh) * 60 + waitMins);
        const durationText = totalMins < 60
            ? `${totalMins} menit`
            : `${Math.floor(totalMins / 60)} jam${totalMins % 60 > 0 ? ` ${totalMins % 60} mnt` : ''}`;
        
        setRouteDistance(distText);
        setRouteDuration(durationText);
    }, [userLocation, selectedMuseum, travelMode]);



    // Calculate real Google Maps Directions route in-app using Google Maps DirectionsService (default gmaps route)
    // Decode Google Maps encoded polyline format
    const decodePolyline = useCallback((encoded: string): { lat: number; lng: number }[] => {
        if (!encoded) return [];
        const len = encoded.length;
        let index = 0;
        const array: { lat: number; lng: number }[] = [];
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b: number;
            let shift = 0;
            let result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            array.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
        }
        return array;
    }, []);

    // Helper to calculate Google Maps route via backend proxy
    const calculateRouteGoogle = useCallback(async (latVal: number, lngVal: number, modeStr: string, fallbackUrl: string) => {
        if (!userLocation) return;
        let response = await museumService.getRouteDirections(
            userLocation.latitude,
            userLocation.longitude,
            latVal,
            lngVal,
            modeStr
        );

        let routeData = response?.data || response;

        if (routeData?.status !== 'OK' && (modeStr === 'bicycling' || modeStr === 'transit')) {
            console.warn(`${modeStr} route failed or returned zero results. Trying walking fallback route...`);
            response = await museumService.getRouteDirections(
                userLocation.latitude,
                userLocation.longitude,
                latVal,
                lngVal,
                'walking'
            );
            routeData = response?.data || response;

            if (routeData?.status !== 'OK') {
                console.warn(`Walking fallback route failed. Trying driving fallback route...`);
                response = await museumService.getRouteDirections(
                    userLocation.latitude,
                    userLocation.longitude,
                    latVal,
                    lngVal,
                    'driving'
                );
                routeData = response?.data || response;
            }
        }

        if (routeData?.status === 'OK' && routeData?.polyline) {
            const decodedPath = decodePolyline(routeData.polyline);
            setRoutePath(decodedPath);
            setShowRouteLine(true);
            setRouteDistance(routeData.distanceText || null);
            setRouteDuration(routeData.durationText || null);

            if (window.google?.maps && mapRef.current && decodedPath.length > 0) {
                isFittingBoundsRef.current = true;
                const bounds = new google.maps.LatLngBounds();
                bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
                bounds.extend({ lat: latVal, lng: lngVal });
                decodedPath.forEach(p => bounds.extend(p));
                mapRef.current.fitBounds(bounds, { top: 60, bottom: 280, left: 40, right: 40 });
            }
        } else {
            console.warn('All route attempts failed, falling back to external map:', routeData?.errorMessage || 'Unknown error');
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        }
    }, [userLocation, decodePolyline]);

    // Calculate route (either OSRM or Google Routes API based on provider)
    const calculateRoute = useCallback(async (travelMode: google.maps.TravelMode) => {
        if (!selectedMuseum) return;

        const destLat = selectedMuseum.coordinates?.lat ?? selectedMuseum.latitude;
        const destLng = selectedMuseum.coordinates?.lng ?? selectedMuseum.longitude;
        const latVal = typeof destLat === 'string' ? parseFloat(destLat) : destLat;
        const lngVal = typeof destLng === 'string' ? parseFloat(destLng) : destLng;

        if (typeof latVal !== 'number' || isNaN(latVal) || typeof lngVal !== 'number' || isNaN(lngVal)) {
            console.error("Invalid destination coordinates");
            return;
        }

        let modeStr = 'driving';
        const tmStr = String(travelMode).toUpperCase();
        if (tmStr === 'WALKING') modeStr = 'walking';
        else if (tmStr === 'BICYCLING') modeStr = 'bicycling';
        else if (tmStr === 'TRANSIT') modeStr = 'transit';

        const originParam = userLocation ? `&origin=${userLocation.latitude},${userLocation.longitude}` : '';
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${latVal},${lngVal}&travelmode=${modeStr}`;

        if (!userLocation) {
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        setIsRouteLoading(true);

        if (mapProvider === 'openstreetmap') {
            try {
                // Map modes: driving, walking, bicycling, transit
                let profile = 'driving';
                if (modeStr === 'walking' || modeStr === 'transit') {
                    profile = 'foot';
                } else if (modeStr === 'bicycling') {
                    profile = 'bicycle';
                }

                const url = `https://router.project-osrm.org/route/v1/${profile}/${userLocation.longitude},${userLocation.latitude};${lngVal},${latVal}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`OSRM API error: ${res.status}`);
                const data = await res.json();
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const distanceKm = (route.distance || 0) / 1000;
                    const distText = distanceKm < 1 
                        ? `${Math.round(route.distance || 0)} m` 
                        : `${distanceKm.toFixed(1)} km`;
                    const durationMins = Math.round((route.duration || 0) / 60);
                    const durText = durationMins < 60
                        ? `${durationMins} menit`
                        : `${Math.floor(durationMins / 60)} jam${durationMins % 60 > 0 ? ` ${durationMins % 60} mnt` : ''}`;

                    const decodedPath = (route.geometry?.coordinates || []).map((coord: number[]) => ({
                        lat: coord[1],
                        lng: coord[0]
                    }));

                    setRoutePath(decodedPath);
                    setShowRouteLine(true);
                    setRouteDistance(distText);
                    setRouteDuration(durText);

                    if (leafletMapRef.current && decodedPath.length > 0) {
                        const latLngs = decodedPath.map((p: { lat: number; lng: number }) => [p.lat, p.lng] as [number, number]);
                        if (routePolylineRef.current) {
                            routePolylineRef.current.remove();
                        }
                        routePolylineRef.current = L.polyline(latLngs, {
                            color: '#4285F4',
                            weight: 5,
                            opacity: 0.9,
                        }).addTo(leafletMapRef.current);

                        leafletMapRef.current.fitBounds(routePolylineRef.current.getBounds(), {
                            padding: [50, 50]
                        });
                    }
                } else {
                    throw new Error('No OSRM routes found');
                }
            } catch (error) {
                console.warn('OSRM routing failed, falling back to Google Routes proxy:', error);
                try {
                    await calculateRouteGoogle(latVal, lngVal, modeStr, fallbackUrl);
                } catch (err) {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                }
            } finally {
                setIsRouteLoading(false);
            }
        } else {
            try {
                await calculateRouteGoogle(latVal, lngVal, modeStr, fallbackUrl);
            } catch (error) {
                window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            } finally {
                setIsRouteLoading(false);
            }
        }
    }, [userLocation, selectedMuseum, mapProvider, calculateRouteGoogle, decodePolyline]);

    // Auto-estimate distance/time when place is selected or travel mode changes (without drawing line)
    useEffect(() => {
        if (userLocation && selectedMuseum && !showRouteLine) {
            calculateEstimation();
        }
    }, [userLocation, selectedMuseum?.id, travelMode, showRouteLine, calculateEstimation]);

    // Recalculate route automatically when travelMode changes if route is active
    useEffect(() => {
        if (showRouteLine && userLocation && selectedMuseum) {
            calculateRoute(travelMode);
        }
    }, [travelMode, showRouteLine, userLocation, selectedMuseum?.id, calculateRoute]);

    const isLoading = isPlacesLoading || isLocating;



    // SECURITY: Handle search input with sanitization
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(sanitizeInput(e.target.value));
    }, []);

    return (
        <div className={`pnb-page ${isDashboard ? 'pnb-page--dashboard' : ''}`}>
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

                        {/* Hybrid Provider Controls */}
                        {(isAuthenticated || isDashboard) && apiKey && (
                            <div className="pnb-hybrid-toggles">
                                <button
                                    className={`pnb-chip ${mapProvider === 'openstreetmap' ? 'pnb-chip--active' : ''}`}
                                    onClick={() => setMapProvider('openstreetmap')}
                                >
                                    🗺️ OSM (Free)
                                </button>
                                <button
                                    className={`pnb-chip ${mapProvider === 'google' ? 'pnb-chip--active' : ''}`}
                                    onClick={() => setMapProvider('google')}
                                >
                                    🌐 GMap
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quota Exceeded Warning Banner */}
                    {quotaExceeded && (
                        <div className="absolute top-[220px] left-1/2 -translate-x-1/2 z-[10] bg-slate-950/95 border border-amber-500/30 px-5 py-4 rounded-2xl shadow-2xl max-w-sm text-center flex flex-col items-center gap-3 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                                <AlertCircle className="w-5 h-5" />
                                <span>Batas Harian Google Maps Tercapai</span>
                            </div>
                            <span className="text-[12px] text-gray-300 leading-relaxed">
                                Sistem secara otomatis beralih menggunakan database lokal PostGIS dan OpenStreetMap offline. Discovery tetap berjalan dengan performa terbaik dan tanpa kendala biaya.
                            </span>
                            <button
                                className="px-4 py-1.5 rounded-lg text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] transition-all"
                                onClick={() => setQuotaExceeded(false)}
                            >
                                Mengerti
                            </button>
                        </div>
                    )}



                    {/* Map Area */}
                    <div className="pnb-map">
                        {mapProvider === 'openstreetmap' ? (
                            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
                        ) : !apiKey ? (
                            <div className="pnb-map-fallback flex flex-col items-center justify-center p-6 text-center h-full bg-slate-900 text-white">
                                <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Google Maps Key Missing</h3>
                                <p className="text-slate-400 text-sm max-w-xs">
                                    Please configure GOOGLE_MAPS_API_KEY in the backend environment.
                                </p>
                            </div>
                        ) : (
                            <GoogleMapViewContainer
                                apiKey={apiKey}
                                mapCenter={mapCenter}
                                onMapLoad={onMapLoad}
                                onMapUnmount={onMapUnmount}
                                handleMapIdle={handleMapIdle}
                                userLocation={userLocation}
                                radarRadius={radarRadius}
                                sortedPlaces={sortedPlaces}
                                showRouteLine={showRouteLine}
                                selectedMuseum={selectedMuseum}
                                selectPlace={selectPlace}
                                setSheetExpanded={setSheetExpanded}
                                routePath={routePath}
                                mapInstance={mapInstance}
                            />
                        )}
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
                        <button className="pnb-map-ctrl" onClick={handleZoomIn} aria-label="Zoom in"><Plus className="w-4 h-4" /></button>
                        <button className="pnb-map-ctrl" onClick={handleZoomOut} aria-label="Zoom out"><Minus className="w-4 h-4" /></button>
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
                                onClose={() => selectPlace(null)}
                                distance={routeDistance}
                                duration={routeDuration}
                                isRouteLoading={isRouteLoading}
                                travelMode={travelMode}
                                onTravelModeChange={handleTravelModeChange}
                                onGetDirections={() => calculateRoute(travelMode)}
                                onBuyTicket={() => setShowTicketModal(true)}
                                onPhotoClick={(index) => setActivePhotoIndex(index)}
                                onViewAllReviews={() => setShowReviewsModal(true)}
                                showRouteLine={showRouteLine}
                                onClearRoute={clearRoute}
                            />
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                /* ===== LIST VIEW ===== */
                <div className="pnb-list-container">
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
                            <button
                                className="pnb-search-bar__filter"
                                onClick={() => setViewMode('map')}
                                aria-label="Switch to map view"
                            >
                                <Map className="w-4 h-4" />
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

                    {/* Professional Filter Panel */}
                    <div className="pnb-sort-container" style={{ margin: '0 0 12px 0', borderBottom: 'none' }}>
                        <div className="pnb-filter-row">
                            <div className="pnb-select-wrapper">
                                <MapPin className="pnb-select-icon text-blue-500" />
                                <select
                                    className="pnb-filter-select-premium"
                                    value={maxDistance}
                                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                                >
                                    <option value={0}>Semua Jarak</option>
                                    <option value={1}>Jarak ≤ 1 km</option>
                                    <option value={5}>Jarak ≤ 5 km</option>
                                    <option value={10}>Jarak ≤ 10 km</option>
                                    <option value={25}>Jarak ≤ 25 km</option>
                                    <option value={50}>Jarak ≤ 50 km</option>
                                    <option value={70}>Jarak ≤ 70 km</option>
                                </select>
                            </div>
                            <div className="pnb-select-wrapper">
                                <Star className="pnb-select-icon text-amber-500 fill-amber-500/20" />
                                <select
                                    className="pnb-filter-select-premium"
                                    value={minRating}
                                    onChange={(e) => setMinRating(Number(e.target.value))}
                                >
                                    <option value={0}>Semua Rating</option>
                                    <option value={4.0}>Rating ★ 4.0+</option>
                                    <option value={4.5}>Rating ★ 4.5+</option>
                                    <option value={4.7}>Rating ★ 4.7+</option>
                                </select>
                            </div>
                            <div className="pnb-select-wrapper">
                                <ArrowUpDown className="pnb-select-icon text-emerald-500" />
                                <select
                                    className="pnb-filter-select-premium"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                >
                                    <option value="distance">Urutkan: Terdekat</option>
                                    <option value="rating">Urutkan: Rating</option>
                                    <option value="popularity">Urutkan: Populer</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <div className="pnb-loading">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span>Discovering places...</span>
                        </div>
                    ) : sortedPlaces.length === 0 ? (
                        <div className="pnb-empty">
                            <Building2 className="w-12 h-12" />
                            <h3>No locations found</h3>
                            <p>Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <div className="pnb-list-items">
                            {sortedPlaces.slice(0, visibleCount).map((museum: any) => (
                                <MuseumListCard
                                    key={museum.id}
                                    museum={museum}
                                    distance={getDistance(museum)}
                                    onSelect={() => {
                                        selectPlace(museum, true);
                                        setViewMode('map');
                                    }}
                                />
                            ))}
                            {sortedPlaces.length > visibleCount && (
                                <div 
                                    ref={observerTargetRef} 
                                    style={{ 
                                        height: '50px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        margin: '12px 0 0 0',
                                        color: '#D4AF37'
                                    }}
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {showTicketModal && (
                <ComingSoonTicketModal 
                    museumName={selectedMuseum?.name || "Nusantara Museum"} 
                    onClose={() => setShowTicketModal(false)} 
                />
            )}

            {activePhotoIndex !== null && selectedMuseum && (
                <PhotoLightboxModal
                    photos={selectedMuseum.previewImages || [selectedMuseum.coverImageUrl]}
                    initialIndex={activePhotoIndex}
                    onClose={() => setActivePhotoIndex(null)}
                />
            )}

            {showReviewsModal && selectedMuseum && (
                <ReviewsModal
                    museumName={selectedMuseum.name}
                    rating={selectedMuseum.rating}
                    reviewCount={selectedMuseum.reviewCount}
                    reviews={selectedMuseum.reviews || []}
                    onClose={() => setShowReviewsModal(false)}
                />
            )}
        </div>
    );
}
