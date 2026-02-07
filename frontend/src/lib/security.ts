/**
 * Security Utilities - OWASP Compliant
 * XSS Protection, Input Sanitization, CSRF Handling
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

// ============================================
// XSS PROTECTION
// ============================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
}

/**
 * Sanitize user input - strips all HTML
 */
export function sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Escape special characters for safe display
 */
export function escapeHTML(str: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
}

// ============================================
// CSRF PROTECTION
// ============================================

const CSRF_TOKEN_KEY = 'seniqu_csrf_token';

/**
 * Generate a CSRF token
 */
/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    return token;
}

/**
 * Generate a PKCE Code Verifier
 * High-entropy random string (43-128 chars)
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    // Base64URL encode without padding
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generate a PKCE Code Challenge from Verifier
 * SHA-256 hash, Base64URL encoded
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


/**
 * Get the current CSRF token
 */
export function getCSRFToken(): string | null {
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
    const storedToken = getCSRFToken();
    return storedToken !== null && storedToken === token;
}

// ============================================
// INPUT VALIDATION WITH ZOD
// ============================================

export const emailSchema = z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long');

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character');

export const usernameSchema = z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const displayNameSchema = z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name too long');

export const searchQuerySchema = z
    .string()
    .max(200, 'Search query too long')
    .transform((val) => sanitizeInput(val));

export const bioSchema = z
    .string()
    .max(500, 'Bio too long')
    .transform((val) => sanitizeHTML(val));

// ============================================
// SECURE STORAGE
// ============================================

const STORAGE_PREFIX = 'seniqu_';

/**
 * Simple obfuscation for localStorage (not true encryption)
 * For sensitive data, use HttpOnly cookies instead
 */
export function secureStore(key: string, value: string): void {
    try {
        const encoded = btoa(encodeURIComponent(value));
        localStorage.setItem(STORAGE_PREFIX + key, encoded);
    } catch {
        console.error('Failed to store data securely');
    }
}

export function secureRetrieve(key: string): string | null {
    try {
        const encoded = localStorage.getItem(STORAGE_PREFIX + key);
        if (!encoded) return null;
        return decodeURIComponent(atob(encoded));
    } catch {
        console.error('Failed to retrieve secure data');
        return null;
    }
}

export function secureRemove(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
}

export function clearAllSecureStorage(): void {
    Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and sanitize URLs to prevent open redirect attacks
 */
export function sanitizeURL(url: string, allowedDomains?: string[]): string | null {
    try {
        const parsed = new URL(url);

        // Allow relative URLs
        if (url.startsWith('/')) {
            return url;
        }

        // Check protocol
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        // Check allowed domains if specified
        if (allowedDomains && !allowedDomains.includes(parsed.hostname)) {
            return null;
        }

        return parsed.href;
    } catch {
        // If it's a relative path, allow it
        if (url.startsWith('/') && !url.startsWith('//')) {
            return url;
        }
        return null;
    }
}

/**
 * Validate redirect URLs (prevent open redirect)
 */
export function isValidRedirectURL(url: string): boolean {
    // Only allow relative paths or same-origin URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
        return true;
    }

    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.origin === window.location.origin;
    } catch {
        return false;
    }
}

// ============================================
// RATE LIMITING (Client-side)
// ============================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Client-side rate limiting
 */
export function checkRateLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true };
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, retryAfter: entry.resetTime - now };
    }

    entry.count++;
    return { allowed: true };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
    rateLimitMap.delete(key);
}

// ============================================
// SECURITY HEADERS CHECK
// ============================================

/**
 * Log security header warnings (for development)
 */
export function checkSecurityHeaders(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const requiredHeaders = [
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Strict-Transport-Security',
    ];

    fetch(window.location.href, { method: 'HEAD' })
        .then((response) => {
            const missingHeaders = requiredHeaders.filter(
                (header) => !response.headers.get(header)
            );

            if (missingHeaders.length > 0) {
                console.warn('Missing security headers:', missingHeaders);
            }
        })
        .catch(() => {
            // Ignore fetch errors
        });
}

// ============================================
// FINGERPRINT DETECTION (Anti-bot)
// ============================================

/**
 * Generate a simple browser fingerprint for anti-bot measures
 */
export function generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Seniqu fingerprint', 2, 2);

    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }

    return hash.toString(36);
}
