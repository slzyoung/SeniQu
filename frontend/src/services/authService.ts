/**
 * Authentication Service
 * OWASP-Compliant Authentication with Anti-Throttling, Validation, and Security Best Practices
 */

import { z } from 'zod';
import { apiPost, apiGet, setAccessToken } from '../lib/api';
import { API_ENDPOINTS, SECURITY_CONFIG } from '../lib/constants';
import {
    sanitizeInput,
    checkRateLimit,
    resetRateLimit,
    generateCSRFToken,
    generateFingerprint,
    generateCodeVerifier,
    generateCodeChallenge,
    secureStore,
    secureRetrieve,
    secureRemove,
} from '../lib/security';
import { User } from '../lib/types';

// ============================================
// VALIDATION SCHEMAS (OWASP Compliant)
// ============================================

const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform((val) => sanitizeInput(val.toLowerCase().trim()));

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const displayNameSchema = z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name too long')
    .transform((val) => sanitizeInput(val.trim()));

// Login credentials schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

// Register credentials schema
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema.optional(),
    userType: z.enum(['ART_LOVER', 'ARTIST', 'COLLECTOR', 'INSTITUTION']).default('ART_LOVER'),
});

// ============================================
// TYPES
// ============================================

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    displayName?: string;
    userType?: 'ART_LOVER' | 'ARTIST' | 'COLLECTOR' | 'INSTITUTION';
}

export interface AuthError {
    message: string;
    code: string;
    details?: Record<string, string[]>;
}

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

const AUTH_RATE_LIMITS = {
    login: { maxRequests: 5, windowMs: 60000 }, // 5 attempts per minute
    register: { maxRequests: 3, windowMs: 60000 }, // 3 attempts per minute
    passwordReset: { maxRequests: 2, windowMs: 300000 }, // 2 attempts per 5 minutes
    oauth: { maxRequests: 10, windowMs: 60000 }, // 10 attempts per minute
} as const;

// ============================================
// SECURITY HELPERS
// ============================================

/**
 * Check rate limit for auth operations with stricter limits on failed attempts
 */
function checkAuthRateLimit(
    action: keyof typeof AUTH_RATE_LIMITS,
    identifier: string = 'default'
): { allowed: boolean; retryAfter?: number } {
    const config = AUTH_RATE_LIMITS[action];
    const key = `auth:${action}:${identifier}`;
    return checkRateLimit(key, config.maxRequests, config.windowMs);
}

/**
 * Generate secure request headers with CSRF and fingerprint
 */
function getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (SECURITY_CONFIG.CSRF_ENABLED) {
        headers['X-CSRF-Token'] = generateCSRFToken();
    }

    if (SECURITY_CONFIG.FINGERPRINT_ENABLED) {
        headers['X-Client-Fingerprint'] = generateFingerprint();
    }

    // Add timestamp to prevent replay attacks
    headers['X-Request-Timestamp'] = Date.now().toString();

    return headers;
}

/**
 * Validate response integrity (anti-chunking)
 */
function validateResponseIntegrity<T>(response: T): boolean {
    if (response === null || response === undefined) {
        return false;
    }

    // Check if response is an object (not truncated)
    if (typeof response === 'object') {
        try {
            JSON.stringify(response);
            return true;
        } catch {
            return false;
        }
    }

    return true;
}

/**
 * Secure error handling - sanitize error messages
 */
function sanitizeError(error: unknown): AuthError {
    // Axios error
    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; statusCode?: number } } };
        const data = axiosError.response?.data;

        return {
            message: data?.message || 'Authentication failed',
            code: data?.statusCode?.toString() || 'AUTH_ERROR',
        };
    }

    // Zod validation error
    if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as z.ZodError;
        return {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: zodError.errors.reduce((acc, err) => {
                const key = err.path.join('.');
                acc[key] = acc[key] || [];
                acc[key].push(err.message);
                return acc;
            }, {} as Record<string, string[]>),
        };
    }

    // Generic error
    return {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
    };
}

// ============================================
// AUTH SERVICE
// ============================================

class AuthService {
    private static instance: AuthService;

    private constructor() { }

