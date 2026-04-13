/**
 * User Dashboard Page — Google Arts & Culture Style
 * Immersive visual dashboard with real data from Supabase
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Heart,
    Star,
    Sparkles,
    Landmark,
    FolderHeart,
    Image as ImageIcon,
    ChevronRight,
    MapPin,
    BookOpen,
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
// UNSPLASH FALLBACK IMAGES
// ============================================================

const HERO_FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=80',
    'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=1200&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80',
];

const MUSEUM_FALLBACK_IMAGES: Record<string, string> = {
    'national-gallery-indonesia': 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400&q=80',
    'museum-nasional': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&q=80',
    'macan-museum': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80',
    'sanggar-agung-temple': 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=400&q=80',
    'ullen-sentalu-museum': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=80',
};

const COLLECTION_PLACEHOLDER_IMAGES: string[] = [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
    'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&q=80',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80',
];

// ============================================================
// HELPER: Get artwork image
// ============================================================

function getArtworkImage(artwork: any): string {
    if (!artwork) return '';
    return artwork.primaryImageUrl
        || artwork.primary_image_url
        || artwork.imageUrl
        || artwork.image_url
        || (Array.isArray(artwork.images) && artwork.images[0]?.url)
        || '';
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Skeleton placeholder while loading */
function SkeletonCard({ width = '240px', height = '200px' }: { width?: string; height?: string }) {
    return (
        <div
            className="dash-skeleton flex-shrink-0"
            style={{ width, height, minWidth: width }}
        />
    );
}

/** Hero Featured Artwork Section */
function HeroSection({ artwork, onClick }: { artwork: any; onClick: () => void }) {
    const imageUrl = getArtworkImage(artwork);
    const genres = artwork?.genres || [];

    return (
        <motion.div
            className="dashboard-hero"
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        >
            <img
                src={imageUrl || HERO_FALLBACK_IMAGES[0]}
                alt={artwork?.title || 'Featured Artwork'}
                className="dashboard-hero__img"
                loading="eager"
            />
            <div className="dashboard-hero__overlay">
                <div className="dashboard-hero__badge">
                    <Sparkles style={{ width: 12, height: 12 }} />
                    Featured Artwork
                </div>
                <h2 className="dashboard-hero__title">
                    {artwork?.title || 'Sunset Over Borobudur'}
                </h2>
                <p className="dashboard-hero__subtitle">
                    {artwork?.description?.substring(0, 120) || 'A stunning landscape painting capturing the golden hour at Borobudur temple'}
                    {artwork?.description?.length > 120 ? '...' : ''}
                </p>
                {genres.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {genres.slice(0, 3).map((g: string) => (
                            <span key={g} className="dash-artwork-card__genre-tag">{g}</span>
                        ))}
                    </div>
                )}
                <button className="dashboard-hero__cta">
                    Enter 3D Experience <ArrowRight />
                </button>
            </div>
        </motion.div>
    );
}

