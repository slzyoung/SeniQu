import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    Bell,
    MapPin,
    Building2,
    Image as ImageIcon,
    UserCircle,
    Settings2,
    Clock,
    LayoutGrid,
    Library
} from 'lucide-react';
import { useMuseums } from '../../../../hooks/useMuseums';
import { useArtworks } from '../../../../hooks/useArtworks';
import { extractArray } from '../../../../lib/utils';
import { ROUTES } from '../../../../lib/constants';
import { useAuthStore } from '../../../../stores/useAuthStore';
import './GalleryPage.css';

function ensureImageParams(url: string, width = 800): string {
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
    return 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600&q=80';
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

// Generate random date ranges for artworks mimicking exhibitions per mockup
function getRandomDateRange(seed: number) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startM = months[(seed) % 12];
    const endM = months[(seed + 1) % 12];
    return `${startM} 10 - ${endM} 20`;
}

// Fixed categories mimicking the mockup exactly
const GALLERIES_CATEGORIES = [
    { id: 'exhibition', icon: LayoutGrid, label: 'Exhibition' },
    { id: 'artwork', icon: ImageIcon, label: 'Artwork' },
    { id: 'artist', icon: UserCircle, label: 'Artist' },
    { id: 'museum', icon: Library, label: 'Museum' },
    { id: 'gallery', icon: Building2, label: 'Gallery' },
];

export function GalleryPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [activeCategory, setActiveCategory] = useState('exhibition');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: museumData, isLoading: museumsLoading } = useMuseums({
        page: 1, limit: 12,
    });
    const { data: artworkData, isLoading: artworksLoading } = useArtworks({
        page: 1, limit: 12, search: searchQuery || undefined,
    });

    const museums = useMemo(() => {
        const raw = museumData;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        return extractArray(raw);
    }, [museumData]);

    const artworks = useMemo(() => {
        const raw = artworkData;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        if ((raw as any).artworks && Array.isArray((raw as any).artworks)) return (raw as any).artworks;
        return extractArray(raw);
    }, [artworkData]);

    const fallbackAvatar = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80";

    return (
        <motion.div
            className="virtual-gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HEADER & PROFILE ====== */}
            <header className="vg-header">
                <div className="vg-profile">
                    <img
                        src={user?.avatar || fallbackAvatar}
                        alt="Profile"
                        className="vg-avatar"
                        crossOrigin="anonymous"
                    />
                    <div className="vg-user-info">
                        <h2 className="vg-user-name">{user?.displayName || 'Robert Wilson'}</h2>
                        <span className="vg-user-loc">
                            <MapPin style={{ width: 10, height: 10 }} />
                            Jakarta, ID
                        </span>
                    </div>
                </div>
                <button className="vg-bell-btn">
                    <Bell style={{ width: 22, height: 22 }} />
                </button>
            </header>

            {/* ====== BOLD TITLE ====== */}
            <h1 className="vg-title">
                A Virtual World The Greatest Paintings
            </h1>

            {/* ====== SEARCH BAR ====== */}
            <div className="vg-search-wrapper">
                <div className="vg-search-input-box">
                    <Search style={{ width: 18, height: 18, color: 'var(--theme-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search paintings, artists, exhibitions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="vg-filter-btn">
                    <Settings2 style={{ width: 22, height: 22 }} />
                </button>
            </div>

            {/* ====== CATEGORIES ====== */}
            <div className="vg-categories">
                {GALLERIES_CATEGORIES.map(cat => {
                    const isActive = activeCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                        <div
                            key={cat.id}
                            className={`vg-cat-item ${isActive ? 'vg-cat-item--active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            <div className="vg-cat-icon">
                                <Icon style={{ width: 24, height: 24 }} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="vg-cat-label">{cat.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* ====== SECTION 1: SQUARE CARDS (Exhibitions mapping to Artworks) ====== */}
            <section className="vg-section">
                <div className="vg-section-header">
                    <h3 className="vg-section-title">Exhibitions</h3>
                    <span
                        className="vg-section-more"
                        onClick={() => navigate(ROUTES.USER_AI_CURATION)}
                    >
                        See All
                    </span>
                </div>

                <div className="vg-card-scroll">
                    {artworksLoading ? (
                        [1, 2, 3].map(n => <div key={n} className="vg-card vg-skeleton" style={{ height: 280 }} />)
                    ) : artworks.length > 0 ? (
                        artworks.slice(0, 6).map((art: any, index: number) => {
                            const imgUrl = getArtworkImage(art);
                            const price = art.price ? `$${art.price.toFixed(2)}` : `$132.00`;
                            const dateRange = getRandomDateRange(index);
                            return (
                                <motion.div
                                    key={art.id || index}
                                    className="vg-card"
                                    whileHover={{ y: -4 }}
                                    onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                >
                                    <div className="vg-card-img-wrap">
                                        <img src={imgUrl} alt={art.title} className="vg-card-img" loading="lazy" />
                                    </div>
                                    <div className="vg-card-meta">
                                        <div className="vg-card-info">
                                            <h4 className="vg-card-title">{art?.artist?.displayName || art.title || 'Untitled'}</h4>
                                            <div className="vg-card-subtitle">
                                                <Clock style={{ width: 12, height: 12 }} />
                                                {dateRange}
                                            </div>
                                        </div>
                                        <div className="vg-card-price">{price}</div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '0 20px', color: 'var(--theme-muted)' }}>No artworks found.</div>
                    )}
                </div>
            </section>

            {/* ====== SECTION 2: WIDE CARDS (Exhibitions mapping to Museums) ====== */}
            <section className="vg-section">
                <div className="vg-section-header">
                    <h3 className="vg-section-title">Exhibitions</h3>
                    <span
                        className="vg-section-more"
                        onClick={() => navigate(ROUTES.USER_NEARBY)}
                    >
                        See All
                    </span>
                </div>

                <div className="vg-card-scroll">
                    {museumsLoading ? (
                        [1, 2].map(n => <div key={n} className="vg-wide-card vg-skeleton" style={{ height: 180 }} />)
                    ) : museums.length > 0 ? (
                        museums.map((museum: any, index: number) => {
                            const imgUrl = getMuseumImage(museum);
                            return (
                                <motion.div
                                    key={museum.id || index}
                                    className="vg-wide-card"
                                    whileHover={{ y: -4 }}
                                    onClick={() => navigate(`/gallery/museum/${museum.slug || museum.id}`)}
                                >
                                    <div className="vg-wide-img-wrap">
                                        <img src={imgUrl} alt={museum.name} className="vg-wide-img" loading="lazy" />
                                    </div>
                                    <div style={{ padding: '12px 4px' }}>
                                        <h4 className="vg-card-title">{museum.name || 'History Exhibition'}</h4>
                                        <div className="vg-card-subtitle">
                                            <MapPin style={{ width: 12, height: 12 }} />
                                            {museum.city || 'Central Gallery, UK'}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '0 20px', color: 'var(--theme-muted)' }}>No museums found.</div>
                    )}
                </div>
            </section>

        </motion.div>
    );
}

export default GalleryPage;
