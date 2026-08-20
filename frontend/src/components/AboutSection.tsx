import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface Feature {
    id: string;
    image: string;
    title: string;
    description: string;
    detail: string;
}

const CDN = 'https://cdn.seniqu.art/assets/landing/features';

const features: Feature[] = [
    {
        id: 'centralized',
        image: `${CDN}/centralized_platform.jpg`,
        title: 'Centralized Platform',
        description: 'Unified ecosystem for heritage sites.',
        detail: 'One platform connecting 4,800+ cultural sites, museums, and heritage locations across Indonesia. Manage, explore, and preserve — all in one place.',
    },
    {
        id: 'immersive',
        image: `${CDN}/immersive_experience.jpeg`,
        title: 'Immersive Experience',
        description: 'Smart navigation & interactive tools.',
        detail: 'AR-powered exhibitions, 360° virtual tours, and interactive storytelling that brings centuries of heritage to life on your device.',
    },
    {
        id: 'ai',
        image: `${CDN}/ai_enhanced.png`,
        title: 'AI-Enhanced',
        description: 'Automated insights & multilingual guides.',
        detail: 'Gemini-powered art analysis, genre identification, multilingual audio guides, and intelligent curation — heritage meets cutting-edge AI.',
    },
    {
        id: 'tourism',
        image: `${CDN}/tourism_optimized.jpeg`,
        title: 'Tourism Optimized',
        description: 'Personalized routes & recommendations.',
        detail: 'Smart itineraries, nearby discovery with Google Maps integration, and community-driven recommendations for cultural tourism.',
    },
];

/* ═══════════════════════════════════════════════════════
   Expanded Card Overlay (fullscreen modal)
   ═══════════════════════════════════════════════════════ */
function ExpandedCard({
    feature,
    onClose,
}: {
    feature: Feature;
    onClose: () => void;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <motion.div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* Expanded Content Box */}
            <motion.div
                layoutId={`card-${feature.id}`}
                className="relative w-full md:w-[540px] md:max-h-[85vh] max-h-[90vh] rounded-t-3xl md:rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl z-10 flex flex-col"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {/* Hero Image */}
                <div className="relative aspect-[4/3] md:aspect-[16/10] overflow-hidden flex-shrink-0">
                    <motion.img
                        layoutId={`img-${feature.id}`}
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all duration-200 z-20"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Title Overlay */}
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                        <motion.h3
                            layoutId={`title-${feature.id}`}
                            className="font-serif text-2xl md:text-3xl font-bold text-white drop-shadow-md"
                        >
                            {feature.title}
                        </motion.h3>
                    </div>
                </div>

                {/* Details text area */}
                <div className="p-6 md:p-8 overflow-y-auto max-h-[40vh] md:max-h-[50vh]">
                    <p className="text-white/60 text-sm md:text-base leading-relaxed mb-4">
                        {feature.detail}
                    </p>
                    <div className="h-[2px] w-12 bg-gold/50 rounded-full" />
                </div>

                {/* Safe area padding */}
                <div className="h-[env(safe-area-inset-bottom,0px)] bg-black" />
            </motion.div>
        </motion.div>,
        document.body
    );
}

/* ═══════════════════════════════════════════════════════
   Main AboutSection Component
   ═══════════════════════════════════════════════════════ */