/** Artwork Carousel Card */
function ArtworkCarouselCard({
    artwork,
    index,
    onClick,
}: {
    artwork: any;
    index: number;
    onClick: () => void;
}) {
    const imageUrl = getArtworkImage(artwork);
    const genres = artwork?.genres || [];
    const artistName = artwork?.artist?.displayName || artwork?.artist?.display_name || 'Unknown Artist';

    return (
        <motion.div
            className="dash-artwork-card dash-fade-in"
            onClick={onClick}
            style={{ animationDelay: `${index * 0.08}s` }}
            whileHover={{ y: -4 }}
        >
            <div className="dash-artwork-card__img-wrap">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={artwork?.title}
                        className="dash-artwork-card__img"
                        loading="lazy"
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <ImageIcon style={{ width: 32, height: 32, opacity: 0.2, color: 'var(--text-muted)' }} />
                    </div>
                )}
                <div className="dash-artwork-card__gradient" />
                <div className="dash-artwork-card__overlay-text">
                    <p className="dash-artwork-card__overlay-title">{artwork?.title}</p>
                    <p className="dash-artwork-card__overlay-artist">{artistName}</p>
                </div>
                <button
                    className="dash-artwork-card__bookmark"
                    onClick={(e) => { e.stopPropagation(); }}
                    aria-label="Bookmark artwork"
                >
                    <Heart />
                </button>
            </div>
            <div className="dash-artwork-card__body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {artwork?.medium || 'Mixed Media'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        👁 {(artwork?.views || 0).toLocaleString()}
                    </span>
                </div>
                {genres.length > 0 && (
                    <div className="dash-artwork-card__genres">
                        {genres.slice(0, 2).map((g: string) => (
                            <span key={g} className="dash-artwork-card__genre-tag">{g}</span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/** Museum / Virtual Tour Card */
function TourCard({
    museum,
    index,
    onClick,
}: {
    museum: any;
    index: number;
    onClick: () => void;
}) {
    const slug = museum?.slug || '';
    const imgUrl = museum?.coverImageUrl
        || museum?.cover_image_url
        || (museum?.images && museum.images[0])
        || MUSEUM_FALLBACK_IMAGES[slug]
        || 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400&q=80';

    const city = museum?.city || museum?.address?.city || 'Indonesia';
    const rating = museum?.rating || 4.5;
    const totalArtworks = museum?.totalArtworks || museum?.total_artworks || museum?.artworksCount || 0;

    return (
        <motion.div
            className="dash-tour-card dash-fade-in"
            onClick={onClick}
            style={{ animationDelay: `${index * 0.1}s` }}
            whileHover={{ x: 4 }}
        >
            <div className="dash-tour-card__img-wrap">
                <img
                    src={imgUrl}
                    alt={museum?.name}
                    className="dash-tour-card__img"
                    loading="lazy"
                />
                <span className="dash-tour-card__live-badge">LIVE</span>
            </div>
            <div className="dash-tour-card__info">
                <h4 className="dash-tour-card__name">{museum?.name || 'Museum'}</h4>
                <div className="dash-tour-card__meta">
                    <span className="dash-tour-card__city">
                        <MapPin style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {city}
                    </span>
                    <span className="dash-tour-card__rating">
                        <Star style={{ width: 11, height: 11 }} />
                        {rating}
                    </span>
                </div>
                <span className="dash-tour-card__artworks-count">
                    {totalArtworks} artworks
                </span>
            </div>
            <div className="dash-tour-card__arrow">
                <ChevronRight />
            </div>
        </motion.div>
    );
}

/** Collection Card */
function CollectionCard({
    collection,
    index,
    onClick,
}: {
    collection: any;
    index: number;
    onClick: () => void;
}) {
    const coverImg = collection?.coverImageUrl
        || collection?.cover_image_url
        || COLLECTION_PLACEHOLDER_IMAGES[index % COLLECTION_PLACEHOLDER_IMAGES.length];
    const count = collection?.artworkCount || collection?.artwork_count || collection?.artworksCount || 0;

    return (
        <motion.div
            className="dash-collection-card dash-fade-in"
            onClick={onClick}
            style={{ animationDelay: `${index * 0.1}s` }}
            whileHover={{ y: -3 }}
        >
            {coverImg ? (
                <img
                    src={coverImg}
                    alt={collection?.name}
                    className="dash-collection-card__img"
                    loading="lazy"
                />
            ) : (
                <div className="dash-collection-card__placeholder">
                    <FolderHeart />
                </div>
            )}
            <div className="dash-collection-card__overlay">
                <h4 className="dash-collection-card__name">{collection?.name || 'Collection'}</h4>
                <span className="dash-collection-card__count">{count} artworks</span>
            </div>
        </motion.div>
    );
}

/** Bookmark small card */
function BookmarkCard({
    bookmark,
    onClick,
}: {
    bookmark: any;
    onClick: () => void;
}) {
    const artwork = bookmark?.artwork || bookmark;
    const imageUrl = getArtworkImage(artwork) || artwork?.imageUrl || '';
    const title = artwork?.title || 'Untitled';
    const artist = artwork?.artist?.displayName || 'Unknown';

    return (
        <div className="dash-bookmark-card" onClick={onClick}>
            <div className="dash-bookmark-card__img-wrap">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="dash-bookmark-card__img" loading="lazy" />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
                        <ImageIcon style={{ width: 24, height: 24, opacity: 0.2, color: 'var(--text-muted)' }} />
                    </div>
                )}
            </div>
            <div className="dash-bookmark-card__body">
                <p className="dash-bookmark-card__title">{title}</p>
                <p className="dash-bookmark-card__artist">{artist}</p>
            </div>
        </div>
    );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export function UserDashboard() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();

    // Fetch real data from API
    const { data: artworksData, isLoading: artworksLoading } = useArtworks({ limit: 10 });
    const { data: museumsData, isLoading: museumsLoading } = useMuseums({ limit: 5 });
    const { data: bookmarksData, isLoading: bookmarksLoading } = useBookmarks(1, 6);
    const { data: collectionsData, isLoading: collectionsLoading } = useCollections(1, 4);

    // Extract arrays safely
    const artworks = React.useMemo(() => {
        const raw = artworksData;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        if ((raw as any).artworks && Array.isArray((raw as any).artworks)) return (raw as any).artworks;
        return extractArray(raw);
    }, [artworksData]);

    const museums = React.useMemo(() => {
        const raw = museumsData;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        return extractArray(raw);
    }, [museumsData]);

    const bookmarks = extractArray(bookmarksData);
    const collections = extractArray(collectionsData);

    // Pick the hero artwork (most views)
    const heroArtwork = React.useMemo(() => {
        if (!artworks.length) return null;
        const sorted = [...artworks].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
        return sorted[0];
    }, [artworks]);

    // Curator picks = remaining artworks after hero
    const curatorPicks = React.useMemo(() => {
        if (!artworks.length) return [];
        return artworks.filter((a: any) => a.id !== heroArtwork?.id);
    }, [artworks, heroArtwork]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: 1200, margin: '0 auto' }}
        >
            {/* Welcome Bar */}
            <div className="dash-welcome">
                <div className="dash-welcome__text">
                    <h1>Welcome back, {user?.displayName || user?.username || 'Explorer'}</h1>
                    <p>Discover Indonesia&apos;s cultural heritage</p>
                </div>
            </div>

            {/* ====== HERO SECTION ====== */}
            {artworksLoading ? (
                <div className="dash-skeleton" style={{ width: '100%', height: 340, borderRadius: 20 }} />
            ) : heroArtwork ? (
                <HeroSection
                    artwork={heroArtwork}
                    onClick={() => navigate(`/gallery/artwork/${heroArtwork.id}`)}
                />
            ) : (
                <div className="dashboard-hero" style={{ background: 'var(--bg-surface)' }}>
                    <div className="dashboard-hero__overlay">
                        <div className="dashboard-hero__badge">
                            <Sparkles style={{ width: 12, height: 12 }} />
                            Welcome to SeniQu
                        </div>
                        <h2 className="dashboard-hero__title">Explore Indonesia&apos;s Art Heritage</h2>
                        <p className="dashboard-hero__subtitle">
                            Discover thousands of artworks from museums and galleries across the archipelago.
                        </p>
                        <button className="dashboard-hero__cta" onClick={() => navigate(ROUTES.GALLERY)}>
                            Start Exploring <ArrowRight />
                        </button>
                    </div>
                </div>
            )}

            {/* ====== AI CURATOR PICKS ====== */}
            <div className="dash-section">
                <div className="dash-section__header">
                    <div>
                        <h3 className="dash-section__title">
                            <Sparkles style={{ width: 18, height: 18, color: 'var(--text-gold)' }} />
                            AI Curator Picks
                        </h3>
                        <p className="dash-section__subtitle">Masterpieces selected just for you</p>
                    </div>
                    <button
                        className="dash-section__see-all"
                        onClick={() => navigate(ROUTES.GALLERY)}
                    >
                        See All <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>
                <div className="dash-carousel">
                    {artworksLoading ? (
                        <>
                            <SkeletonCard width="240px" height="220px" />
                            <SkeletonCard width="240px" height="220px" />
                            <SkeletonCard width="240px" height="220px" />
                        </>
                    ) : curatorPicks.length > 0 ? (
                        curatorPicks.map((artwork: any, i: number) => (
                            <ArtworkCarouselCard
                                key={artwork.id || i}
                                artwork={artwork}
                                index={i}
                                onClick={() => navigate(`/gallery/artwork/${artwork.id}`)}
                            />
                        ))
                    ) : (
                        <div className="dash-empty" style={{ width: '100%' }}>
                            <ImageIcon className="dash-empty__icon" />
                            <p className="dash-empty__text">No artworks discovered yet</p>
                            <button className="dash-empty__action" onClick={() => navigate(ROUTES.GALLERY)}>
                                Explore Gallery
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== LIVE VIRTUAL TOURS ====== */}
            <div className="dash-section">
                <div className="dash-section__header">
                    <div>
                        <h3 className="dash-section__title">
                            <Landmark style={{ width: 18, height: 18, color: 'var(--text-gold)' }} />
                            Live Virtual Tours
                        </h3>
                        <p className="dash-section__subtitle">Explore museums across the archipelago</p>
                    </div>
                    <button
                        className="dash-section__see-all"
                        onClick={() => navigate(ROUTES.USER_NEARBY)}
                    >
                        View All <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>
                <div className="dash-tours-grid">
                    {museumsLoading ? (
                        <>
                            <div className="dash-skeleton" style={{ height: 92, borderRadius: 16 }} />
                            <div className="dash-skeleton" style={{ height: 92, borderRadius: 16 }} />
                        </>
                    ) : museums.length > 0 ? (
                        museums.slice(0, 4).map((museum: any, i: number) => (
                            <TourCard
                                key={museum.id || i}
                                museum={museum}
                                index={i}
                                onClick={() => navigate(`/gallery/museum/${museum.slug || museum.id}`)}
                            />
                        ))
                    ) : (
                        <div className="dash-empty">
                            <Landmark className="dash-empty__icon" />
                            <p className="dash-empty__text">No museums available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== FEATURED COLLECTIONS ====== */}
            <div className="dash-section">
                <div className="dash-section__header">
                    <div>
                        <h3 className="dash-section__title">
                            <FolderHeart style={{ width: 18, height: 18, color: 'var(--text-gold)' }} />
                            Featured Collections
                        </h3>
                        <p className="dash-section__subtitle">Your curated art collections</p>
                    </div>
                    <button
                        className="dash-section__see-all"
                        onClick={() => navigate(ROUTES.USER_COLLECTIONS)}
                    >
                        View All <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>
                {collectionsLoading ? (
                    <div className="dash-collections-grid">
                        <div className="dash-skeleton" style={{ aspectRatio: '3/4' }} />
                        <div className="dash-skeleton" style={{ aspectRatio: '3/4' }} />
                        <div className="dash-skeleton" style={{ aspectRatio: '3/4' }} />
                    </div>
                ) : collections.length > 0 ? (
                    <div className="dash-collections-grid">
                        {collections.slice(0, 4).map((collection: any, i: number) => (
                            <CollectionCard
                                key={collection.id || i}
                                collection={collection}
                                index={i}
                                onClick={() => navigate(`/dashboard/collections/${collection.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="dash-empty">
                        <FolderHeart className="dash-empty__icon" />
                        <p className="dash-empty__text">No collections yet — start curating!</p>
                        <button className="dash-empty__action" onClick={() => navigate(ROUTES.USER_COLLECTIONS)}>
                            Create Collection
                        </button>
                    </div>
                )}
            </div>

            {/* ====== RECENT BOOKMARKS ====== */}
            <div className="dash-section" style={{ marginBottom: 48 }}>
                <div className="dash-section__header">
                    <div>
                        <h3 className="dash-section__title">
                            <BookOpen style={{ width: 18, height: 18, color: 'var(--text-gold)' }} />
                            Recent Bookmarks
                        </h3>
                        <p className="dash-section__subtitle">Artworks you&apos;ve saved</p>
                    </div>
                    <button
                        className="dash-section__see-all"
                        onClick={() => navigate(ROUTES.USER_BOOKMARKS)}
                    >
                        View All <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>
                <div className="dash-carousel">
                    {bookmarksLoading ? (
                        <>
                            <SkeletonCard width="160px" height="200px" />
                            <SkeletonCard width="160px" height="200px" />
                            <SkeletonCard width="160px" height="200px" />
                            <SkeletonCard width="160px" height="200px" />
                        </>
                    ) : bookmarks.length > 0 ? (
                        bookmarks.slice(0, 6).map((bookmark: any, i: number) => (
                            <BookmarkCard
                                key={bookmark.id || i}
                                bookmark={bookmark}
                                onClick={() => navigate(`/gallery/artwork/${bookmark.artworkId || bookmark.artwork_id || bookmark.id}`)}
                            />
                        ))
                    ) : (
                        <div className="dash-empty" style={{ width: '100%' }}>
                            <Heart className="dash-empty__icon" />
                            <p className="dash-empty__text">No bookmarks yet — discover art you love!</p>
                            <button className="dash-empty__action" onClick={() => navigate(ROUTES.GALLERY)}>
                                Start Exploring
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default UserDashboard;
