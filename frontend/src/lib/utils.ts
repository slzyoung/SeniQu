import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ROLES, ROUTES, UserRole } from './constants';

/**
 * Merge Tailwind classes securely
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Detect if device is mobile
 */
export function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if running in a wallet's in-app browser
 */
export function isWalletInAppBrowser(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for common injected providers
    const ethereum = (window as any).ethereum;
    const solana = (window as any).solana;
    const solflare = (window as any).solflare;

    const isMetaMask = !!(ethereum?.isMetaMask);
    const isPhantom = !!(solana?.isPhantom);
    const isSolflare = !!(solflare?.isSolflare);

    // If we have an injected provider AND we are on mobile, it's likely an in-app browser
    return isMobile() && (isMetaMask || isPhantom || isSolflare);
}

/**
 * Get dashboard route based on user role
 */
export function getDashboardRoute(role: string | UserRole): string {
    switch (role) {
        case ROLES.ADMIN:
        case ROLES.SUPER_ADMIN:
            return ROUTES.ADMIN_DASHBOARD;
        case ROLES.ARTIST:
        case ROLES.INSTITUTION:
            return ROUTES.ARTIST_DASHBOARD;
        case ROLES.USER:
        case ROLES.COLLECTOR:
        default:
            return ROUTES.USER_DASHBOARD;
    }
}

/**
 * Format currency
 */
export function formatCurrency(value: number, currency = 'ETH'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // ETH doesn't have a standard locale string in all browsers, usually just append symbol
    }).format(value).replace('$', '') + ' ' + currency;
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(date));
}

/**
 * Safely extract an array from API response data
 * Handles various response shapes: raw array, paginated object, or nested data
 */
export function extractArray<T>(data: unknown): T[] {
    if (!data) return [];

    // If it's already an array, return it
    if (Array.isArray(data)) return data as T[];

    // If it's an object, check common data properties
    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;

        // Check common paginated response shapes
        if (Array.isArray(obj.data)) return obj.data as T[];
        if (Array.isArray(obj.items)) return obj.items as T[];
        if (Array.isArray(obj.results)) return obj.results as T[];
        if (Array.isArray(obj.rows)) return obj.rows as T[];
        if (Array.isArray(obj.records)) return obj.records as T[];

        // Handle double-nested data from backend TransformInterceptor wrapper
        // Response shape: { success: true, data: { data: [...], meta: {...} } }
        if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
            const inner = obj.data as Record<string, unknown>;
            if (Array.isArray(inner.data)) return inner.data as T[];
            if (Array.isArray(inner.items)) return inner.items as T[];
            if (Array.isArray(inner.results)) return inner.results as T[];
        }
    }

    return [];
}

/**
 * Extract pagination metadata from API response
 */
export function extractPagination(data: unknown): { total: number; page: number; totalPages: number } {
    const defaultMeta = { total: 0, page: 1, totalPages: 1 };

    if (!data || typeof data !== 'object') return defaultMeta;

    const obj = data as Record<string, unknown>;

    // Handle double-nested data from backend TransformInterceptor wrapper
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
        const inner = obj.data as Record<string, unknown>;
        if (inner.meta && typeof inner.meta === 'object') {
            const innerMeta = inner.meta as Record<string, unknown>;
            return {
                total: (innerMeta.total as number) || (innerMeta.totalCount as number) || 0,
                page: (innerMeta.page as number) || (innerMeta.currentPage as number) || 1,
                totalPages: (innerMeta.totalPages as number) || (innerMeta.pages as number) || 1,
            };
        }
    }

    // Check for standard meta object
    if (obj.meta && typeof obj.meta === 'object') {
        const meta = obj.meta as Record<string, unknown>;
        // If the meta only has timestamp/method/path (interceptor meta), ignore it and check flat properties later
        if (meta.total !== undefined || meta.page !== undefined || meta.totalPages !== undefined) {
            return {
                total: (meta.total as number) || (meta.totalCount as number) || 0,
                page: (meta.page as number) || (meta.currentPage as number) || 1,
                totalPages: (meta.totalPages as number) || (meta.pages as number) || 1,
            };
        }
    }

    // Check for flat pagination properties
    return {
        total: (obj.total as number) || (obj.totalCount as number) || (obj.count as number) || 0,
        page: (obj.page as number) || (obj.currentPage as number) || 1,
        totalPages: (obj.totalPages as number) || (obj.pages as number) || 1,
    };
}
