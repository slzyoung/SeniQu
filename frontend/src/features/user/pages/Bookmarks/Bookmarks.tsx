/**
 * Bookmarks Page — Premium Tabbed UI
 * Two tabs: Artworks (from marketplace) and Reels (saved short videos)
 * Full light + dark theme support. Uses real data from API.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bookmark,
    BookmarkX,
    Image,
    Heart,
    Eye,
    Play,
    Loader2,
} from 'lucide-react';
import { useBookmarks, useRemoveBookmark } from '../../../../hooks/useUser';
import { useSavedReels, useToggleReelReshare } from '../../../../hooks/useReels';
import './Bookmarks.css';

type Tab = 'artworks' | 'reels';

export default function Bookmarks() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('artworks');

    // ── Artwork Bookmarks ──
    const { data: bookmarksRes, isLoading: artLoading } = useBookmarks(1, 50);
    const removeBookmarkMutation = useRemoveBookmark();

    const artworks = (bookmarksRes?.data || [])
        .map((item: any) => {
            const art = item.artwork || item;
            if (!art) return null;
            return {
                id: art.id,
                title: art.title || 'Untitled',
                artist: art.artist?.displayName || art.artist?.display_name || 'SeniQu Creator',
                image: art.primaryImageUrl || art.primary_image_url || art.image_url,
                likes: art.likes || 0,
                views: art.views || art.views_count || 0,
                artworkType: art.artworkType || art.artwork_type || 'physical',
            };
        })
        .filter(Boolean);

    // ── Saved Reels ──
    const { data: savedReelsRes, isLoading: reelsLoading } = useSavedReels(1, 50);
    const toggleReshare = useToggleReelReshare();

    const savedRes: any = savedReelsRes;
    const reelsArray = Array.isArray(savedRes)
        ? savedRes
        : Array.isArray(savedRes?.data)
            ? savedRes.data
            : Array.isArray(savedRes?.data?.data)
                ? savedRes.data.data
                : [];

    const savedReels = reelsArray.map((reel: any) => ({
        id: reel.id,
        caption: reel.caption || '',
        thumbnailUrl: reel.thumbnail_url || reel.thumbnailUrl || '',
        videoUrl: reel.video_url || reel.videoUrl || '',
        duration: reel.duration || 0,
        likeCount: reel.like_count ?? reel.likeCount ?? 0,
        viewCount: reel.view_count ?? reel.viewCount ?? 0,
        userName: reel.user?.display_name || reel.user?.displayName || 'Anonymous',
    }));

    const handleUnbookmarkArt = async (id: string) => {
        if (id.length > 5) {
            try { await removeBookmarkMutation.mutateAsync(id); } catch (e) { /* handled by hook */ }
        }
    };

    const handleUnsaveReel = (reelId: string) => {
        toggleReshare.mutate({ reelId });
    };

    const formatDuration = (s: number) => {
        if (!s) return '';
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    };

    const formatCount = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return String(n);
    };

    return (
        <div className="bm-page">
            {/* Header */}
            <div className="bm-page-header">
                <h1 className="bm-page-title">Bookmarks</h1>
                <p className="bm-page-subtitle">Your saved artworks and reels collection</p>
            </div>

            {/* Tab Bar */}
            <div className="bm-tabs">
                <button
                    className={`bm-tab ${activeTab === 'artworks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artworks')}
                >
                    <Image style={{ width: 16, height: 16 }} />
                    Artworks
                    <span className="bm-tab-count">{artworks.length}</span>
                </button>
                <button
                    className={`bm-tab ${activeTab === 'reels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reels')}
                >
                    <Play style={{ width: 16, height: 16, fill: 'currentColor' }} />
                    Reels
                    <span className="bm-tab-count">{savedReels.length}</span>
                </button>
            </div>

            {/* ═══ Artworks Tab ═══ */}
            {activeTab === 'artworks' && (
                <>
                    {artLoading ? (
                        <div className="bm-loading">
                            <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-amber-500" />
                        </div>
                    ) : artworks.length === 0 ? (
                        <div className="bm-empty">
                            <div className="bm-empty-icon artwork">
                                <Bookmark style={{ width: 32, height: 32, color: '#C9A84C' }} />
                            </div>
                            <h3>No Saved Artworks</h3>
                            <p>
                                Explore the marketplace and bookmark your favorite artworks to build your personal collection.
                            </p>
                            <button
                                className="bm-empty-btn gold"
                                onClick={() => navigate('/dashboard/marketplace')}
                            >
                                Explore Marketplace
                            </button>
                        </div>
                    ) : (
                        <div className="bm-art-grid">
                            {artworks.map((art: any) => (
                                <div
                                    key={art.id}
                                    className="bm-art-card"
                                    onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                >
                                    <div className="bm-art-image-wrap">
                                        {art.image ? (
                                            <img src={art.image} alt={art.title} className="bm-art-image" loading="lazy" />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #C9A84C22, #C9A84C08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Image style={{ width: 32, height: 32, color: '#C9A84C', opacity: 0.3 }} />
                                            </div>
                                        )}
                                        <div className="bm-art-card-overlay" />

                                        {/* Type Badge */}
                                        <span className={`bm-art-type-badge ${art.artworkType === 'digital' ? 'digital' : 'physical'}`}>
                                            {art.artworkType === 'digital' ? 'Digital' : 'Physical'}
                                        </span>

                                        {/* Unbookmark Button */}
                                        <button
                                            className="bm-art-unbookmark"
                                            onClick={(e) => { e.stopPropagation(); handleUnbookmarkArt(art.id); }}
                                            title="Remove bookmark"
                                        >
                                            <BookmarkX style={{ width: 14, height: 14 }} />
                                        </button>
                                    </div>

                                    <div className="bm-art-card-info">
                                        <p className="bm-art-card-title">{art.title}</p>
                                        <p className="bm-art-card-artist">{art.artist}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══ Reels Tab ═══ */}
            {activeTab === 'reels' && (
                <>
                    {reelsLoading ? (
                        <div className="bm-loading">
                            <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-purple-500" />
                        </div>
                    ) : savedReels.length === 0 ? (
                        <div className="bm-empty">
                            <div className="bm-empty-icon reel">
                                <Play style={{ width: 32, height: 32, color: '#8B5CF6', fill: '#8B5CF6' }} />
                            </div>
                            <h3>No Saved Reels</h3>
                            <p>
                                Save reels you love while browsing the feed to watch them again anytime.
                            </p>
                            <button
                                className="bm-empty-btn purple"
                                onClick={() => navigate('/reels')}
                            >
                                Browse Reels
                            </button>
                        </div>
                    ) : (
                        <div className="bm-reels-grid">
                            {savedReels.map((reel: any) => (
                                <div
                                    key={reel.id}
                                    className="bm-reel-card"
                                    onClick={() => navigate('/reels', { state: { initialReelId: reel.id } })}
                                >
                                    {reel.thumbnailUrl ? (
                                        <img src={reel.thumbnailUrl} alt={reel.caption} className="bm-reel-thumb" loading="lazy" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #8B5CF622, #8B5CF608)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Play style={{ width: 28, height: 28, color: '#8B5CF6', fill: '#8B5CF6', opacity: 0.3 }} />
                                        </div>
                                    )}
                                    <div className="bm-reel-gradient" />

                                    {/* Play Icon Overlay */}
                                    <div className="bm-reel-play-icon">
                                        <Play style={{ width: 18, height: 18, fill: '#fff' }} />
                                    </div>

                                    {/* Duration Badge */}
                                    {reel.duration > 0 && (
                                        <span className="bm-reel-duration">{formatDuration(reel.duration)}</span>
                                    )}

                                    {/* Unsave Button */}
                                    <button
                                        className="bm-reel-unsave"
                                        onClick={(e) => { e.stopPropagation(); handleUnsaveReel(reel.id); }}
                                        title="Remove saved reel"
                                    >
                                        <BookmarkX style={{ width: 13, height: 13 }} />
                                    </button>

                                    {/* Info Overlay */}
                                    <div className="bm-reel-card-info">
                                        {reel.caption && (
                                            <p className="bm-reel-card-caption">{reel.caption}</p>
                                        )}
                                        <div className="bm-reel-card-meta">
                                            <span className="bm-reel-card-meta-item">
                                                <Heart style={{ width: 11, height: 11 }} />
                                                {formatCount(reel.likeCount)}
                                            </span>
                                            <span className="bm-reel-card-meta-item">
                                                <Eye style={{ width: 11, height: 11 }} />
                                                {formatCount(reel.viewCount)}
                                            </span>
                                            <span style={{ flex: 1 }} />
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                                                {reel.userName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
