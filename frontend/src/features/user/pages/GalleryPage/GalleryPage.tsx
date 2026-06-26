import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MapPin,
    Building2,
    Image as ImageIcon,
    UserCircle,
    Settings2,
    Clock,
    LayoutGrid,
    Library,
    X,
    Star,
    Eye,
    CheckCircle2,
    PlusCircle,
    MinusCircle
} from 'lucide-react';
import { useMuseums } from '../../../../hooks/useMuseums';
import { useArtworks } from '../../../../hooks/useArtworks';
import { extractArray } from '../../../../lib/utils';
import { ROUTES } from '../../../../lib/constants';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { Avatar } from '../../../../components/ui/Avatar';
import { CITY_WHITELIST, getRealPlaceCoverImage } from '../../../../features/gallery/data/citiesRegistry';
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
    const resolved = getRealPlaceCoverImage(museum?.name || '', museum?.type || 'museum', raw || undefined);
    if (resolved) return ensureImageParams(resolved);
    
    // Curated high-quality backup images of real Indonesian landmarks (no swimming pools!)
    const type = museum?.type || 'heritage';
    if (type === 'museum') return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Museum_Nasional_Indonesia_2.jpg/800px-Museum_Nasional_Indonesia_2.jpg';
    if (type === 'gallery') return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Galeri_Nasional_Indonesia.jpg/800px-Galeri_Nasional_Indonesia.jpg';
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Prambanan_Temple_Yogyakarta_Indonesia.jpg/800px-Prambanan_Temple_Yogyakarta_Indonesia.jpg';
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

function getRandomDateRange(seed: number) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startM = months[(seed) % 12];
    const endM = months[(seed + 1) % 12];
    return `${startM} 10 - ${endM} 20`;
}

// Categories matching mockup - split back to Museum and Gallery tabs
const GALLERIES_CATEGORIES = [
    { id: 'exhibition', icon: LayoutGrid, label: 'Exhibitions' },
    { id: 'artwork', icon: ImageIcon, label: 'Artworks' },
    { id: 'artist', icon: UserCircle, label: 'Artists' },
    { id: 'museum', icon: Building2, label: 'Museums' },
    { id: 'gallery', icon: Library, label: 'Galleries' },
];

