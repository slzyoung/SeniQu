/**
 * CDN Image Helper - Enterprise Grade
 * Provides CDN-optimized URLs with format negotiation,
 * responsive sizing, lazy loading support, and anti-chunking.
 *
 * Supports: Cloudflare, Imgix, Cloudinary URL patterns.
 * Falls back gracefully when no CDN is configured.
 */

const CDN_BASE = import.meta.env.VITE_CDN_URL || '';
const STORAGE_BASE = import.meta.env.VITE_STORAGE_URL || '';

// ============================================
// CDN URL BUILDER
// ============================================

interface CdnOptions {
    /** Width in pixels */
    w?: number;
    /** Height in pixels */
    h?: number;
    /** Quality 1-100 (default: 80) */
    q?: number;
    /** Format: webp, avif, jpeg, png */
    f?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
    /** Fit mode */
    fit?: 'cover' | 'contain' | 'fill' | 'inside';
    /** DPR for retina */
    dpr?: number;
    /** Blur radius for placeholder */
    blur?: number;
}

/**
 * Generate a CDN-optimized image URL.
 * Appends width, height, quality, and format parameters.
 */
export function cdnUrl(path: string, options?: CdnOptions): string {
    if (!path) return '';

    // Already a CDN URL with params — return as-is
    if (path.includes('?') && (path.includes('w=') || path.includes('width='))) {
        return path;
    }

    // Data URIs — no CDN needed
    if (path.startsWith('data:')) return path;

    // Full URL — append CDN transform params
    if (path.startsWith('http')) {
        if (!options) return path;
        return appendTransformParams(path, options);
    }

    // Relative path — prepend CDN or storage base
    const base = CDN_BASE || STORAGE_BASE;
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

    if (!options) return url;
    return appendTransformParams(url, options);
}

function appendTransformParams(url: string, options: CdnOptions): string {
    const params = new URLSearchParams();

    if (options.w) params.set('w', String(options.w));
    if (options.h) params.set('h', String(options.h));
    if (options.q) params.set('q', String(options.q));
    if (options.f) params.set('f', options.f);
    if (options.fit) params.set('fit', options.fit);
    if (options.dpr) params.set('dpr', String(options.dpr));
    if (options.blur) params.set('blur', String(options.blur));

    const qs = params.toString();
    if (!qs) return url;

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${qs}`;
}

// ============================================
// PRESET HELPERS
// ============================================

/** Artwork thumbnail — 300×300 WebP, 80% quality */
export function artworkThumbnail(url: string): string {
    return cdnUrl(url, { w: 300, h: 300, q: 80, f: 'webp', fit: 'cover' });
}

/** Artwork card preview — 600×450 WebP */
export function artworkPreview(url: string): string {
    return cdnUrl(url, { w: 600, h: 450, q: 85, f: 'webp', fit: 'cover' });
}

/** Artwork detail — full-width WebP */
export function artworkFull(url: string): string {
    return cdnUrl(url, { w: 1920, q: 90, f: 'webp' });
}

/** Low-quality image placeholder for progressive loading */
export function artworkPlaceholder(url: string): string {
    return cdnUrl(url, { w: 40, q: 20, f: 'webp', blur: 10 });
}

/** Avatar image — sized by preset */
export function avatarCdn(url: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
    const sizes = { sm: 64, md: 128, lg: 256 };
    const s = sizes[size];
    return cdnUrl(url, { w: s, h: s, q: 85, f: 'webp', fit: 'cover' });
}

/** Institution/gallery banner */
export function bannerCdn(url: string): string {
    return cdnUrl(url, { w: 1200, h: 400, q: 85, f: 'webp', fit: 'cover' });
}

// ============================================
// RESPONSIVE SRCSET GENERATOR
// ============================================

/**
 * Generate srcSet for responsive images.
 * Anti-chunking: produces optimized widths to avoid redundant downloads.
 */
export function generateSrcSet(
    url: string,
    widths: number[] = [320, 640, 960, 1280, 1920],
    quality = 80
): string {
    return widths
        .map(w => `${cdnUrl(url, { w, q: quality, f: 'webp' })} ${w}w`)
        .join(', ');
}

/**
 * Generate sizes attribute for responsive images.
 */
export function generateSizes(breakpoints?: Record<string, string>): string {
    const defaults: Record<string, string> = {
        '(max-width: 640px)': '100vw',
        '(max-width: 1024px)': '50vw',
        '(max-width: 1280px)': '33vw',
    };

    const bp = breakpoints || defaults;
    return Object.entries(bp)
        .map(([mq, size]) => `${mq} ${size}`)
        .concat(['25vw'])
        .join(', ');
}

// ============================================
// IMAGE LAZY LOADING PROPS
// ============================================

/**
 * Returns props for an <img> element with CDN optimization + lazy loading.
 * Anti-chunking: Uses low-res placeholder first, then loads full image.
 */
export function cdnImageProps(
    url: string,
    alt: string,
    preset: 'thumbnail' | 'preview' | 'full' | 'avatar' = 'preview'
) {
    const presets: Record<string, CdnOptions> = {
        thumbnail: { w: 300, h: 300, q: 80, f: 'webp', fit: 'cover' },
        preview: { w: 600, h: 450, q: 85, f: 'webp', fit: 'cover' },
        full: { w: 1920, q: 90, f: 'webp' },
        avatar: { w: 128, h: 128, q: 85, f: 'webp', fit: 'cover' },
    };

    return {
        src: cdnUrl(url, presets[preset]),
        alt,
        loading: 'lazy' as const,
        decoding: 'async' as const,
        // Progressive: start with low-quality placeholder
        style: {
            backgroundImage: `url(${artworkPlaceholder(url)})`,
            backgroundSize: 'cover',
        },
    };
}

export default cdnUrl;