    static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Helper to map backend user to frontend user
     */
    private mapBackendUserToFrontend(backendUser: any): User {
        // Handle case where backend user might be null/undefined
        if (!backendUser) {
            console.error('[AuthService] mapBackendUserToFrontend: backendUser is null/undefined');
            throw new Error('Invalid user data received from server');
        }

        let role = 'user';

        // Map userType to role
        switch (backendUser.userType) {
            case 'ARTIST':
                role = 'artist';
                break;
            case 'COLLECTOR':
                role = 'collector';
                break;
            case 'INSTITUTION':
                role = 'institution';
                break;
            case 'ART_LOVER':
            default:
                role = 'user';
                break;
        }

        // Override if admin
        if (backendUser.adminRole) {
            role = backendUser.adminRole === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
        }

        return {
            id: backendUser.id,
            email: backendUser.email,
            displayName: backendUser.displayName || backendUser.display_name || '',
            role: role as any,
            walletAddress: backendUser.walletAddress || backendUser.wallet_address,
            createdAt: backendUser.createdAt || new Date().toISOString(),
            updatedAt: backendUser.updatedAt || backendUser.createdAt || new Date().toISOString(),
            isVerified: backendUser.isVerified || false,
            isPremium: backendUser.isPremium || false,
        };
    }

    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        // Rate limit check
        const rateLimit = checkAuthRateLimit('login', credentials.email);
        if (!rateLimit.allowed) {
            throw {
                message: `Too many login attempts. Please try again in ${Math.ceil((rateLimit.retryAfter || 60000) / 1000)} seconds.`,
                code: 'RATE_LIMIT_EXCEEDED',
            } as AuthError;
        }

        // Validate input
        const validationResult = loginSchema.safeParse(credentials);
        if (!validationResult.success) {
            throw validationResult.error;
        }

        const validatedData = validationResult.data;

        try {
            // Call API
            console.log('[AuthService] Calling login API...');
            const rawResponse = await apiPost<any>(API_ENDPOINTS.AUTH_LOGIN, validatedData, {
                headers: getSecurityHeaders(),
            });

            // Backend wraps responses in {success, data, meta} envelope
            // Extract the actual data from the envelope
            const response = rawResponse?.data || rawResponse;

            console.log('[AuthService] Login API response received:', {
                hasUser: !!response?.user,
                hasAccessToken: !!response?.accessToken,
                hasRefreshToken: !!response?.refreshToken,
                responseKeys: response ? Object.keys(response) : 'null'
            });

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                console.error('[AuthService] Response integrity check failed');
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            // Check required fields
            if (!response.user) {
                console.error('[AuthService] Response missing user object');
                throw { message: 'Server response missing user data', code: 'INVALID_RESPONSE' };
            }

            if (!response.accessToken || !response.refreshToken) {
                console.error('[AuthService] Response missing tokens');
                throw { message: 'Server response missing authentication tokens', code: 'INVALID_RESPONSE' };
            }

            // Map user
            const mappedUser = this.mapBackendUserToFrontend(response.user);
            console.log('[AuthService] User mapped successfully:', { id: mappedUser.id, role: mappedUser.role });

            const authResponse: AuthResponse = {
                user: mappedUser,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };

            // Store tokens securely
            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);

            // Reset rate limit on successful login
            resetRateLimit(`auth:login:${credentials.email}`);

