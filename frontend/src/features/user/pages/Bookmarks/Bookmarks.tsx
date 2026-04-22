/**
 * Bookmarks Page (Virtual Art Gallery 3D Coverflow)
 * Mockup Implementation based on design reference.
 */

import { useState, useCallback } from 'react';
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
    MoreHorizontal,
    X,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Bookmarks.css';

// ============================================
// MOCKUP DATA
// ============================================

const MOCK_GALLERY = [
    {
        id: '1',
        title: 'Abstract Nebula',
        artist: 'Elena Rossi',
        image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
        likes: '1.2k',
        comments: '342',
        stars: '89',
        shares: '45'
    },
    {
        id: '2',
        title: 'Mountain Echoes',
        artist: 'David Chen',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
        likes: '3.4k',
        comments: '1.1k',
        stars: '234',
        shares: '120'
    },
    {
        id: '3',
        title: 'Autumn Rain in Paris',
        artist: 'Juliette Monet',
        image: 'https://images.unsplash.com/photo-1518144591331-17a5dd71c477?w=800&q=80',
        likes: '8.9k',
        comments: '2.3k',
        stars: '890',
        shares: '432'
    },
    {
        id: '4',
        title: 'Christ in the Storm on the Sea of Galilee',
        artist: 'Rembrandt van Rijn',
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80',
        likes: '2.5k',
        comments: '878',
        stars: '56',
        shares: '154'
    },
    {
        id: '5',
        title: 'The Blue Raven',
        artist: 'Marcus Thorne',
        image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80',
        likes: '4.1k',
        comments: '567',
        stars: '120',
        shares: '89'
    },
    {
        id: '6',
        title: 'Urban Solitude',
        artist: 'Sarah Jenkins',
        image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80',
        likes: '1.8k',
        comments: '234',
        stars: '45',
        shares: '23'
    },
    {
        id: '7',
        title: 'Golden Horizon',
        artist: 'Liam Wright',
        image: 'https://images.unsplash.com/photo-1506744626753-1fa44df14d28?w=800&q=80',
        likes: '5.6k',
        comments: '1.2k',
        stars: '432',
        shares: '210'
    }
];

// ============================================
// COMPONENT
// ============================================

export default function Bookmarks() {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(3); // Start with 'Christ in the Storm...' centered
    const [infoOpen, setInfoOpen] = useState(false);

    // Navigation handlers
    const handleNext = useCallback(() => {
        if (activeIndex < MOCK_GALLERY.length - 1) {
            setActiveIndex(prev => prev + 1);
            setInfoOpen(false);
        }
    }, [activeIndex]);

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
                    backgroundImage: `url(${MOCK_GALLERY[activeIndex].image})`,
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

            {/* 3D Coverflow Container with Drag */}
            <motion.div 
                className="bm-coverflow-wrapper"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                    if (offset.x < -50 || velocity.x < -300) {
                        handleNext();
                    } else if (offset.x > 50 || velocity.x > 300) {
                        handlePrev();
                    }
                }}
            >
                {MOCK_GALLERY.map((art, index) => {
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
                                    <div className="bm-action-item text-pink-400 hover:text-pink-300">
                                        <Heart className="w-4 h-4" fill="currentColor" /> {art.likes}
                                    </div>
                                    <div className="bm-action-item">
                                        <MessageCircle className="w-4 h-4" /> {art.comments}
                                    </div>
                                    <div className="bm-action-item">
                                        <Star className="w-4 h-4" /> {art.stars}
                                    </div>
                                    <div className="bm-action-item">
                                        <Share2 className="w-4 h-4" /> {art.shares}
                                    </div>
                                    <div className="bm-action-item">
                                        <MoreHorizontal className="w-4 h-4" />
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

            {/* Information Overlay (Toggled when clicking active image) */}
            <AnimatePresence>
                {infoOpen && (
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
                            {MOCK_GALLERY[activeIndex].title}
                        </motion.h1>
                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-xl text-gold"
                        >
                            by {MOCK_GALLERY[activeIndex].artist}
                        </motion.p>
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-8 max-w-2xl text-center text-white/70 leading-relaxed"
                        >
                            This is a beautifully rendered artwork capturing the essence of the scene. The dynamic lighting and masterful composition invite the viewer into a profound narrative space. (Click anywhere to close)
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
