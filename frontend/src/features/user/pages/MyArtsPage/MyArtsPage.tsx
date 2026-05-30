/**
 * My Arts Page - Premium Exhibition Experience for SeniQu
 * Three-slide interactive flow:
 *   Slide 1: Hero landing with Start CTA
 *   Slide 2: Curated collection grid with More CTA -> detail
 *   Slide 3: Framed art detail card with Buy -> marketplace
 *
 * Supports both light and dark modes with warm exhibition aesthetics.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, MapPin, Calendar, ChevronLeft, Sparkles, ArrowRight } from 'lucide-react';
import './MyArtsPage.css';

// ============================================================
// CURATED DATA - Classical art with reliable image sources
// ============================================================

const ART_IMAGES = {
    hero1: 'https://cdn.seniqu.art/assets/static/demo/monalisa.webp',
    hero2: 'https://cdn.seniqu.art/assets/static/demo/starrynight.webp',
    hero3: 'https://cdn.seniqu.art/assets/static/demo/starrynight_detail.webp',
    art1: 'https://cdn.seniqu.art/assets/static/demo/venus.webp',
    art2: 'https://cdn.seniqu.art/assets/static/demo/monalisa.webp',
    art3: 'https://cdn.seniqu.art/assets/static/demo/starrynight.webp',
    art4: 'https://cdn.seniqu.art/assets/static/demo/pearlearring.webp',
};

const MOCK_ARTWORKS = [
    {
        id: '1',
        title: 'Birth of Venus',
        date: 'Exhibition - Dec 2026',
        price: '$195',
        image: ART_IMAGES.art1,
        artist: 'Sandro Botticelli',
        museum: 'Uffizi Gallery',
        location: 'Florence, Italy',
        description: 'A masterwork depicting the goddess Venus emerging from the sea as a fully grown woman, symbolizing beauty born from nature and divine inspiration.',
    },
    {
        id: '2',
        title: 'Mona Lisa',
        date: 'Permanent - Ongoing',
        price: '$222',
        image: ART_IMAGES.art2,
        artist: 'Leonardo da Vinci',
        museum: 'Louvre Museum',
        location: 'Paris, France',
        description: 'The most recognized portrait in history, an enigmatic smile that has captivated millions and stands as a testament to mastery of sfumato and human emotion.',
    },
    {
        id: '3',
        title: 'Starry Night',
        date: 'Exhibition - Nov 2026',
        price: '$335',
        image: ART_IMAGES.art3,
        artist: 'Vincent van Gogh',
        museum: 'MoMA',
        location: 'New York, USA',
        description: 'A swirling night sky alive with cosmic energy, the most celebrated vision where imagination and observation merge into pure feeling.',
    },
    {
        id: '4',
        title: 'Girl with a Pearl Earring',
        date: 'Collection - 2026',
        price: '$480',
        image: ART_IMAGES.art4,
        artist: 'Johannes Vermeer',
        museum: 'Mauritshuis',
        location: 'The Hague, Netherlands',
        description: 'Known as the Mona Lisa of the North, a luminous portrait where light, mystery, and quiet intimacy converge in a signature golden palette.',
    },
];

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
};

const fadeSlideUp = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.25, 0.8, 0.25, 1] },
    },
};

const cardPop = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.5, ease: [0.25, 0.8, 0.25, 1] },
    },
};

// ============================================================
// PARALLAX HERO IMAGE
// ============================================================

function ParallaxImage({
    src,
    alt,
    className,
    delay = 0,
}: {
    src: string;
    alt: string;
    className: string;
    delay?: number;
}) {
    const y = useMotionValue(0);

    useEffect(() => {
        const handleScroll = () => y.set(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [y]);

    const translateY = useTransform(y, [0, 400], [0, -20]);

    return (
        <motion.img
            src={src}
            alt={alt}
            className={className}
            style={{ y: translateY }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay, ease: 'easeOut' }}
        />
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MyArtsPage() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState<0 | 1>(0);
    const [selectedArt, setSelectedArt] = useState<(typeof MOCK_ARTWORKS)[0] | null>(null);

    const handleStart = useCallback(() => {
        setCurrentSlide(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleBack = useCallback(() => {
        setCurrentSlide(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleMore = useCallback((art: (typeof MOCK_ARTWORKS)[0]) => {
        setSelectedArt(art);
    }, []);

    const handleBuy = useCallback(() => {
        navigate('/dashboard/marketplace');
    }, [navigate]);

    const handleCloseDetail = useCallback(() => {
        setSelectedArt(null);
    }, []);

    // Prevent body scroll when detail overlay is open
    useEffect(() => {
        if (selectedArt) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedArt]);

    return (
        <div className="my-art-exhibition">
            <AnimatePresence mode="wait">
                {/* ======== SLIDE 1: HERO ======== */}
                {currentSlide === 0 && (
                    <motion.section
                        key="hero-slide"
                        className="ex-hero"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.45 }}
                    >
                        {/* Hero Image Collage */}
                        <div className="ex-collage">
                            <ParallaxImage
                                src={ART_IMAGES.hero1}
                                alt="Mona Lisa by Leonardo da Vinci"
                                className="ex-collage-img ex-collage-img-1"
                                delay={0.15}
                            />
                            <ParallaxImage
                                src={ART_IMAGES.hero2}
                                alt="Starry Night by Van Gogh"
                                className="ex-collage-img ex-collage-img-2"
                                delay={0.3}
                            />
                            <ParallaxImage
                                src={ART_IMAGES.hero3}
                                alt="The Starry Night detail"
                                className="ex-collage-img ex-collage-img-3"
                                delay={0.45}
                            />
                            {/* Decorative floating accent */}
                            <motion.div
                                className="ex-collage-accent"
                                animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        </div>

                        {/* Hero Copy */}
                        <motion.div
                            className="ex-hero-text"
                            variants={staggerChildren}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.p className="ex-hero-eyebrow" variants={fadeSlideUp}>
                                <Sparkles size={14} />
                                SeniQu Art Experience
                            </motion.p>

                            <motion.h1 variants={fadeSlideUp}>
                                Discover &amp; Collect
                                <br />
                                <em>Timeless Masterpieces</em>
                                <br />
                                <span className="ex-hero-sub">
                                    from the Greatest Museums Worldwide
                                </span>
                            </motion.h1>

                            <motion.p className="ex-hero-desc" variants={fadeSlideUp}>
                                Explore curated exhibitions, own digital art tokens, and build
                                your personal gallery — all in one place.
                            </motion.p>
                        </motion.div>

                        {/* CTA Area */}
                        <motion.div
                            className="ex-hero-bottom"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <motion.div
                                className="ex-arrow-container"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 0.85, scale: 1 }}
                                transition={{ delay: 1, duration: 0.5 }}
                            >
                                <span className="ex-arrow-label">Explore</span>
                                <motion.div
                                    className="ex-arrow-icon-wrap"
                                    animate={{ x: [0, 8, 0] }}
                                    transition={{
                                        duration: 1.6,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                >
                                    <ArrowRight size={24} strokeWidth={2.5} />
                                </motion.div>
                            </motion.div>

                            <motion.button
                                className="ex-btn-circle"
                                onClick={handleStart}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                Start
                            </motion.button>
                        </motion.div>
                    </motion.section>
                )}

                {/* ======== SLIDE 2: COLLECTION GRID ======== */}
                {currentSlide === 1 && (
                    <motion.section
                        key="grid-slide"
                        className="ex-grid-view"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.45 }}
                    >
                        {/* Back */}
                        <motion.button
                            className="ex-back-btn"
                            onClick={handleBack}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ x: -3 }}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </motion.button>

                        {/* Section Header */}
                        <motion.div
                            className="ex-section-header"
                            variants={staggerChildren}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.p className="ex-section-eyebrow" variants={fadeSlideUp}>
                                <Sparkles size={13} />
                                Your Collection
                            </motion.p>
                            <motion.h2 variants={fadeSlideUp}>
                                Curated <em>Exhibitions</em>
                            </motion.h2>
                            <motion.p className="ex-section-sub" variants={fadeSlideUp}>
                                Hand-picked masterpieces from world-class institutions,
                                waiting to be part of your story.
                            </motion.p>
                        </motion.div>

                        {/* Masonry Grid */}
                        <motion.div
                            className="ex-masonry"
                            variants={staggerChildren}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* Left Column */}
                            <div className="ex-masonry-col">
                                {[MOCK_ARTWORKS[0], MOCK_ARTWORKS[2]].map((art) => (
                                    <motion.div
                                        key={art.id}
                                        className="ex-art-card"
                                        variants={cardPop}
                                        onClick={() => handleMore(art)}
                                        whileHover={{ y: -3 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="ex-art-img-wrap">
                                            <img
                                                src={art.image}
                                                alt={art.title}
                                                className="ex-art-img"
                                                loading="lazy"
                                            />
                                            <div className="ex-art-overlay">
                                                <span>View Details</span>
                                            </div>
                                        </div>
                                        <div className="ex-art-info">
                                            <div>
                                                <h3 className="ex-art-title">{art.title}</h3>
                                                <span className="ex-art-date">
                                                    <Calendar size={11} />
                                                    {art.date}
                                                </span>
                                            </div>
                                            <span className="ex-art-price">{art.price}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Right Column (staggered) */}
                            <div className="ex-masonry-col">
                                {[MOCK_ARTWORKS[1]].map((art) => (
                                    <motion.div
                                        key={art.id}
                                        className="ex-art-card"
                                        variants={cardPop}
                                        onClick={() => handleMore(art)}
                                        whileHover={{ y: -3 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="ex-art-img-wrap">
                                            <img
                                                src={art.image}
                                                alt={art.title}
                                                className="ex-art-img"
                                                loading="lazy"
                                            />
                                            <div className="ex-art-overlay">
                                                <span>View Details</span>
                                            </div>
                                        </div>
                                        <div className="ex-art-info">
                                            <div>
                                                <h3 className="ex-art-title">{art.title}</h3>
                                                <span className="ex-art-date">
                                                    <Calendar size={11} />
                                                    {art.date}
                                                </span>
                                            </div>
                                            <span className="ex-art-price">{art.price}</span>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* More Button */}
                                <motion.div className="ex-grid-bottom" variants={cardPop}>
                                    <motion.button
                                        className="ex-btn-circle"
                                        onClick={() => handleMore(MOCK_ARTWORKS[3])}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        More
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* ======== SLIDE 3: DETAIL CARD OVERLAY ======== */}
            <AnimatePresence>
                {selectedArt && (
                    <motion.div
                        className="ex-detail-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleCloseDetail}
                    >
                        <motion.div
                            className="ex-detail-card"
                            initial={{ opacity: 0, y: 60, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.96 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Card Header */}
                            <div className="ex-detail-card-header">
                                <motion.span
                                    className="ex-collection-label"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    Collection
                                </motion.span>
                                <motion.button
                                    className="ex-close-btn"
                                    onClick={handleCloseDetail}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>

                            {/* Artwork Image */}
                            <div className="ex-detail-img-frame">
                                <motion.img
                                    src={selectedArt.image}
                                    alt={selectedArt.title}
                                    className="ex-detail-img"
                                    initial={{ scale: 1.08 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                                {/* Gradient at bottom of image */}
                                <div className="ex-detail-img-gradient" />
                            </div>

                            {/* Content Below Image */}
                            <div className="ex-detail-body">
                                <motion.h1
                                    className="ex-detail-title"
                                    initial={{ y: 16, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {selectedArt.title}
                                </motion.h1>

                                <motion.p
                                    className="ex-detail-artist"
                                    initial={{ y: 12, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.28 }}
                                >
                                    by {selectedArt.artist}
                                </motion.p>

                                <motion.p
                                    className="ex-detail-desc"
                                    initial={{ y: 12, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    {selectedArt.description}
                                </motion.p>

                                <motion.div
                                    className="ex-detail-meta"
                                    initial={{ y: 12, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.42 }}
                                >
                                    <div className="ex-museum-info">
                                        <p>
                                            <MapPin size={13} />
                                            {selectedArt.museum}
                                        </p>
                                        <span>
                                            <Calendar size={11} />
                                            {selectedArt.date}
                                        </span>
                                    </div>
                                    <span className="ex-detail-price">{selectedArt.price}</span>
                                </motion.div>
                            </div>

                            {/* Buy Footer */}
                            <motion.div
                                className="ex-detail-footer"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <motion.button
                                    className="ex-btn-buy"
                                    onClick={handleBuy}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                >
                                    Buy on Marketplace
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
