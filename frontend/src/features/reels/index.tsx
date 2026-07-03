/**
 * ReelsPage — Premium Instagram-style short-form video feed.
 * Fully integrated with real data from the API (reelsService).
 * Mobile-first with scroll-snap, infinite loading, and glassmorphic UI.
 * Includes in-page search overlay with category filters.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search, Loader2, Play, Link2, X, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { useReelsFeed, useReel } from '../../hooks/useReels';
import { useAuthStore } from '../../stores/useAuthStore';
import { useToast } from '../../stores/useNotificationStore';
import ReelItem from './components/ReelItem';
import CommentsDrawer from './components/CommentsDrawer';
import UploadReelModal from './components/UploadReelModal';
import Button from '../../components/ui/Button';
import './reels.css';

const REEL_CATEGORIES = ['All', 'Art', 'Music', 'Dance', 'Nature', 'Culture', 'Photography', 'Creative'] as const;

export function ReelsPage() {
    const { user, isAuthenticated } = useAuthStore();
    const toast = useToast();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Extract query/state parameters
    const initialReelId = useMemo(() => {
        return location.state?.initialReelId || searchParams.get('v') || null;
    }, [location.state, searchParams]);

    const filterCreatorId = useMemo(() => {
        return location.state?.creatorId || searchParams.get('creatorId') || undefined;
    }, [location.state, searchParams]);

    const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useReelsFeed(10, filterCreatorId);
    const { data: singleReelData } = useReel(initialReelId || '', !!initialReelId);

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

    const allReels = useMemo(() => {
        const feedReels = data?.pages.flatMap(p => p.data) || [];
        if (initialReelId && singleReelData) {
            const exists = feedReels.some((r: any) => r.id === initialReelId);
            if (!exists) {
                return [singleReelData, ...feedReels];
            }
        }
        return feedReels;
    }, [data, initialReelId, singleReelData]);

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

    // Toggle body class when search overlay is active to prevent navbar overlap on mobile
    useEffect(() => {
        if (showSearch) {
            document.body.classList.add('reels-search-active');
        } else {
            document.body.classList.remove('reels-search-active');
        }
        return () => {
            document.body.classList.remove('reels-search-active');
        };
    }, [showSearch]);

    // Listen for mobile nav header search button event
    useEffect(() => {
        const handleOpenSearch = () => setShowSearch(true);
        window.addEventListener('open-reels-search', handleOpenSearch);
        return () => window.removeEventListener('open-reels-search', handleOpenSearch);
    }, []);

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

    // Scroll to initial reel when loaded
    useEffect(() => {
        if (!isLoading && reels.length > 0 && initialReelId) {
            const index = reels.findIndex((r: any) => r.id === initialReelId);
            if (index !== -1) {
                setActiveReelId(initialReelId);
                setTimeout(() => {
                    const el = document.querySelector(`[data-reel-id="${initialReelId}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'auto', block: 'start' });
                    }
                }, 100);
            }
        }
    }, [isLoading, reels, initialReelId]);

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
        <div className={`reels-container ${isAuthenticated ? 'reels-auth' : 'reels-guest'}`}>
            {/* ═══ Header (Desktop only — hidden on mobile) ═══ */}
            <div className="reels-header">
                <span className="reels-header-title">Reels</span>
                <div className="reels-header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowSearch(true)}
                        className="reels-header-btn"
                        aria-label="Search reels"
                    >
                        <Search style={{ width: 20, height: 20 }} />
                    </button>
                </div>
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

            {/* ═══ Create Reel FAB — Portal for clean z-index ═══ */}
            {isAuthenticated && !showUpload && !commentsReel && !shareReel && createPortal(
                <button
                    className="reels-fab"
                    onClick={() => setShowUpload(true)}
                    aria-label="Create new reel"
                >
                    <span className="reels-fab-pulse" />
                    <span className="reels-fab-inner">
                        <PlusCircle style={{ width: 22, height: 22 }} />
                        <span className="reels-fab-label">Create</span>
                    </span>
                </button>,
                document.body
            )}

            {/* ═══ Share Bottom Sheet ═══ */}
            {shareReel && createPortal(
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
                                <div className="reel-share-icon" style={{ background: 'rgba(201, 168, 76, 0.15)' }}>
                                    <Link2 style={{ width: 20, height: 20, color: '#C9A84C' }} />
                                </div>
                                <span className="reel-share-label">Copy Link</span>
                            </button>

                            <button 
                                onClick={() => {
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this amazing reel on SeniQu: ' + window.location.origin + '/reels?v=' + shareReel)}`, '_blank');
                                    setShareReel(null);
                                }} 
                                className="reel-share-item"
                            >
                                <div className="reel-share-icon" style={{ background: 'rgba(37, 211, 102, 0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" className="w-5 h-5 text-[#25D366]" style={{ fill: '#25D366' }}>
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.526 1.909 14.058.887 11.43 .887c-5.442 0-9.87 4.42-9.874 9.86-.001 1.77.462 3.5 1.34 5.025l-.974 3.564 3.645-.956zM17.3 14.86c-.287-.144-1.702-.84-1.965-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-2.844-1.417-4.66-2.56-6.137-5.099-.136-.233-.036-.37.07-.487.165-.183.33-.298.485-.434.15-.132.227-.225.32-.397.094-.173.048-.337-.024-.481-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.49-.168-.008-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.192 2.032 3.102 4.921 4.348 2.889 1.246 2.889.83 3.4.78.513-.05 1.703-.696 1.943-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.192-.552-.336z"/>
                                    </svg>
                                </div>
                                <span className="reel-share-label">WhatsApp</span>
                            </button>

                            <button 
                                onClick={() => {
                                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/reels?v=' + shareReel)}&text=${encodeURIComponent('Check out this amazing reel on SeniQu!')}`, '_blank');
                                    setShareReel(null);
                                }} 
                                className="reel-share-item"
                            >
                                <div className="reel-share-icon" style={{ background: 'rgba(38, 165, 228, 0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" className="w-5 h-5 text-[#26A5E4]" style={{ fill: '#26A5E4' }}>
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.87 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.536-.196.996.12.784 1.144z"/>
                                    </svg>
                                </div>
                                <span className="reel-share-label">Telegram</span>
                            </button>

                            <button 
                                onClick={() => {
                                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/reels?v=' + shareReel)}`, '_blank');
                                    setShareReel(null);
                                }} 
                                className="reel-share-item"
                            >
                                <div className="reel-share-icon" style={{ background: 'rgba(24, 119, 242, 0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" className="w-5 h-5 text-[#1877F2]" style={{ fill: '#1877F2' }}>
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </div>
                                <span className="reel-share-label">Facebook</span>
                            </button>

                            <button 
                                onClick={() => {
                                    window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '/reels?v=' + shareReel)}&text=${encodeURIComponent('Check out this amazing reel on SeniQu!')}`, '_blank');
                                    setShareReel(null);
                                }} 
                                className="reel-share-item"
                            >
                                <div className="reel-share-icon reel-share-icon--x">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" className="w-[18px] h-[18px]" style={{ fill: 'currentColor' }}>
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </div>
                                <span className="reel-share-label">X / Twitter</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default ReelsPage;