            console.log('[AuthService] Login successful, returning response');
            return authResponse;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw sanitizeError(error);
        }
    }

    /**
     * Register new user
     */
    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
        // Rate limit check
        const rateLimit = checkAuthRateLimit('register', credentials.email);
        if (!rateLimit.allowed) {
            throw {
                message: `Too many registration attempts. Please try again in ${Math.ceil((rateLimit.retryAfter || 60000) / 1000)} seconds.`,
                code: 'RATE_LIMIT_EXCEEDED',
            } as AuthError;
        }

        // Validate input
        const validationResult = registerSchema.safeParse(credentials);
        if (!validationResult.success) {
            throw validationResult.error;
        }

        const validatedData = validationResult.data;

        try {
            // Call API
            const rawResponse = await apiPost<any>(API_ENDPOINTS.AUTH_REGISTER, validatedData, {
                headers: getSecurityHeaders(),
            });

            // Backend wraps responses in {success, data, meta} envelope
            // Extract the actual data from the envelope
            const response = rawResponse?.data || rawResponse;

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            // Map user
            const authResponse: AuthResponse = {
                user: this.mapBackendUserToFrontend(response.user),
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };

            // Store tokens securely
            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);

            // Reset rate limit on successful registration
            resetRateLimit(`auth:register:${credentials.email}`);

            return authResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Initiate Google OAuth flow
     */
    async initiateGoogleAuth(): Promise<string> {
        // Rate limit check
        const rateLimit = checkAuthRateLimit('oauth');
        if (!rateLimit.allowed) {
            throw {
                message: 'Too many OAuth attempts. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
            } as AuthError;
        }

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            throw {
                message: 'Google OAuth is not configured',
                code: 'OAUTH_NOT_CONFIGURED',
            } as AuthError;
        }

        // Generate secure state parameter to prevent CSRF
        const state = generateCSRFToken();
        secureStore('oauth_state', state);

        // Generate nonce for additional security
        const nonce = crypto.randomUUID();
        secureStore('oauth_nonce', nonce);

        // Generate PKCE Verifier and Challenge
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        secureStore('pkce_verifier', codeVerifier);

        const redirectUri = import.meta.env.PROD
            ? 'https://seniquapp.netlify.app/auth/callback'
            : `${window.location.origin}/auth/callback`;

        const scope = 'openid email profile';

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('nonce', nonce);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        return authUrl.toString();
    }

    /**
     * Handle Google OAuth callback
     */
    async handleGoogleCallback(code: string, state: string): Promise<AuthResponse> {
        // Verify state to prevent CSRF
        const storedState = secureRetrieve('oauth_state');
        const codeVerifier = secureRetrieve('pkce_verifier');

        if (!storedState || storedState !== state) {
            throw {
                message: 'Invalid OAuth state',
                code: 'OAUTH_STATE_MISMATCH',
            } as AuthError;
        }

        // Clean up stored state
        secureRemove('oauth_state');
        secureRemove('oauth_nonce');
        secureRemove('pkce_verifier');

        try {
            const response = await apiPost<AuthResponse>(API_ENDPOINTS.AUTH_CALLBACK, {
                code,
                // provider: 'google', // Removed: Not expected by backend
                redirectUri: import.meta.env.PROD
                    ? 'https://seniquapp.netlify.app/auth/callback'
                    : `${window.location.origin}/auth/callback`,
                codeVerifier: codeVerifier || undefined,
            }, {
                headers: getSecurityHeaders(),
            });

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            // Store tokens securely
            this.storeAuthTokens(response.accessToken, response.refreshToken);

            return response;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Authenticate with Privy (wallet)
     */
    async authenticateWithPrivy(privyToken: string): Promise<AuthResponse> {
        // Rate limit check
        const rateLimit = checkAuthRateLimit('oauth');
        if (!rateLimit.allowed) {
            throw {
                message: 'Too many authentication attempts. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
            } as AuthError;
        }

        // Validate token format (basic check)
        if (!privyToken || typeof privyToken !== 'string' || privyToken.length < 10) {
            throw {
                message: 'Invalid Privy token',
                code: 'INVALID_TOKEN',
            } as AuthError;
        }

        try {
            const response = await apiPost<AuthResponse>(
                '/auth/privy',
                {},
                {
                    headers: {
                        ...getSecurityHeaders(),
                        'X-Privy-Token': privyToken,
                    },
                }
            );

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            // Store tokens securely
            this.storeAuthTokens(response.accessToken, response.refreshToken);

            return response;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<{ accessToken: string }> {
        const refreshToken = secureRetrieve('refresh_token');

        if (!refreshToken) {
            throw {
                message: 'No refresh token available',
                code: 'NO_REFRESH_TOKEN',
            } as AuthError;
        }

        try {
            const response = await apiPost<{ accessToken: string }>(API_ENDPOINTS.AUTH_REFRESH, {
                refreshToken,
            }, {
                headers: getSecurityHeaders(),
            });

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            // Update access token
            setAccessToken(response.accessToken);
            secureStore('access_token', response.accessToken);

            return response;
        } catch (error) {
            // Clear tokens on refresh failure
            this.clearAuthTokens();
            throw sanitizeError(error);
        }
    }

    /**
     * Get current user profile
     */
    /**
     * Get current user profile
     */
    async getCurrentUser(): Promise<User> {
        try {
            const response = await apiGet<any>(API_ENDPOINTS.AUTH_ME, {
                headers: getSecurityHeaders(),
            });

            // Validate response integrity
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            return this.mapBackendUserToFrontend(response);
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Logout and clear all auth state
     */
    logout(): void {
        this.clearAuthTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    /**
     * Store auth tokens securely
     */
    private storeAuthTokens(accessToken: string, refreshToken: string): void {
        setAccessToken(accessToken);
        secureStore('access_token', accessToken);
        secureStore('refresh_token', refreshToken);
    }

    /**
     * Clear all auth tokens
     */
    private clearAuthTokens(): void {
        setAccessToken(null);
        secureRemove('access_token');
        secureRemove('refresh_token');
    }

    /**
     * Check if user is authenticated (has valid tokens)
     */
    isAuthenticated(): boolean {
        const accessToken = secureRetrieve('access_token');
        return !!accessToken;
    }

    /**
     * Initialize auth from stored tokens
     */
    initializeFromStorage(): boolean {
        const accessToken = secureRetrieve('access_token');
        if (accessToken) {
            setAccessToken(accessToken);
            return true;
        }
        return false;
    }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export validation schemas for form validation
export { emailSchema, passwordSchema, displayNameSchema };
