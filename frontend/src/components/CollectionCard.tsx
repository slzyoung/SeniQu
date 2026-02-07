import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlowCard } from './GlowCard';

export interface CollectionData {
    id: string;
    category: string;
    title: string;
    origin: string;
    artist: string;
    year: string;
    technique: string;
    pieces: number;
    gradient: string;
    pattern: string;
    imageUrl?: string;
}

interface CollectionCardProps {
    data: CollectionData;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
}

export const CollectionCard = React.forwardRef<HTMLDivElement, CollectionCardProps>(({
    data,
    isFavorite,
    onToggleFavorite
}, ref) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const navigate = useNavigate();
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), {
        stiffness: 150,
        damping: 20
    });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), {
        stiffness: 150,
        damping: 20
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="relative h-[280px] sm:h-[320px] md:h-[380px]"
            style={{ perspective: 800 }}
        >
            <motion.div
                className="w-full h-full"
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d'
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <GlowCard className="h-full rounded-xl md:rounded-2xl overflow-hidden" hover={true}>
                    <div
                        className="relative h-full w-full group cursor-pointer"
                        onClick={() => navigate(`/gallery/artwork/${data.id}`)}
                    >
                        {/* Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${data.gradient} transition-transform duration-700 group-hover:scale-110`}>
                            {data.imageUrl ? (
                                <img
                                    src={data.imageUrl}
                                    alt={data.title}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:opacity-80 transition-opacity duration-500"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: data.pattern,
                                        backgroundSize: '20px 20px'
                                    }}
                                />
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                        </div>

                        {/* Top Bar */}
                        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10">
                            <span className="px-2.5 py-1 bg-black/30 backdrop-blur-md rounded-full text-[10px] md:text-xs font-medium text-cream border border-white/10">
                                {data.category}
                            </span>
                            <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(data.id);
                                }}
                                className={`w-9 h-9 md:w-8 md:h-8 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-colors ${isFavorite ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-black/30 text-cream'}`}
                            >
                                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                            </motion.button>
                        </div>

                        {/* Center Title */}
                        <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-center items-center text-center z-0 pointer-events-none">
                            <h3 className="text-lg md:text-2xl font-serif text-cream font-bold mb-1 group-hover:text-gold transition-colors drop-shadow-lg line-clamp-2">
                                {data.title}
                            </h3>
                            <p className="text-xs md:text-sm text-cream-muted flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500">
                                <span className="w-1 h-1 rounded-full bg-gold" />
                                {data.origin}
                            </p>
                        </div>

                        {/* Glass Info Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-theme-glass/95 backdrop-blur-xl border-t border-theme-glass-border p-3 md:p-4 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-500 ease-out z-20">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 text-[10px] md:text-xs text-theme-muted">
                                        <span className="truncate">{data.artist}</span>
                                        <span className="text-theme-border">•</span>
                                        <span className="whitespace-nowrap">{data.year}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-gold text-[10px] md:text-xs font-medium">
                                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                        <span>Verified</span>
                                    </div>
                                </div>
                                <button className="flex-shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center hover:bg-gold/20 transition-colors">
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </GlowCard>
            </motion.div>
        </motion.div>
    );
});

CollectionCard.displayName = 'CollectionCard';
