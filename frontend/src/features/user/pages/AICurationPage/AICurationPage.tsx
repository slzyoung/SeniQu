/**
 * AI Curation Page — Digital Curator Experience
 * Premium immersive artwork curation with provenance,
 * audio guide, and related curations
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Heart,
    Play,
    Image as ImageIcon,
    Sparkles,
    Loader2,
    Palette,
    RefreshCw,
    Eye,
} from 'lucide-react';
import { usePersonalizedRecommendations, useCurate, useGenres } from '../../../../hooks/useAI';
import { useArtworks } from '../../../../hooks/useArtworks';
import { ROUTES } from '../../../../lib/constants';
import './AICurationPage.css';

// ============================================================
// HELPERS
// ============================================================

function ensureImageParams(url: string, width = 1200): string {
    if (!url) return '';
    if (url.includes('unsplash.com') && !url.includes('?')) {
        return `${url}?w=${width}&q=80&auto=format`;
    }
    return url;
}

function getArtworkImage(artwork: any): string {
    if (!artwork) return '';
    const raw =
        artwork.primaryImageUrl
        || artwork.primary_image_url
        || artwork.imageUrl
        || artwork.image_url
        || '';
    if (raw) return ensureImageParams(raw);
    let imgs = artwork.images;
    if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) {
        const first = typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url;
        if (first) return ensureImageParams(first);
    }
    return '';
}

// Masterpiece artwork details for a beautiful default display
const MASTERPIECE = {
    title: 'The Celestial Voyager',
    artist: 'Julian Thorne',
    year: '1892',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80',
    description: [
        'This evocative composition represents a departure from Thorne\'s earlier naturalism. Painted during his retreat in the Amalfi Coast, <em>The Celestial Voyager</em> captures the transcendental bridge between the earthly sea and the cosmic infinite.',
        'The heavy application of cobalt and gold leaf indicates a spiritual intensity rarely seen in the era. Critics of the time initially dismissed the work as "chaotically vivid," yet it later became the cornerstone of the Neo-Romantic movement.',
    ],
    genres: ['Impressionism', 'Neo-Romantic', 'Landscape'],
    audioTitle: 'Behind the Brushstrokes',
    audioDuration: '04:22',
};

// ============================================================
// HELPER: Extract artworks from various response shapes
// ============================================================
function extractArtworksArray(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw.artworks && Array.isArray(raw.artworks)) return raw.artworks;
    return [];
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Related Curation Card */
function RelatedCard({
    artwork,
    index,
    onClick,
}: {
    artwork: any;
    index: number;
    onClick: () => void;
}) {
    const imageUrl = getArtworkImage(artwork);
    const title = artwork?.title || 'Untitled';
    const artist = artwork?.artist?.displayName || artwork?.artist?.display_name || 'Unknown';
    const genres = artwork?.genres || [];

    return (
        <motion.div
            className="curator-related-card curator-fade-in"
            onClick={onClick}
            style={{ animationDelay: `${index * 0.1}s` }}
            whileHover={{ y: -4 }}
        >
            <div className="curator-related-card__img-wrap">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="curator-related-card__img"
                        loading="lazy"
                    />
                ) : (
                    <div className="curator-hero__placeholder">
                        <ImageIcon />
                    </div>
                )}
            </div>
            <div className="curator-related-card__body">
                <span className="curator-related-card__eyebrow">
                    {genres[0] || 'Art'}
                </span>
                <h4 className="curator-related-card__name">{title}</h4>
                <p className="curator-related-card__artist">{artist}</p>
                <span className="curator-related-card__score">
                    <Sparkles /> AI Match
                </span>
            </div>
        </motion.div>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AICurationPage() {
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = useState(false);
    const [likedHero, setLikedHero] = useState(false);
    const [filters, setFilters] = useState({
        genres: [] as string[],
        priceRange: { min: 0, max: 100 },
        excludeOwned: false,
        context: 'discovery' as 'collection' | 'purchase' | 'discovery' | 'similar',
    });

    // Queries
    const { data: recommendations, isLoading, refetch, isFetching } = usePersonalizedRecommendations(20);
    const { data: genres } = useGenres();
    const { data: artworksData, isLoading: artworksLoading } = useArtworks({ page: 1, limit: 8 });
    const curate = useCurate();

    // Extract artworks for related section
    const artworks = useMemo(() => extractArtworksArray(artworksData), [artworksData]);

    const displayRecommendations = curate.data?.recommendations || recommendations || [];
    const isLoadingData = isLoading || curate.isPending;

    // Pick hero artwork from recommendations or fallback
    const heroArtwork = useMemo(() => {
        if (Array.isArray(displayRecommendations) && displayRecommendations.length > 0) {
            const art = displayRecommendations[0]?.artwork || displayRecommendations[0];
            return art;
        }
        return null;
    }, [displayRecommendations]);

    const heroImage = heroArtwork ? getArtworkImage(heroArtwork) : MASTERPIECE.image;
    const heroTitle = heroArtwork?.title || MASTERPIECE.title;
    const heroArtist = heroArtwork?.artist?.displayName || (heroArtwork?.artist as any)?.display_name || MASTERPIECE.artist;
    const heroYear = (heroArtwork as any)?.year || (heroArtwork as any)?.createdAt?.substring(0, 4) || MASTERPIECE.year;
    const heroGenres = heroArtwork?.genres || MASTERPIECE.genres;
    const heroDesc = (heroArtwork as any)?.description || MASTERPIECE.description;

    const relatedArtworks = useMemo(() => {
        if (Array.isArray(displayRecommendations) && displayRecommendations.length > 1) {
            return displayRecommendations.slice(1, 7).map((r: any) => r.artwork || r);
        }
        return artworks.slice(0, 6);
    }, [displayRecommendations, artworks]);

    const toggleGenre = (genre: string) => {
        setFilters((prev) => ({
            ...prev,
            genres: prev.genres.includes(genre)
                ? prev.genres.filter((g) => g !== genre)
                : [...prev.genres, genre],
        }));
    };

    const handleRefresh = () => {
        if (filters.genres.length > 0 || filters.excludeOwned) {
            curate.mutate({
                preferences: {
                    genres: filters.genres.length > 0 ? filters.genres : undefined,
                    priceRange: filters.priceRange.max > 0 ? filters.priceRange : undefined,
                    excludeOwned: filters.excludeOwned,
                },
                context: filters.context,
                limit: 20,
            });
        } else {
            refetch();
        }
    };

    return (
        <motion.div
            className="curator-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HEADER ====== */}
            <div className="curator-header">
                <button
                    className="curator-header__back"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft /> Digital Curator
                </button>
                <button
                    className="curator-header__action"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Search /> Search
                </button>
            </div>

            {/* ====== FILTERS PANEL ====== */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className="curator-filters"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h3 className="curator-filters__title">Curation Preferences</h3>

                        <div className="curator-filters__group">
                            <span className="curator-filters__group-label">
                                <Palette /> Preferred Genres
                            </span>
                            <div className="curator-filters__genres">
                                {(Array.isArray(genres) ? genres : []).slice(0, 10).map((genre: any) => (
                                    <button
                                        key={typeof genre === 'string' ? genre : genre.name}
                                        type="button"
                                        className={`curator-filters__genre-pill ${
                                            filters.genres.includes(typeof genre === 'string' ? genre : genre.name)
                                                ? 'curator-filters__genre-pill--active'
                                                : ''
                                        }`}
                                        onClick={() => toggleGenre(typeof genre === 'string' ? genre : genre.name)}
                                    >
                                        {typeof genre === 'string' ? genre : genre.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="curator-filters__actions">
                            <button
                                className="curator-filters__reset-btn"
                                onClick={() =>
                                    setFilters({
                                        genres: [],
                                        priceRange: { min: 0, max: 100 },
                                        excludeOwned: false,
                                        context: 'discovery',
                                    })
                                }
                            >
                                Reset
                            </button>
                            <button
                                className="curator-filters__apply-btn"
                                onClick={handleRefresh}
                                disabled={curate.isPending}
                            >
                                {curate.isPending ? 'Curating...' : 'Apply & Curate'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== LOADING STATE ====== */}
            {isLoadingData && !heroArtwork ? (
                <div className="curator-loading">
                    <Loader2 className="curator-loading__spinner" />
                    <p className="curator-loading__text">
                        Curating artworks for you...
                    </p>
                </div>
            ) : (
                <>
                    {/* ====== HERO ARTWORK ====== */}
                    <motion.div
                        className="curator-hero"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    >
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt={heroTitle}
                                className="curator-hero__img"
                                loading="eager"
                            />
                        ) : (
                            <div className="curator-hero__placeholder">
                                <ImageIcon />
                            </div>
                        )}
                        <div className="curator-hero__overlay" />
                    </motion.div>

                    {/* ====== ARTWORK INFO ====== */}
                    <motion.div
                        className="curator-info"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <p className="curator-info__eyebrow">
                            Masterpiece of the Month
                        </p>
                        <h1 className="curator-info__title">{heroTitle}</h1>
                        <div className="curator-info__artist-line">
                            <span className="curator-info__artist">{heroArtist}</span>
                            <span className="curator-info__dot" />
                            <span className="curator-info__year">{heroYear}</span>
                        </div>

                        <div className="curator-actions">
                            <button
                                className="curator-actions__primary"
                                onClick={() => {
                                    if (heroArtwork?.id) {
                                        navigate(`/gallery/artwork/${heroArtwork.id}`);
                                    } else {
                                        navigate(ROUTES.USER_GALLERY);
                                    }
                                }}
                            >
                                <Eye /> View Gallery
                            </button>
                            <button
                                className="curator-actions__icon"
                                onClick={() => setLikedHero(!likedHero)}
                                style={likedHero ? { color: '#E53E3E', borderColor: 'rgba(229, 62, 62, 0.3)', background: 'rgba(229, 62, 62, 0.08)' } : {}}
                            >
                                <Heart style={likedHero ? { fill: '#E53E3E' } : {}} />
                            </button>
                        </div>
                    </motion.div>

                    {/* ====== PROVENANCE & VISION ====== */}
                    <motion.div
                        className="curator-provenance"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.5 }}
                    >
                        <h2 className="curator-provenance__title">
                            Provenance &amp; Vision
                        </h2>
                        {Array.isArray(heroDesc) ? (
                            heroDesc.map((paragraph: string, i: number) => (
                                <p
                                    key={i}
                                    className="curator-provenance__text"
                                    dangerouslySetInnerHTML={{ __html: paragraph }}
                                />
                            ))
                        ) : (
                            <p className="curator-provenance__text">
                                {typeof heroDesc === 'string' ? heroDesc : 'Discover the story behind this masterpiece and the artist\'s vision that brought it to life. Each stroke tells a tale of cultural heritage and artistic expression.'}
                            </p>
                        )}
                        {Array.isArray(heroGenres) && heroGenres.length > 0 && (
                            <div className="curator-provenance__genres">
                                {heroGenres.map((g: string) => (
                                    <span
                                        key={g}
                                        className="curator-provenance__genre-tag"
                                    >
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* ====== AUDIO GUIDE ====== */}
                    <motion.div
                        className="curator-audio"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                    >
                        <button className="curator-audio__play">
                            <Play />
                        </button>
                        <div className="curator-audio__info">
                            <span className="curator-audio__label">
                                Audio Guide &bull; {MASTERPIECE.audioDuration}
                            </span>
                            <h4 className="curator-audio__title">
                                {MASTERPIECE.audioTitle}
                            </h4>
                        </div>
                        <div className="curator-audio__waveform">
                            <div className="curator-audio__bar" />
                            <div className="curator-audio__bar" />
                            <div className="curator-audio__bar" />
                            <div className="curator-audio__bar" />
                            <div className="curator-audio__bar" />
                            <div className="curator-audio__bar" />
                        </div>
                    </motion.div>

                    {/* ====== REFRESH BUTTON ====== */}
                    <div style={{ padding: '0 20px', marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                        <button
                            className="curator-actions__primary"
                            onClick={handleRefresh}
                            disabled={isFetching}
                            style={{ opacity: isFetching ? 0.6 : 1 }}
                        >
                            {isFetching ? (
                                <><Loader2 style={{ animation: 'spin 1s linear infinite' }} /> Refreshing...</>
                            ) : (
                                <><RefreshCw /> Refresh Curations</>
                            )}
                        </button>
                    </div>

                    {/* ====== RELATED CURATIONS ====== */}
                    <motion.div
                        className="curator-related"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <h2 className="curator-related__title">
                            Related Curations
                        </h2>
                        {artworksLoading && relatedArtworks.length === 0 ? (
                            <div className="curator-related__grid">
                                {[1, 2, 3].map((n) => (
                                    <div
                                        key={n}
                                        className="curator-skeleton"
                                        style={{ aspectRatio: '3/4', width: '100%' }}
                                    />
                                ))}
                            </div>
                        ) : relatedArtworks.length > 0 ? (
                            <div className="curator-related__grid">
                                {relatedArtworks.map((artwork: any, i: number) => (
                                    <RelatedCard
                                        key={artwork.id || i}
                                        artwork={artwork}
                                        index={i}
                                        onClick={() =>
                                            navigate(
                                                `/gallery/artwork/${artwork.id}`
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="curator-empty">
                                <Sparkles className="curator-empty__icon" />
                                <h3 className="curator-empty__title">
                                    No Recommendations Yet
                                </h3>
                                <p className="curator-empty__text">
                                    Explore some artworks and bookmark your favorites
                                    to help our AI learn your taste.
                                </p>
                                <button
                                    className="curator-empty__action"
                                    onClick={() => navigate(ROUTES.USER_GALLERY)}
                                >
                                    <Eye /> Explore Gallery
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </motion.div>
    );
}

export default AICurationPage;