export function GalleryPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // ====== FILTER & VIEW STATES ======
    const [activeCategory, setActiveCategory] = useState('exhibition');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState(user ? 'Jakarta' : '');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [expandedMuseumCities, setExpandedMuseumCities] = useState<Record<string, boolean>>({});
    const [expandedGalleryCities, setExpandedGalleryCities] = useState<Record<string, boolean>>({});

    // Sync selectedCity to 'Jakarta' when logged in user is hydrated/loaded
    useEffect(() => {
        if (user && !selectedCity) {
            setSelectedCity('Jakarta');
        }
    }, [user, selectedCity]);

    // ====== DATA QUERIES ======
    const { data: museumData, isLoading: museumsLoading } = useMuseums({
        page: 1,
        limit: selectedCity ? 30 : 200,
        city: selectedCity || undefined,
        search: searchQuery || undefined
    });

    const { data: artworkData, isLoading: artworksLoading } = useArtworks({
        page: 1,
        limit: 30,
        search: searchQuery || undefined,
        region: selectedCity || undefined
    });

    // ====== EXTRACT REAL DATA ======
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

    // ====== DYNAMIC FILTER CALCULATIONS ======
    
    // 1. EXHIBITION CONTENT (Virtual Exhibitions generated dynamically from real museums data)
    const exhibitions = useMemo(() => {
        const titles = [
            'Nusantara Cultural Heritage',
            'Batik Legacy & Textile Art',
            'Contemporary Indonesian Vision',
            'Echoes of the Archipelago',
            'Nusantara Sculpture & Form',
            'Modern Expressionism Revival'
        ];
        
        return museums.map((museum: any, index: number) => {
            const title = titles[index % titles.length];
            return {
                id: `exh-${museum.id}`,
                title,
                museumName: museum.name,
                city: museum.address?.city || museum.city || 'Indonesia',
                image: getMuseumImage(museum),
                dates: getRandomDateRange(index),
                museumId: museum.id
            };
        });
    }, [museums]);

    // 2. ARTIST LIST (Unique artists extracted from real artworks list + legendary historical masters)
    const legendaryArtists = useMemo(() => [
        {
            id: 'legend-1',
            displayName: 'Raden Saleh',
            bio: 'Pioneered modern Indonesian painting, famous for Romanticism landscapes and wild animal hunts.',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
            followers: 12400,
            artworks: 42,
            isVerified: true
        },
        {
            id: 'legend-2',
            displayName: 'Affandi',
            bio: 'Indonesian expressionist maestro renowned for squeezing paint directly onto the canvas.',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
            followers: 18900,
            artworks: 85,
            isVerified: true
        },
        {
            id: 'legend-3',
            displayName: 'Basoeki Abdullah',
            bio: 'Realist master known for capturing the natural beauty of Indonesian landscapes and portraits.',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
            followers: 15100,
            artworks: 64,
            isVerified: true
        },
        {
            id: 'legend-4',
            displayName: 'Hendra Gunawan',
            bio: 'Folk artist depicting the vibrancy and struggles of daily life in Indonesia with rich colors.',
            avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&q=80',
            followers: 9800,
            artworks: 38,
            isVerified: true
        }
    ], []);

    const allArtists = useMemo(() => {
        const extracted: Record<string, any> = {};
        artworks.forEach((art: any) => {
            const artist = art.artist;
            if (artist && artist.id) {
                extracted[artist.id] = {
                    id: artist.id,
                    displayName: artist.displayName || 'Unknown Artist',
                    bio: artist.bio || 'Curated Nusantara Creator.',
                    avatar: artist.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
                    followers: artist.followers || Math.floor(Math.random() * 500) + 50,
                    artworks: artist.artworks || Math.floor(Math.random() * 10) + 1,
                    isVerified: artist.isVerified ?? true
                };
            }
        });

        const list = [...Object.values(extracted), ...legendaryArtists];
        if (searchQuery) {
            return list.filter(a => a.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    }, [artworks, legendaryArtists, searchQuery]);

    // 3. MUSEUM LIST (Filtered to show only partnered museums)
    const filteredMuseums = useMemo(() => {
        return museums.filter(m => (m.type === 'museum' || !m.type) && m.isVerified);
    }, [museums]);

    // 4. GALLERY LIST (Filtered to show only partnered galleries)
    const filteredGalleries = useMemo(() => {
        return museums.filter(m => m.type === 'gallery' && m.isVerified);
    }, [museums]);


    return (
        <motion.div
            className="virtual-gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HEADER & PROFILE (No duplicate notification bell here) ====== */}
            <header className="vg-header">
                <div 
                    className="vg-profile"
                    onClick={() => navigate(ROUTES.USER_PROFILE)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            navigate(ROUTES.USER_PROFILE);
                        }
                    }}
                >
                    <Avatar
                        src={user?.avatar}
                        name={user?.displayName || 'Collector'}
                        size="lg"
                    />
                    <div className="vg-user-info">
                        <h2 className="vg-user-name">{user?.displayName || 'Collector'}</h2>
                        <span className="vg-user-loc">
                            <MapPin style={{ width: 10, height: 10 }} />
                            {selectedCity || 'All Indonesia'}
                        </span>
                    </div>
                </div>
            </header>

            {/* ====== BOLD TITLE ====== */}
            <h1 className="vg-title">
                A Virtual World <br />The Greatest Paintings
            </h1>

            {/* ====== SEARCH BAR & FILTER ====== */}
            <div className="vg-search-wrapper">
                <div className="vg-search-input-box">
                    <Search style={{ width: 18, height: 18, color: 'var(--theme-muted)' }} />
                    <input
                        type="text"
                        placeholder={
                            activeCategory === 'exhibition' ? "Search exhibitions..." :
                            activeCategory === 'artwork' ? "Search artworks..." :
                            activeCategory === 'artist' ? "Search artists..." :
                            activeCategory === 'museum' ? "Search partner museums..." : "Search partner galleries..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
                            <X className="w-4 h-4 text-theme-muted hover:text-gold" />
                        </button>
                    )}
                </div>
                <button
                    className={`vg-filter-btn ${showFilterPanel ? 'vg-filter-btn--active' : ''}`}
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                >
                    <Settings2 style={{ width: 22, height: 22 }} />
                </button>
            </div>

            {/* ====== COLLAPSIBLE FILTER PANEL ====== */}
            <AnimatePresence>
                {showFilterPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="vg-filter-panel-container"
                    >
                        <div className="vg-filter-panel">
                            <div className="vg-filter-section">
                                <span className="vg-filter-title">Filter by City / Region</span>
                                <div className="vg-filter-chips">
                                    {!user && (
                                        <button
                                            className={`vg-filter-chip ${selectedCity === '' ? 'vg-filter-chip--active' : ''}`}
                                            onClick={() => setSelectedCity('')}
                                        >
                                            All Cities
                                        </button>
                                    )}
                                    {Object.entries(CITY_WHITELIST).map(([key, city]) => (
                                        <button
                                            key={key}
                                            className={`vg-filter-chip ${selectedCity.toLowerCase() === city.name.toLowerCase() ? 'vg-filter-chip--active' : ''}`}
                                            onClick={() => setSelectedCity(city.name)}
                                        >
                                            {city.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== CATEGORIES ====== */}
            <div className="vg-categories">
                {GALLERIES_CATEGORIES.map(cat => {
                    const isActive = activeCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                        <div
                            key={cat.id}
                            className={`vg-cat-item ${isActive ? 'vg-cat-item--active' : ''}`}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setSearchQuery(''); // Clear search on tab change
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="vg-cat-icon">
                                <Icon style={{ width: 24, height: 24 }} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="vg-cat-label">{cat.label}</span>
                        </div>
                    );
                })}
            </div>



            {/* ====== DYNAMIC TAB SECTIONS (MOBILE-FIRST VIEWPORT PRIORITY) ====== */}
            <div style={{ padding: '0 20px 40px' }}>
                
                {/* 1. EXHIBITIONS TAB */}
                {activeCategory === 'exhibition' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="vg-section-title">Current & Upcoming</h3>
                            {exhibitions.length > 3 && <span className="vg-section-more" onClick={() => navigate(ROUTES.USER_AI_CURATION)}>See All</span>}
                        </div>
                        
                        {museumsLoading ? (
                            <div className="vg-wide-card vg-skeleton" style={{ height: 220, borderRadius: 24 }} />
                        ) : exhibitions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Hero Featured Exhibition */}
                                {exhibitions[0] && (
                                    <motion.div
                                        className="vg-wide-card"
                                        style={{ width: '100%', cursor: 'pointer' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/gallery/museum/${exhibitions[0].museumId}`)}
                                    >
                                        <div className="vg-wide-img-wrap" style={{ height: 220 }}>
                                            <img src={exhibitions[0].image} alt={exhibitions[0].title} className="vg-wide-img" />
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
                                        </div>
                                        <div style={{ padding: '12px 4px' }}>
                                            <span style={{ fontSize: 10, color: 'var(--text-gold, #C9A84C)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Featured Exhibition</span>
                                            <h4 className="vg-card-title" style={{ fontSize: 20, marginTop: 4 }}>{exhibitions[0].title}</h4>
                                            <p className="vg-card-subtitle" style={{ marginTop: 2 }}>{exhibitions[0].museumName} • {exhibitions[0].city}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Other Scrollable/Grid Exhibitions */}
                                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                                    {exhibitions.slice(1).map((exh) => (
                                        <motion.div
                                            key={exh.id}
                                            className="vg-wide-card"
                                            style={{ width: 280, flexShrink: 0, cursor: 'pointer' }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => navigate(`/gallery/museum/${exh.museumId}`)}
                                        >
                                            <div className="vg-wide-img-wrap" style={{ height: 160, borderRadius: 20 }}>
                                                <img src={exh.image} alt={exh.title} className="vg-wide-img" />
                                            </div>
                                            <div style={{ padding: '10px 4px' }}>
                                                <h4 className="vg-card-title" style={{ fontSize: 15 }}>{exh.title}</h4>
                                                <p className="vg-card-subtitle">{exh.museumName}</p>
                                                <div className="vg-card-subtitle" style={{ marginTop: 4, fontSize: 10 }}>
                                                    <Clock style={{ width: 10, height: 10 }} />
                                                    {exh.dates}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--theme-muted)', textAlign: 'center', padding: '40px 0' }}>No exhibitions found matching criteria.</div>
                        )}
                    </div>
                )}

                {/* 2. ARTWORKS TAB */}
                {activeCategory === 'artwork' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 className="vg-section-title">Discover Masterpieces</h3>
                            <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>{artworks.length} items</span>
                        </div>

                        {artworksLoading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                {[1, 2, 3, 4].map(n => <div key={n} className="vg-card vg-skeleton" style={{ width: '100%', height: 240, borderRadius: 24 }} />)}
                            </div>
                        ) : artworks.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                {artworks.map((art: any, index: number) => {
                                    const imgUrl = getArtworkImage(art);
                                    const price = art.price ? `${art.price.toLocaleString()} ETH` : 'N/A';
                                    return (
                                        <motion.div
                                            key={art.id || index}
                                            style={{ width: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => navigate(`/gallery/artwork/${art.id}`)}
                                        >
                                            <div className="vg-card-img-wrap" style={{ borderRadius: '24px 24px 12px 12px', marginBottom: 8 }}>
                                                <img src={imgUrl} alt={art.title} className="vg-card-img" />
                                            </div>
                                            <div style={{ padding: '0 4px' }}>
                                                <h4 className="vg-card-title" style={{ fontSize: 14, lineClamp: 1, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{art.title}</h4>
                                                <p className="vg-card-subtitle" style={{ color: 'var(--text-gold, #C9A84C)', fontWeight: 600 }}>{art.artist?.displayName || 'Unknown Artist'}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700 }}>{price}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--theme-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Eye style={{ width: 10, height: 10 }} /> {art.views || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ color: 'var(--theme-muted)', textAlign: 'center', padding: '40px 0' }}>No artworks found matching filters.</div>
                        )}
                    </div>
                )}

                {/* 3. ARTISTS TAB */}
                {activeCategory === 'artist' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 className="vg-section-title">Archipelago Creators</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {allArtists.map((artist) => (
                                <motion.div
                                    key={artist.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        backgroundColor: 'var(--theme-elevated)',
                                        padding: 16,
                                        borderRadius: 20,
                                        border: '1px solid var(--theme-border)'
                                    }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <img
                                        src={artist.avatar}
                                        alt={artist.displayName}
                                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{artist.displayName}</h4>
                                            {artist.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />}
                                        </div>
                                        <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--theme-muted)', lineClamp: 1, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{artist.bio}</p>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: 'var(--theme-muted)' }}>
                                            <span>{artist.followers.toLocaleString()} followers</span>
                                            <span>•</span>
                                            <span>{artist.artworks} works</span>
                                        </div>
                                    </div>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 14,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            backgroundColor: 'var(--theme-surface)',
                                            border: '1px solid var(--theme-border)',
                                            cursor: 'pointer',
                                            color: 'var(--theme-text)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle navigate/follow
                                        }}
                                    >
                                        View
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. MUSEUMS TAB */}
                {activeCategory === 'museum' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="vg-section-title">Partner Museums</h3>
                            <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>
                                {filteredMuseums.length} verified
                            </span>
                        </div>

                        {museumsLoading ? (
                            <div className="vg-wide-card vg-skeleton" style={{ height: 180, borderRadius: 24 }} />
                        ) : selectedCity ? (
                            filteredMuseums.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                    {filteredMuseums.map((place: any, index: number) => {
                                        const imgUrl = getMuseumImage(place);
                                        return (
                                            <motion.div
                                                key={place.id || index}
                                                className="vg-wide-card"
                                                style={{ width: '100%', cursor: 'pointer' }}
                                                whileHover={{ y: -4 }}
                                                onClick={() => navigate(`/gallery/museum/${place.slug || place.id}`)}
                                            >
                                                <div className="vg-wide-img-wrap" style={{ height: 180, borderRadius: 24 }}>
                                                    <img src={imgUrl} alt={place.name} className="vg-wide-img" />
                                                    <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.9)', color: 'white' }}>
                                                        Partner
                                                    </span>
                                                </div>
                                                <div style={{ padding: '12px 4px' }}>
                                                    <h4 className="vg-card-title" style={{ fontSize: 16 }}>{place.name}</h4>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                        <p className="vg-card-subtitle">
                                                            <MapPin style={{ width: 11, height: 11, marginRight: 2 }} />
                                                            {place.city || place.address?.city || 'Indonesia'}
                                                        </p>
                                                        {place.rating ? (
                                                            <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--theme-muted)', textAlign: 'center', padding: '40px 0' }}>No partner museums found in {selectedCity}.</div>
                            )
                        ) : (
                            // Big cities curation with horizontal sliders
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                                {(() => {
                                    const CITIES = ['Jakarta', 'Yogyakarta', 'Bali', 'Bandung', 'Surabaya', 'Semarang', 'Medan', 'Makassar', 'Cirebon', 'Padang', 'Banjarmasin', 'Mataram'];
                                    const activeCities = CITIES.filter(city =>
                                        filteredMuseums.some((p: any) =>
                                            (p.city || p.address?.city || '').toLowerCase().includes(city.toLowerCase())
                                        )
                                    ).slice(0, 10);

                                    return activeCities.map(city => {
                                        const cityPlaces = filteredMuseums.filter((p: any) =>
                                            (p.city || p.address?.city || '').toLowerCase().includes(city.toLowerCase())
                                        );
                                        
                                        const sortedPlaces = [...cityPlaces].sort((a, b) => {
                                            const rA = a.rating || 0;
                                            const rB = b.rating || 0;
                                            if (rB !== rA) return rB - rA;
                                            return (b.reviews?.length || 0) - (a.reviews?.length || 0);
                                        });

                                        const isExpanded = !!expandedMuseumCities[city];
                                        const displayCount = isExpanded ? 15 : 5;
                                        const displayPlaces = sortedPlaces.slice(0, displayCount);
                                        const hasMore = sortedPlaces.length > 5;

                                        return (
                                            <div key={city} className="vg-section" style={{ margin: 0 }}>
                                                <div className="vg-section-header" style={{ padding: '0 4px', marginBottom: 12 }}>
                                                    <h4 className="vg-section-title" style={{ fontSize: 18, fontWeight: 750 }}>{city} Museums</h4>
                                                    <span className="vg-section-more" style={{ fontSize: 11 }}>
                                                        {isExpanded ? 'Showing Top 15' : 'Top 5 Partner'}
                                                    </span>
                                                </div>
                                                <div className="vg-horizontal-slider">
                                                    {displayPlaces.map((place: any, index: number) => {
                                                        const imgUrl = getMuseumImage(place);
                                                        return (
                                                            <motion.div
                                                                key={place.id || index}
                                                                className="vg-wide-card"
                                                                style={{ width: 280, flexShrink: 0, cursor: 'pointer' }}
                                                                whileHover={{ y: -4 }}
                                                                onClick={() => navigate(`/gallery/museum/${place.slug || place.id}`)}
                                                            >
                                                                <div className="vg-wide-img-wrap" style={{ height: 160, borderRadius: 20 }}>
                                                                    <img src={imgUrl} alt={place.name} className="vg-wide-img" />
                                                                    <span style={{ position: 'absolute', top: 10, right: 10, padding: '3px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.9)', color: 'white' }}>
                                                                        Partner
                                                                    </span>
                                                                </div>
                                                                <div style={{ padding: '10px 4px' }}>
                                                                    <h4 className="vg-card-title" style={{ fontSize: 15, lineClamp: 1, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{place.name}</h4>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                                        <p className="vg-card-subtitle" style={{ margin: 0 }}>
                                                                            <MapPin style={{ width: 10, height: 10, marginRight: 2 }} />
                                                                            {place.city || place.address?.city}
                                                                        </p>
                                                                        {place.rating ? (
                                                                            <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}

                                                    {hasMore && (
                                                        <motion.div
                                                            className="vg-wide-card"
                                                            style={{
                                                                width: 140,
                                                                height: 160,
                                                                flexShrink: 0,
                                                                cursor: 'pointer',
                                                                borderRadius: 20,
                                                                border: '2px dashed var(--theme-border)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 8,
                                                                backgroundColor: 'var(--theme-elevated)'
                                                            }}
                                                            whileHover={{ scale: 1.02 }}
                                                            onClick={() => setExpandedMuseumCities(prev => ({ ...prev, [city]: !isExpanded }))}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <MinusCircle style={{ width: 32, height: 32, color: 'var(--theme-muted)' }} />
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Show Less</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <PlusCircle style={{ width: 32, height: 32, color: 'var(--text-gold, #C9A84C)' }} />
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Show More</span>
                                                                </>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. GALLERIES TAB */}
                {activeCategory === 'gallery' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="vg-section-title">Partner Galleries</h3>
                            <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>
                                {filteredGalleries.length} verified
                            </span>
                        </div>

                        {museumsLoading ? (
                            <div className="vg-wide-card vg-skeleton" style={{ height: 180, borderRadius: 24 }} />
                        ) : selectedCity ? (
                            filteredGalleries.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                    {filteredGalleries.map((place: any, index: number) => {
                                        const imgUrl = getMuseumImage(place);
                                        return (
                                            <motion.div
                                                key={place.id || index}
                                                className="vg-wide-card"
                                                style={{ width: '100%', cursor: 'pointer' }}
                                                whileHover={{ y: -4 }}
                                                onClick={() => navigate(`/gallery/museum/${place.slug || place.id}`)}
                                            >
                                                <div className="vg-wide-img-wrap" style={{ height: 180, borderRadius: 24 }}>
                                                    <img src={imgUrl} alt={place.name} className="vg-wide-img" />
                                                    <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.9)', color: 'white' }}>
                                                        Partner
                                                    </span>
                                                </div>
                                                <div style={{ padding: '12px 4px' }}>
                                                    <h4 className="vg-card-title" style={{ fontSize: 16 }}>{place.name}</h4>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                        <p className="vg-card-subtitle">
                                                            <MapPin style={{ width: 11, height: 11, marginRight: 2 }} />
                                                            {place.city || place.address?.city || 'Indonesia'}
                                                        </p>
                                                        {place.rating ? (
                                                            <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--theme-muted)', textAlign: 'center', padding: '40px 0' }}>No partner galleries found in {selectedCity}.</div>
                            )
                        ) : (
                            // Big cities curation with horizontal sliders
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                                {(() => {
                                    const CITIES = ['Jakarta', 'Yogyakarta', 'Bali', 'Bandung', 'Surabaya', 'Semarang', 'Medan', 'Makassar', 'Cirebon', 'Padang', 'Banjarmasin', 'Mataram'];
                                    const activeCities = CITIES.filter(city =>
                                        filteredGalleries.some((p: any) =>
                                            (p.city || p.address?.city || '').toLowerCase().includes(city.toLowerCase())
                                        )
                                    ).slice(0, 10);

                                    return activeCities.map(city => {
                                        const cityPlaces = filteredGalleries.filter((p: any) =>
                                            (p.city || p.address?.city || '').toLowerCase().includes(city.toLowerCase())
                                        );
                                        
                                        const sortedPlaces = [...cityPlaces].sort((a, b) => {
                                            const rA = a.rating || 0;
                                            const rB = b.rating || 0;
                                            if (rB !== rA) return rB - rA;
                                            return (b.reviews?.length || 0) - (a.reviews?.length || 0);
                                        });

                                        const isExpanded = !!expandedGalleryCities[city];
                                        const displayCount = isExpanded ? 15 : 5;
                                        const displayPlaces = sortedPlaces.slice(0, displayCount);
                                        const hasMore = sortedPlaces.length > 5;

                                        return (
                                            <div key={city} className="vg-section" style={{ margin: 0 }}>
                                                <div className="vg-section-header" style={{ padding: '0 4px', marginBottom: 12 }}>
                                                    <h4 className="vg-section-title" style={{ fontSize: 18, fontWeight: 750 }}>{city} Galleries</h4>
                                                    <span className="vg-section-more" style={{ fontSize: 11 }}>
                                                        {isExpanded ? 'Showing Top 15' : 'Top 5 Partner'}
                                                    </span>
                                                </div>
                                                <div className="vg-horizontal-slider">
                                                    {displayPlaces.map((place: any, index: number) => {
                                                        const imgUrl = getMuseumImage(place);
                                                        return (
                                                            <motion.div
                                                                key={place.id || index}
                                                                className="vg-wide-card"
                                                                style={{ width: 280, flexShrink: 0, cursor: 'pointer' }}
                                                                whileHover={{ y: -4 }}
                                                                onClick={() => navigate(`/gallery/museum/${place.slug || place.id}`)}
                                                            >
                                                                <div className="vg-wide-img-wrap" style={{ height: 160, borderRadius: 20 }}>
                                                                    <img src={imgUrl} alt={place.name} className="vg-wide-img" />
                                                                    <span style={{ position: 'absolute', top: 10, right: 10, padding: '3px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.9)', color: 'white' }}>
                                                                        Partner
                                                                    </span>
                                                                </div>
                                                                <div style={{ padding: '10px 4px' }}>
                                                                    <h4 className="vg-card-title" style={{ fontSize: 15, lineClamp: 1, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{place.name}</h4>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                                        <p className="vg-card-subtitle" style={{ margin: 0 }}>
                                                                            <MapPin style={{ width: 10, height: 10, marginRight: 2 }} />
                                                                            {place.city || place.address?.city}
                                                                        </p>
                                                                        {place.rating ? (
                                                                            <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}

                                                    {hasMore && (
                                                        <motion.div
                                                            className="vg-wide-card"
                                                            style={{
                                                                width: 140,
                                                                height: 160,
                                                                flexShrink: 0,
                                                                cursor: 'pointer',
                                                                borderRadius: 20,
                                                                border: '2px dashed var(--theme-border)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 8,
                                                                backgroundColor: 'var(--theme-elevated)'
                                                            }}
                                                            whileHover={{ scale: 1.02 }}
                                                            onClick={() => setExpandedGalleryCities(prev => ({ ...prev, [city]: !isExpanded }))}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <MinusCircle style={{ width: 32, height: 32, color: 'var(--theme-muted)' }} />
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Show Less</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <PlusCircle style={{ width: 32, height: 32, color: 'var(--text-gold, #C9A84C)' }} />
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>Show More</span>
                                                                </>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </motion.div>
    );
}

export default GalleryPage;
