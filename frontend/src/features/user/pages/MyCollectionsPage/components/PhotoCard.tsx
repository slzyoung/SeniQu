/**
 * PhotoCard — Premium Instagram-style card with overlay interactions
 * Masonry-friendly with gradient overlay, floating like, price badge
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';

export interface PhotoData {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl: string;
    originalUrl: string;
    userId: string;
    user?: { id: string; displayName: string; avatarUrl?: string; avatar?: string };
    category?: string;
    theme?: string;
    tags?: string[];
    likesCount: number;
    commentsCount: number;
    downloadsCount?: number;
    width?: number;
    height?: number;
    isForSale?: boolean;
    price?: number;
    currency?: string;
    locationName?: string;
    cameraMake?: string;
    cameraModel?: string;
    isLikedByMe?: boolean;
    createdAt: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
}

interface Props {
    photo: PhotoData;
    onSelect: (photo: PhotoData) => void;
    onLike?: (photoId: string) => void;
    onViewProfile?: (userId: string) => void;
    index: number;
}

export function PhotoCard({ photo, onSelect, onLike, onViewProfile, index }: Props) {
    const [liked, setLiked] = useState(photo.isLikedByMe || false);
    const [likeCount, setLikeCount] = useState(photo.likesCount);
    const [showBurst, setShowBurst] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        setLiked(photo.isLikedByMe || false);
        setLikeCount(photo.likesCount);
    }, [photo.isLikedByMe, photo.likesCount]);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
        if (newLiked) {
            setShowBurst(true);
            setTimeout(() => setShowBurst(false), 600);
        }
        onLike?.(photo.id);
    };

    // Random-ish aspect ratio for masonry variety
    const aspectIndex = index % 5;
    const aspectRatio = aspectIndex === 0 ? '3/4' : aspectIndex === 1 ? '1/1' : aspectIndex === 2 ? '4/5' : aspectIndex === 3 ? '3/5' : '4/3';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
            className="ph-grid-item"
        >
            <div className="ph-card" onClick={() => onSelect(photo)}>
                {/* Image */}
                <div className="relative overflow-hidden" style={{ aspectRatio }}>
                    {!imgLoaded && <div className="absolute inset-0 ph-shimmer" />}
                    <img
                        src={photo.thumbnailUrl || photo.originalUrl}
                        alt={photo.title}
                        loading="lazy"
                        onLoad={() => setImgLoaded(true)}
                        className={`ph-card-img h-full transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* Price Badge */}
                    {photo.isForSale && photo.price && (
                        <div className="ph-price-badge">
                            {photo.price} SOL
                        </div>
                    )}


                    {/* Like Button */}
                    <button onClick={handleLike} className="ph-like-btn">
                        <Heart className={`w-4 h-4 transition-all ${liked ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
                    </button>

                    {/* Heart Burst Animation */}
                    <AnimatePresence>
                        {showBurst && (
                            <motion.div
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 2, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                            >
                                <Heart className="w-12 h-12 text-red-500 fill-red-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Overlay with info */}
                    <div className="ph-card-overlay">
                        <p className="text-white text-[11px] font-semibold truncate">{photo.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-white/80 text-[10px]">
                                <Heart className={`w-3 h-3 ${liked ? 'fill-red-400 text-red-400' : ''}`} />
                                {likeCount}
                            </span>
                            {photo.commentsCount > 0 && (
                                <span className="flex items-center gap-1 text-white/80 text-[10px]">
                                    <MessageCircle className="w-3 h-3" />
                                    {photo.commentsCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Block */}
                <div className="ph-card-info">
                    <h4 className="text-[12px] font-semibold text-[var(--ph-text)] truncate leading-tight">
                        {photo.title}
                    </h4>
                    {photo.user && (
                        <p
                            onClick={(e) => { e.stopPropagation(); onViewProfile?.(photo.userId); }}
                            className="text-[10px] text-[var(--ph-text-muted)] mt-0.5 truncate cursor-pointer hover:text-[var(--ph-gold)] transition-colors"
                        >
                            @{photo.user.displayName}
                        </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] font-bold text-[var(--ph-text)]">
                            {photo.isForSale && photo.price ? (
                                photo.currency === 'IDR'
                                    ? `Rp ${(photo.price / 1000).toFixed(0)}k`
                                    : `$${photo.price}`
                            ) : (
                                <span className="text-[var(--ph-text-muted)] font-medium text-[10px]">Free</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--ph-text-muted)]">
                            <Heart className={`w-2.5 h-2.5 ${liked ? 'text-red-400 fill-red-400' : ''}`} />
                            {likeCount}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