export function AboutSection() {
    const { ref, isVisible } = useScrollAnimation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<Feature | null>(null);
    const { t } = useLanguage();

    const localizedFeatures = features.map((feat, idx) => ({
        ...feat,
        title: t(`about.featureTitle${idx}`),
        description: t(`about.featureDesc${idx}`),
        detail: t(`about.featureDetail${idx}`),
    }));

    const handleClose = () => setSelected(null);
    const [isAutoplay, setIsAutoplay] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const dragX = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % localizedFeatures.length);
        dragX.set(0);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + localizedFeatures.length) % localizedFeatures.length);
        dragX.set(0);
    };

    // Auto-slide effect
    useEffect(() => {
        if (!isAutoplay || selected) return;
        const interval = setInterval(nextSlide, 3000);
        return () => clearInterval(interval);
    }, [isAutoplay, selected, currentIndex, localizedFeatures.length]);

    // Handle swipe end gesture
    const handleDragEnd = () => {
        const x = dragX.get();
        if (x < -50) {
            nextSlide();
        } else if (x > 50) {
            prevSlide();
        }
    };

    return (
        <section id="about" className="py-20 md:py-32 bg-theme-bg relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12 md:mb-16 max-w-3xl mx-auto"
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="h-px w-8 bg-gold/50" />
                        <span className="text-gold text-xs uppercase tracking-[0.2em] font-medium">{t('about.label')}</span>
                        <span className="h-px w-8 bg-gold/50" />
                    </div>

                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-theme-text mb-4 leading-tight">
                        {t('about.title').split(' ').map((word, i) => {
                            if (word.toLowerCase() === 'culture' || word.toLowerCase() === 'budaya' || word.toLowerCase() === 'technology' || word.toLowerCase() === 'teknologi') {
                                return <span key={i} className="text-gold italic">{word} </span>;
                            }
                            return word + ' ';
                        })}
                    </h2>

                    <p className="text-theme-muted text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                        {t('about.subtitle')}
                    </p>
                </motion.div>

                {/* Carousel Container */}
                <div
                    className="relative w-full max-w-4xl mx-auto px-0 md:px-4 select-none"
                    onMouseEnter={() => setIsAutoplay(false)}
                    onMouseLeave={() => setIsAutoplay(true)}
                    onTouchStart={() => setIsAutoplay(false)}
                    onTouchEnd={() => setIsAutoplay(true)}
                >
                    {/* Navigation Buttons (Desktop only) */}
                    <div className="hidden md:block">
                        <button
                            onClick={prevSlide}
                            className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 hover:scale-105 transition-all duration-200 z-20"
                            aria-label="Previous slide"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 hover:scale-105 transition-all duration-200 z-20"
                            aria-label="Next slide"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sliding Viewport */}
                    <div
                        ref={containerRef}
                        className="overflow-hidden relative py-6 touch-pan-y"
                    >
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            style={{ x: dragX }}
                            onDragEnd={handleDragEnd}
                            className="flex justify-center items-center gap-4 md:gap-8"
                        >
                            {localizedFeatures.map((feature, index) => {
                                // Calculate index offsets for premium 3D carousel centering
                                const diff = (index - currentIndex + localizedFeatures.length) % localizedFeatures.length;

                                // Active card
                                const isActive = diff === 0;
                                // Left card (previous)
                                const isLeft = diff === localizedFeatures.length - 1;
                                // Right card (next)
                                const isRight = diff === 1;

                                // Hide other cards
                                const isVisible = isActive || isLeft || isRight;

                                if (!isVisible) return null;

                                return (
                                    <motion.div
                                        key={feature.id}
                                        onClick={() => isActive ? setSelected(feature) : setCurrentIndex(index)}
                                        className={`relative w-[260px] md:w-[360px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-pointer transition-all duration-500 border ${isActive
                                                ? 'border-gold/50 scale-100 z-10 opacity-100'
                                                : 'border-white/5 scale-90 opacity-40 blur-[1px]'
                                            }`}
                                        animate={{
                                            scale: isActive ? 1.02 : 0.9,
                                            opacity: isActive ? 1 : 0.4,
                                            x: isMobile
                                                ? (isLeft ? 30 : isRight ? -30 : 0)
                                                : (isLeft ? -20 : isRight ? 20 : 0),
                                        }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                                        style={{
                                            order: isLeft ? 1 : isActive ? 2 : 3,
                                            flexShrink: 0,
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                    >
                                        {/* Background Image */}
                                        <motion.img
                                            layoutId={`img-${feature.id}`}
                                            src={feature.image}
                                            alt={feature.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                                        {/* Content Box */}
                                        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-white">
                                            <motion.h4
                                                layoutId={`title-${feature.id}`}
                                                className="font-serif font-bold text-white text-lg md:text-xl mb-1.5 md:mb-2 leading-tight"
                                            >
                                                {feature.title}
                                            </motion.h4>
                                            <p className="text-[11px] md:text-xs text-white/70 leading-relaxed font-light line-clamp-2">
                                                {feature.description}
                                            </p>
                                        </div>

                                        {/* Active spotlight line */}
                                        {isActive && (
                                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />
                                        )}

                                        {/* Spinning gold circle ornament */}
                                        <div className={`absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center transition-all duration-500 text-gold ${isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
                                            }`}>
                                            <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="44"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeDasharray="6,6"
                                                    className="opacity-70"
                                                />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="30"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    className="opacity-80"
                                                />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="6"
                                                    fill="currentColor"
                                                    className="opacity-90"
                                                />
                                            </svg>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>

                    {/* Progress dots & line */}
                    <div className="flex flex-col items-center gap-3 mt-6">
                        {/* Dot indicator */}
                        <div className="flex gap-2">
                            {localizedFeatures.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-6 bg-gold' : 'w-2 bg-white/20'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded details overlay */}
            <AnimatePresence>
                {selected && (
                    <ExpandedCard
                        feature={localizedFeatures.find(f => f.id === selected.id) || selected}
                        onClose={handleClose}
                    />
                )}
            </AnimatePresence>
        </section>
    );
}

export default AboutSection;
