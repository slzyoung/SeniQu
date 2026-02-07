/**
 * PullToRefresh Component
 * Touch-friendly pull-to-refresh functionality
 */

import { useRef, useState, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    /** Distance in pixels to trigger refresh */
    threshold?: number;
    /** Disable pull to refresh */
    disabled?: boolean;
}

export function PullToRefresh({
    onRefresh,
    children,
    threshold = 80,
    disabled = false,
}: PullToRefreshProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;

        const container = containerRef.current;
        if (!container) return;

        // Only start pull if at top of scroll
        if (container.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply resistance to the pull
            const distance = Math.min(diff * 0.5, threshold * 1.5);
            setPullDistance(distance);
        }
    }, [isPulling, isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;

        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(threshold * 0.75);

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);
    const shouldTrigger = pullDistance >= threshold;

    return (
        <div
            ref={containerRef}
            className="relative overflow-auto h-full touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Refresh indicator */}
            <motion.div
                initial={false}
                animate={{
                    height: pullDistance,
                    opacity: progress > 0.2 ? 1 : progress * 5,
                }}
                className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden bg-theme-surface z-10"
            >
                <div className="flex flex-col items-center gap-1">
                    {isRefreshing ? (
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    ) : (
                        <motion.div
                            animate={{
                                rotate: shouldTrigger ? 180 : 0,
                                scale: shouldTrigger ? 1.1 : 1,
                            }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <ArrowDown
                                className={`w-5 h-5 transition-colors ${shouldTrigger ? 'text-gold' : 'text-theme-muted'
                                    }`}
                            />
                        </motion.div>
                    )}
                    <span className="text-xs text-theme-muted">
                        {isRefreshing
                            ? 'Refreshing...'
                            : shouldTrigger
                                ? 'Release to refresh'
                                : 'Pull to refresh'
                        }
                    </span>
                </div>
            </motion.div>

            {/* Content */}
            <motion.div
                animate={{ y: pullDistance }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {children}
            </motion.div>
        </div>
    );
}

export default PullToRefresh;
