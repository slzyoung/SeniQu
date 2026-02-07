/**
 * Mobile Utilities
 * Helpers for mobile-optimized experiences
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect if device is mobile
 */
export function useIsMobile(breakpoint: number = 768): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    return isMobile;
}

/**
 * Hook to detect touch device
 */
export function useIsTouchDevice(): boolean {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    return isTouch;
}

/**
 * Hook for safe area insets (iOS notch support)
 */
export function useSafeAreaInsets() {
    const [insets, setInsets] = useState({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });

    useEffect(() => {
        const computeInsets = () => {
            const style = getComputedStyle(document.documentElement);
            setInsets({
                top: parseInt(style.getPropertyValue('--sat') || '0') || 0,
                right: parseInt(style.getPropertyValue('--sar') || '0') || 0,
                bottom: parseInt(style.getPropertyValue('--sab') || '0') || 0,
                left: parseInt(style.getPropertyValue('--sal') || '0') || 0,
            });
        };

        computeInsets();
        window.addEventListener('resize', computeInsets);
        return () => window.removeEventListener('resize', computeInsets);
    }, []);

    return insets;
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Hook for debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
    ref: React.RefObject<Element>,
    options?: IntersectionObserverInit
): boolean {
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, options);

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [ref, options]);

    return isIntersecting;
}

/**
 * Haptic feedback (for supported devices)
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!('vibrate' in navigator)) return;

    const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
    };

    navigator.vibrate(patterns[type]);
}

/**
 * Prevent zoom on double tap (iOS)
 */
export function preventDoubleTapZoom(element: HTMLElement): () => void {
    let lastTouchEnd = 0;

    const handler = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    };

    element.addEventListener('touchend', handler, { passive: false });

    return () => {
        element.removeEventListener('touchend', handler);
    };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
