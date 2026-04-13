/**
 * My Arts Page — Personal Collection Experience
 * Implements the premium aesthetic from the design mockup:
 * Art Stories hero, Today's Art Highlight horizontal scroll, and Masterpieces masonry.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    ShoppingCart,
    Send,
    Tag,
    Loader2,
    Eye,
    Plus,
    Check,
    Image as ImageIcon
} from 'lucide-react';
import { useOwnedArts, useCreatedArts, useUnlistArt } from '../../../hooks/useArt';
import './MyArts.css';

// ============================================================
// HELPERS
// ============================================================

function getArtImage(art: any, fallback = '/placeholder-art.jpg'): string {
    if (!art) return fallback;
    const artwork = art.artwork || art;
    if (artwork.primaryImageUrl) return artwork.primaryImageUrl;
    if (artwork.primary_image_url) return artwork.primary_image_url;
    if (artwork.imageUrl) return artwork.imageUrl;
    let imgs = artwork.images;
    if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) {
        return typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url || fallback;
    }
    return fallback;
}

const HERO_MOCKUP_IMAGE = 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80&auto=format';

// ============================================================
// MAIN COMPONENT
// ============================================================

export function MyNFTsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'owned' | 'created'>('owned');

    // Queries
    const { data: ownedData, isLoading: ownedLoading } = useOwnedArts();
    const { data: createdData, isLoading: createdLoading } = useCreatedArts();

    // Mutations
    const unlistArt = useUnlistArt();

    const ownedNFTs = ownedData?.data || [];
    const createdNFTs = createdData?.data || [];
    const isLoading = activeTab === 'owned' ? ownedLoading : createdLoading;
    const currentNFTs = activeTab === 'owned' ? ownedNFTs : createdNFTs;

    // Derived states
    const highlights = useMemo(() => {
        return currentNFTs.slice(0, 3);
    }, [currentNFTs]);

    const masterpieces = useMemo(() => {
        return currentNFTs.slice(3);
    }, [currentNFTs]);

    const handleList = (art: any, e: React.MouseEvent) => {
        e.stopPropagation();
        // Open list modal (mocked for now, assumes handled via contexts/modals normally)
        alert('List art triggered for: ' + art.id);
    };

    const handleUnlist = (artId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        unlistArt.mutate(artId);
    };

    const handleTransfer = (art: any, e: React.MouseEvent) => {
        e.stopPropagation();
        alert('Transfer art triggered for: ' + art.id);
    };

    return (
        <motion.div
            className="my-arts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* ====== TOP NAV (Optional, per mockup style) ====== */}
            <div className="my-arts__top-nav">
                <div className="my-arts__profile-pill">
                    <div className="my-arts__profile-avatar">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <span className="my-arts__profile-name">My Studio</span>
                </div>
                {/* 
                // Settings/menu button removed to avoid redirect conflict, 
                // but kept the styling concept 
                <button className="my-arts__menu-btn">
                    <span style={{ fontSize: 18, lineHeight: 1 }}>≡</span>
                </button>
                */}
            </div>

            {/* ====== HERO: ART STORIES ====== */}
            <div className="my-arts__hero">
                <img
                    src={HERO_MOCKUP_IMAGE}
                    alt="Art Stories"
                    className="my-arts__hero-bg"
                />
                {/* Two side blurred panels per mockup vibe */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '25%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '25%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }} />

                {/* Central Title */}
                <div style={{ position: 'absolute', top: '15%', left: 0, width: '100%', textAlign: 'center', zIndex: 2 }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: 2, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        ART<br />STORIES
                    </h2>
                </div>

                <div className="my-arts__hero-glass">
                    <h1 className="my-arts__hero-title">Hello Art Lover</h1>
                    <p className="my-arts__hero-desc">
                        Explore your collected masterpieces, verified on the blockchain. 
                        Your personal gallery awaits.
                    </p>
                    <button
                        className="my-arts__hero-btn"
                        onClick={() => navigate('/dashboard/marketplace')}
                    >
                        Explore Marketplace
                    </button>
                </div>
            </div>

            {/* ====== HEADER & TABS ====== */}
            <div className="my-arts__section">
                <div className="my-arts__tabs">
                    <button
                        className={`my-arts__tab ${activeTab === 'owned' ? 'my-arts__tab--active' : ''}`}
                        onClick={() => setActiveTab('owned')}
                    >
                        Owned Masterpieces
                    </button>
                    <button
                        className={`my-arts__tab ${activeTab === 'created' ? 'my-arts__tab--active' : ''}`}
                        onClick={() => setActiveTab('created')}
                    >
                        Created by Me
                    </button>
                </div>
            </div>

            {/* ====== LOADING / EMPTY ====== */}
            {isLoading ? (
                <div className="my-arts-loader">
                    <Loader2 />
                </div>
            ) : currentNFTs.length === 0 ? (
                <div className="my-arts__section">
                    <div className="my-arts__empty">
                        <ImageIcon className="my-arts__empty-icon" />
                        <h3 className="my-arts__empty-title">Gallery is Empty</h3>
                        <p className="my-arts__empty-text">
                            {activeTab === 'owned'
                                ? 'You haven\'t collected any artworks yet. Visit the marketplace to start your collection.'
                                : 'You haven\'t created any artworks yet.'}
                        </p>
                        {activeTab === 'owned' && (
                            <button
                                className="my-arts__action-btn my-arts__action-btn--primary"
                                style={{ padding: '12px 24px', fontSize: 14, width: 'auto' }}
                                onClick={() => navigate('/dashboard/marketplace')}
                            >
                                Browse Marketplace
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* ====== TODAY'S HIGHLIGHT ====== */}
                    {highlights.length > 0 && (
                        <div className="my-arts__section">
                            <div className="my-arts__section-header">
                                <h2 className="my-arts__section-title">
                                    Today's Art<br />Highlight
                                </h2>
                                {/* Decorative elements could go here */}
                            </div>
                            <div className="my-arts__highlights">
                                {highlights.map((art: any, i: number) => {
                                    const artwork = art.artwork || art;
                                    return (
                                        <div
                                            key={art.id}
                                            className="my-arts__highlight-card my-arts__fade-in"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                            onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                        >
                                            <img
                                                src={getArtImage(art)}
                                                alt={artwork.title}
                                                className="my-arts__highlight-img"
                                            />
                                            {art.isListed && (
                                                <span className="my-arts__badge my-arts__badge--listed">Listed</span>
                                            )}
                                            {!art.isListed && (
                                                <span className="my-arts__badge">Collected</span>
                                            )}
                                            <div className="my-arts__highlight-content">
                                                <h4 className="my-arts__highlight-title">{artwork.title || 'Untitled'}</h4>
                                                <p className="my-arts__highlight-subtitle">
                                                    by {art.creator?.displayName || artwork.artist?.displayName || 'Unknown Artist'}
                                                </p>
                                                
                                                {/* Actions */}
                                                <div className="my-arts__btn-group">
                                                    {art.isListed ? (
                                                        <button 
                                                            className="my-arts__action-btn"
                                                            onClick={(e) => handleUnlist(art.id, e)}
                                                        >
                                                            Unlist
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="my-arts__action-btn my-arts__action-btn--primary"
                                                            onClick={(e) => handleList(art, e)}
                                                        >
                                                            <Tag style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> List
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="my-arts__action-btn"
                                                        onClick={(e) => handleTransfer(art, e)}
                                                    >
                                                        <Send style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Transfer
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ====== MASTERPIECES (MASONRY) ====== */}
                    {masterpieces.length > 0 && (
                        <div className="my-arts__section">
                            <div className="my-arts__section-header">
                                <h2 className="my-arts__section-title" style={{ fontSize: 24 }}>Masterpieces</h2>
                                <button className="my-arts__see-all">Explore all</button>
                            </div>
                            
                            <div className="my-arts__masonry">
                                {masterpieces.map((art: any, i: number) => {
                                    const artwork = art.artwork || art;
                                    return (
                                        <div
                                            key={art.id}
                                            className="my-arts__masonry-item my-arts__fade-in"
                                            style={{ animationDelay: `${(i % 5) * 0.1}s` }}
                                            onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                        >
                                            <img
                                                src={getArtImage(art)}
                                                alt={artwork.title}
                                                className="my-arts__masonry-img"
                                                loading="lazy"
                                            />
                                            {art.isListed && (
                                                <span className="my-arts__badge my-arts__badge--listed" style={{ fontSize: 8, padding: '2px 6px' }}>Listed</span>
                                            )}
                                            <div className="my-arts__masonry-overlay">
                                                <h4 className="my-arts__masonry-title">{artwork.title || 'Untitled'}</h4>
                                                
                                                <div className="my-arts__btn-group" style={{ marginTop: 4 }}>
                                                    {art.isListed ? (
                                                        <button 
                                                            className="my-arts__action-btn"
                                                            onClick={(e) => handleUnlist(art.id, e)}
                                                        >
                                                            Unlist
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="my-arts__action-btn my-arts__action-btn--primary"
                                                            onClick={(e) => handleList(art, e)}
                                                        >
                                                            List
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}

export default MyNFTsPage;
