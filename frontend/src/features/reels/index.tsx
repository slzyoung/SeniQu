/**
 * ReelsPage — Premium Instagram-style short-form video feed.
 * Fully integrated with real data from the API (reelsService).
 * Mobile-first with scroll-snap, infinite loading, and glassmorphic UI.
 * Includes in-page search overlay with category filters.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Loader2, Play, Copy, Link2, X, SlidersHorizontal } from 'lucide-react';
import { useReelsFeed } from '../../hooks/useReels';
import { useAuthStore } from '../../stores/useAuthStore';
import { useToast } from '../../stores/useNotificationStore';
import ReelItem from './components/ReelItem';
import CommentsDrawer from './components/CommentsDrawer';
import UploadReelModal from './components/UploadReelModal';
import Button from '../../components/ui/Button';
import './reels.css';

const REEL_CATEGORIES = ['All', 'Art', 'Music', 'Dance', 'Nature', 'Culture', 'Photography', 'Creative'] as const;

export function ReelsPage() {
    const { user } = useAuthStore();
    const toast = useToast();
    const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useReelsFeed();
    const [isMuted, setIsMuted] = useState(true);
    const [activeReelId, setActiveReelId] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [commentsReel, setCommentsReel] = useState<string | null>(null);
    const [shareReel, setShareReel] = useState<string | null>(null);

    // Search state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const allReels = data?.pages.flatMap(p => p.data) || [];

    // Client-side search + category filter
    const reels = useMemo(() => {
        let filtered = allReels;
        const q = searchQuery.trim().toLowerCase();

        if (q) {
            filtered = filtered.filter((r: any) => {
                const caption = (r.caption || '').toLowerCase();
                const name = (r.user?.display_name || r.user?.displayName || '').toLowerCase();
                const tags = (r.hashtags || []).join(' ').toLowerCase();
                return caption.includes(q) || name.includes(q) || tags.includes(q);
            });
        }

        if (activeCategory !== 'All') {
            const catLower = activeCategory.toLowerCase();
            filtered = filtered.filter((r: any) => {
                const tags = (r.hashtags || []).join(' ').toLowerCase();
                const caption = (r.caption || '').toLowerCase();
                return tags.includes(catLower) || caption.includes(catLower);
            });
        }

        return filtered;
    }, [allReels, searchQuery, activeCategory]);

    // Focus search input when opened
    useEffect(() => {
        if (showSearch) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [showSearch]);

    // Intersection observer for auto-play detection
    const observer = useRef<IntersectionObserver | null>(null);
    useEffect(() => {
        observer.current = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const id = e.target.getAttribute('data-reel-id');
                    if (id) setActiveReelId(id);
                }
            });
        }, { threshold: 0.6 });
        return () => observer.current?.disconnect();
    }, []);

    // Infinite scroll trigger
    const containerRef = useRef<HTMLDivElement>(null);
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetching) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetching, fetchNextPage]);

    const handleShare = (reelId: string) => setShareReel(reelId);
    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/reels?v=${shareReel}`);
        toast.success('Link Copied', 'Reel link has been copied to your clipboard.');
        setShareReel(null);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setActiveCategory('All');
        setShowSearch(false);
    };

    return (
        <div className="reels-container">
            {/* ═══ Header ═══ */}
            <div className="reels-header">
                <span className="reels-header-title">Reels</span>
                <button
                    onClick={() => setShowSearch(true)}
                    className="reels-header-btn"
                    aria-label="Search reels"
                >
                    <Search style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {/* ═══ Search Overlay ═══ */}
            {showSearch && (
                <div className="reels-search-overlay">
                    <div className="reels-search-panel">
                        {/* Search Input Row */}
                        <div className="reels-search-input-row">
                            <Search style={{ width: 18, height: 18, color: 'var(--text-muted, #888)', flexShrink: 0 }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by title, creator, hashtag..."
                                className="reels-search-input"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="reels-search-clear-btn">
                                    <X style={{ width: 16, height: 16 }} />
                                </button>
                            )}
                            <button onClick={clearSearch} className="reels-search-cancel-btn">
                                Cancel
                            </button>
                        </div>

                        {/* Category Filters */}
                        <div className="reels-search-filters">
                            <SlidersHorizontal style={{ width: 14, height: 14, color: 'var(--text-muted, #888)', flexShrink: 0, marginRight: 4 }} />
                            <div className="reels-search-filters-scroll">
                                {REEL_CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`reels-filter-chip ${activeCategory === cat ? 'active' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Results Summary */}
                        {(searchQuery || activeCategory !== 'All') && (
                            <div className="reels-search-results-info">
                                <span>
                                    {reels.length} reel{reels.length !== 1 ? 's' : ''} found
                                    {searchQuery && <> for "<strong>{searchQuery}</strong>"</>}
                                    {activeCategory !== 'All' && <> in <strong>{activeCategory}</strong></>}
                                </span>
                                {(searchQuery || activeCategory !== 'All') && (
                                    <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} className="reels-search-reset-btn">
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Content ═══ */}
            {isLoading ? (
                <div className="reels-empty">
                    <Loader2 style={{ width: 32, height: 32 }} className="animate-spin text-amber-500" />
                    <p className="text-theme-muted text-sm">Loading reels...</p>
                </div>
            ) : reels.length === 0 ? (
                <div className="reels-empty">
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8
                    }}>
                        <Play style={{ width: 36, height: 36, fill: '#C9A84C', color: '#C9A84C' }} />
                    </div>
                    <h3 className="text-theme-text font-serif text-lg font-bold">
                        {searchQuery || activeCategory !== 'All' ? 'No Matching Reels' : 'No Reels Yet'}
                    </h3>
                    <p className="text-theme-muted text-sm" style={{ maxWidth: 260 }}>
                        {searchQuery || activeCategory !== 'All'
                            ? 'Try different keywords or categories to discover more content.'
                            : 'Be the first to share a creative short video on SeniQu!'
                        }
                    </p>
                    {!searchQuery && activeCategory === 'All' && (
                        <Button
                            variant="gold"
                            onClick={() => { if (!user) { toast.error('Login Required', 'Sign in to create a Reel'); return; } setShowUpload(true); }}
                            className="rounded-xl px-6 mt-2"
                        >
                            Create Reel
                        </Button>
                    )}
                    {(searchQuery || activeCategory !== 'All') && (
                        <button onClick={clearSearch} className="mt-3 text-sm text-amber-500 hover:text-amber-400 font-semibold transition-colors">
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div ref={containerRef} onScroll={handleScroll} className="reels-scroll">
                    {reels.map(reel => (
                        <ReelItem
                            key={reel.id}
                            reel={reel}
                            isActive={reel.id === activeReelId}
                            isMuted={isMuted}
                            onMuteToggle={() => setIsMuted(!isMuted)}
                            onOpenComments={() => setCommentsReel(reel.id)}
                            onShare={() => handleShare(reel.id)}
                            observerRef={el => { if (el) observer.current?.observe(el); }}
                        />
                    ))}
                </div>
            )}

            {/* ═══ Comments Drawer ═══ */}
            {commentsReel && <CommentsDrawer reelId={commentsReel} onClose={() => setCommentsReel(null)} />}

            {/* ═══ Upload Modal ═══ */}
            {showUpload && <UploadReelModal onClose={() => setShowUpload(false)} />}

            {/* ═══ Share Bottom Sheet ═══ */}
            {shareReel && (
                <div className="reel-share-overlay" onClick={e => { if (e.target === e.currentTarget) setShareReel(null); }}>
                    <div className="reel-share-menu">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 className="text-theme-text font-bold text-sm">Share Reel</h3>
                            <button onClick={() => setShareReel(null)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)' }}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>
                        <div className="reel-share-grid">
                            <button onClick={copyLink} className="reel-share-item">
                                <div className="reel-share-icon" style={{ background: 'rgba(201,168,76,0.12)' }}>
                                    <Link2 style={{ width: 22, height: 22, color: '#C9A84C' }} />
                                </div>
                                <span className="reel-share-label">Copy Link</span>
                            </button>
                            <button
                                onClick={() => {
                                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '/reels?v=' + shareReel)}`, '_blank');
                                    setShareReel(null);
                                }}
                                className="reel-share-item"
                            >
                                <div className="reel-share-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
                                    <Copy style={{ width: 22, height: 22, color: '#3B82F6' }} />
                                </div>
                                <span className="reel-share-label">Twitter</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReelsPage;
