import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Home, 
    Compass, 
    Heart, 
    User, 
    Maximize2,
    MessageCircle,
    Star,
    Share2,
    X,
    ArrowLeft,
    ArrowRight,
    Bookmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBookmarks, useRemoveBookmark } from '../../../../hooks/useUser';
import './Bookmarks.css';

// ============================================
// COMPONENT
// ============================================

export default function Bookmarks() {
    const navigate = useNavigate();
    
    // Fetch live user bookmarks
    const { data: bookmarksRes, isLoading } = useBookmarks(1, 50);
    const removeBookmarkMutation = useRemoveBookmark();
    
    const [gallery, setGallery] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [infoOpen, setInfoOpen] = useState(false);

    // Synchronize bookmarks query to state
    useEffect(() => {
        if (bookmarksRes?.data) {
            const mapped = bookmarksRes.data
                .map((item: any) => {
                    const art = item.artwork || item;
                    if (!art) return null;
                    return {
                        id: art.id,
                        title: art.title,
                        artist: art.artist?.displayName || art.artist?.display_name || 'SeniQu Creator',
                        image: art.primaryImageUrl || art.primary_image_url || art.image_url,
                        likes: `${art.likes || 0}`,
                        comments: '12',
                        stars: `${art.views || art.views_count || 0}`,
                        shares: '4',
                        description: art.description,
                        artworkType: art.artworkType || art.artwork_type || 'physical',
                        poaCertificate: art.poaCertificate || art.poa_certificate
                    };
                })
                .filter((x: any) => x !== null);
            
            setGallery(mapped);
            setActiveIndex(mapped.length > 0 ? Math.floor(mapped.length / 2) : 0);
        }
    }, [bookmarksRes]);

    const handleUnbookmark = async (id: string, title: string) => {
        // Only perform database remove if it is not a dummy item
        if (!id.startsWith('dummy-') && id.length > 5) {
            try {
                await removeBookmarkMutation.mutateAsync(id);
            } catch (e) {
                console.error('Failed to remove bookmark:', e);
            }
        }
        
        // Remove item from state with nice transitions
        setGallery(prev => {
            const next = prev.filter(item => item.id !== id);
            // Adjust activeIndex if out of bounds
            if (activeIndex >= next.length && next.length > 0) {
                setActiveIndex(next.length - 1);
            }
            return next;
        });
    };

    // Navigation handlers
    const handleNext = useCallback(() => {
        if (activeIndex < gallery.length - 1) {
            setActiveIndex(prev => prev + 1);
            setInfoOpen(false);
        }
    }, [activeIndex, gallery.length]);

    const handlePrev = useCallback(() => {
        if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
            setInfoOpen(false);
        }
    }, [activeIndex]);

    // Handle clicking a specific card
    const handleCardClick = (index: number) => {
        if (index === activeIndex) {
            // Toggle info if clicking the active card
            setInfoOpen(!infoOpen);
        } else {
            // Center the clicked card
            setActiveIndex(index);
            setInfoOpen(false);
        }
    };

    return (
        <div className="bm-page">
            {/* Background Image that dynamically changes based on active index (parallax effect) */}
            <div 
                className="bm-background" 
                style={{ 
                    backgroundImage: gallery[activeIndex] ? `url(${gallery[activeIndex].image})` : 'none',
                    transform: `translateX(${(activeIndex - 3) * -2}%) scale(1.1)` 
                }} 
            />
            <div className="bm-overlay" />

            {/* Top Close Button (for desktop mostly) */}
            <button className="bm-close-page" onClick={() => navigate(-1)}>
                <X className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="bm-search-container">
                <div className="bm-search-bar">
                    <Search className="w-4 h-4 text-white/60" />
                    <input type="text" placeholder="Search here..." />
                </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="bm-sidebar">
                <button className="bm-nav-btn" onClick={() => navigate('/dashboard')}><Home className="w-5 h-5" /></button>
                <button className="bm-nav-btn"><Search className="w-5 h-5" /></button>
                <button className="bm-nav-btn"><Compass className="w-5 h-5" /></button>
                <button className="bm-nav-btn active"><Heart className="w-5 h-5" fill="currentColor" /></button>
                <button className="bm-nav-btn" onClick={() => navigate('/profile')}><User className="w-5 h-5" /></button>
            </div>

            {gallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] z-10 text-center px-4 relative mt-20">
                    <div className="p-4 bg-gold/10 rounded-full mb-4">
                        <Bookmark className="w-12 h-12 text-gold animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Saved Artworks</h2>
                    <p className="text-white/60 max-w-md mb-6 text-sm">
                        Explore the marketplace, discover historic masterpieces, and bookmark favorites to view them in your virtual 3D Coverflow gallery.
                    </p>
                    <button 
                        className="px-6 py-2.5 bg-gold text-black font-semibold rounded-full hover:bg-yellow-400 transition-all shadow-lg shadow-gold/20 text-sm"
                        onClick={() => navigate('/dashboard/marketplace')}
                    >
                        Explore Marketplace
                    </button>
                </div>
            ) : (
                <>
                    {/* 3D Coverflow Container with Drag */}
                    <motion.div 
                        className="bm-coverflow-wrapper"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, { offset, velocity }) => {
                            if (offset.x < -50 || velocity.x < -300) {
                                handleNext();
                            } else if (offset.x > 50 || velocity.x > 300) {
                                handlePrev();
                            }
                        }}
                    >
                        {gallery.map((art, index) => {
                            const isActive = index === activeIndex;
                            const diff = index - activeIndex;
                            const absDiff = Math.abs(diff);

                            // Calculate 3D Transform properties
                            // Spread items further apart on desktop, tighter on mobile
                            const isMobile = window.innerWidth < 768;
                            const xOffset = isMobile ? 80 : 180;
                            
                            const x = diff * xOffset;
                            const scale = isActive ? 1 : Math.max(0.6, 1 - (absDiff * 0.15));
                            const rotateY = diff === 0 ? 0 : diff < 0 ? 35 : -35;
                            const zIndex = 100 - absDiff;
                            const opacity = absDiff > 3 ? 0 : 1; // Hide far items

                            return (
                                <motion.div
                                    key={art.id}
                                    className={`bm-card-wrapper ${isActive ? 'active' : ''}`}
                                    onClick={() => handleCardClick(index)}
                                    initial={false}
                                    animate={{
                                        x,
                                        scale,
                                        rotateY,
                                        zIndex,
                                        opacity
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 25,
                                        mass: 1
                                    }}
                                >
                                    <div className={`bm-card ${isActive ? 'active' : ''}`}>
                                        <img src={art.image} alt={art.title} />
                                        <div className="bm-card-overlay" />
                                        
                                        <button className="bm-expand-btn">
                                            <Maximize2 className="w-4 h-4" />
                                        </button>

                                        <div className="bm-card-info">
                                            <h2 className="bm-card-title">{art.title}</h2>
                                            <p className="bm-card-artist">{art.artist}</p>
                                        </div>

                                        {/* Floating Action Bar (Bottom of card) */}
                                        <div className="bm-action-bar" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className="bm-action-item text-gold hover:text-yellow-400 transition-colors flex items-center gap-1.5 font-semibold"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnbookmark(art.id, art.title);
                                                }}
                                            >
                                                <Bookmark className="w-3.5 h-3.5 text-gold" fill="currentColor" /> Unbookmark
                                            </button>
                                            <div className="bm-action-item">
                                                <MessageCircle className="w-3.5 h-3.5" /> {art.comments}
                                            </div>
                                            <div className="bm-action-item">
                                                <Star className="w-3.5 h-3.5" /> {art.stars}
                                            </div>
                                            <div className="bm-action-item">
                                                <Share2 className="w-3.5 h-3.5" /> {art.shares}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Bottom Swipe Hint */}
                    <div className="bm-swipe-hint">
                        <ArrowLeft className="w-4 h-4" />
                        <div className="bm-swipe-hint-line" />
                        <span>Swipe or Click</span>
                        <div className="bm-swipe-hint-line" />
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </>
            )}

            {/* Information Overlay (Toggled when clicking active image) */}
            <AnimatePresence>
                {infoOpen && gallery[activeIndex] && (
                    <motion.div 
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setInfoOpen(false)}
                    >
                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-3xl md:text-5xl font-serif font-bold text-center mb-4"
                        >
                            {gallery[activeIndex].title}
                        </motion.h1>
                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-xl text-gold"
                        >
                            by {gallery[activeIndex].artist}
                        </motion.p>
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-8 max-w-2xl text-center text-white/70 leading-relaxed"
                        >
                            {gallery[activeIndex].description || "This is a beautifully rendered artwork capturing the essence of the scene. The dynamic lighting and composition invite the viewer into a profound narrative space."}
                            <div className="mt-4 text-xs text-gold/80 flex justify-center gap-4">
                                <span>Type: {gallery[activeIndex].artworkType === 'digital' ? 'Digital NFT (PoA Proof of Art)' : 'Physical Masterpiece (with PoA)'}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
