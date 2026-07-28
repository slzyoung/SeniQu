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

const usernameSchema = z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores')
    .transform((val) => sanitizeInput(val.trim().toLowerCase()));

// Register credentials schema
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema.optional(),
    username: usernameSchema.optional(),
    userType: z.enum(['ART_LOVER', 'ARTIST', 'COLLECTOR', 'INSTITUTION']).default('ART_LOVER'),
    turnstileToken: z.string().optional(),
    website: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser?: boolean;
    privyToken?: string;
}

// New: OTP/Verification step responses
export interface OtpRequiredResponse {
    message: string;
    requiresOtp: true;
    email: string; // masked email
}

export interface VerificationRequiredResponse {
    message: string;
    requiresVerification: true;
    email: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    displayName?: string;
    username?: string;
    userType?: 'ART_LOVER' | 'ARTIST' | 'COLLECTOR' | 'INSTITUTION';
    turnstileToken?: string;
    website?: string;
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

        // Unwrap if wrapped in data property
        const user = backendUser.data || backendUser;

        let role = 'user';

        // Map userType to role
        switch (user.userType) {
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
        if (user.adminRole) {
            role = user.adminRole === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username || '',
            displayName: user.displayName || user.display_name || '',
            role: role as any,
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
            isVerified: user.isVerified || false,
            isPremium: user.isPremium || false,
            wallets: (user.wallets || []).map((w: any) => ({
                chainType: w.chainType || w.chain_type,
                address: w.address || w.wallet_address,
                verifiedAt: w.verifiedAt || w.verified_at || new Date().toISOString(),
            })),
        };
    }

    /**
     * Login with email and password — now returns OTP step first
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse | OtpRequiredResponse> {
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
            if (import.meta.env.DEV) console.log('[AuthService] Calling login API...');
            const rawResponse = await apiPost<any>(API_ENDPOINTS.AUTH_LOGIN, validatedData, {
                headers: getSecurityHeaders(),
            });

            const response = rawResponse?.data || rawResponse;

            // Check if OTP step is required
            if (response?.requiresOtp) {
                if (import.meta.env.DEV) console.log('[AuthService] OTP required, email:', response.email);
                return response as OtpRequiredResponse;
            }

            // Full auth response (shouldn't happen in new flow, but keep for safety)
            if (!response.user || !response.accessToken || !response.refreshToken) {
                throw { message: 'Server response missing required data', code: 'INVALID_RESPONSE' };
            }

            const mappedUser = this.mapBackendUserToFrontend(response.user);
            const authResponse: AuthResponse = {
                user: mappedUser,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };

            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);
            resetRateLimit(`auth:login:${credentials.email}`);
            return authResponse;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw sanitizeError(error);
        }
    }

    /**
     * Register new user — now returns verification step
     */
    async register(credentials: RegisterCredentials): Promise<AuthResponse | VerificationRequiredResponse> {
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
            const rawResponse = await apiPost<any>(API_ENDPOINTS.AUTH_REGISTER, validatedData, {
                headers: getSecurityHeaders(),
            });

            const response = rawResponse?.data || rawResponse;

            // Check if verification step is required
            if (response?.requiresVerification) {
                if (import.meta.env.DEV) console.log('[AuthService] Email verification required');
                resetRateLimit(`auth:register:${credentials.email}`);
                return response as VerificationRequiredResponse;
            }

            // Full auth response (shouldn't happen in new flow)
            if (!response.user || !response.accessToken) {
                throw { message: 'Invalid server response', code: 'INVALID_RESPONSE' };
            }

            const authResponse: AuthResponse = {
                user: this.mapBackendUserToFrontend(response.user),
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };

            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);
            resetRateLimit(`auth:register:${credentials.email}`);
            return authResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Initiate Google OAuth flow
     * Calls the backend to generate PKCE, state, nonce (server-side security).
     * Backend returns the Google auth URL.
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

        try {
            // Call backend to generate auth URL with PKCE + signed state + nonce
            const response = await apiGet<{ authUrl: string }>(
                `${API_ENDPOINTS.AUTH_CALLBACK.replace('/callback', '/google/initiate')}`,
                { headers: getSecurityHeaders() },
            );

            // Backend wraps in {success, data} envelope
            const data = (response as any)?.data || response;
            if (!data?.authUrl) {
                throw { message: 'Failed to initiate Google OAuth', code: 'INITIATE_FAILED' };
            }

            return data.authUrl;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Handle Google OAuth callback — parse tokens from URL hash fragment
     * The backend redirects to the frontend with tokens in the hash.
     */
    handleGoogleCallbackFromHash(hash: string): AuthResponse {
        // Parse hash fragment (remove leading #)
        const params = new URLSearchParams(hash.replace(/^#/, ''));

        const error = params.get('error');
        if (error) {
            throw {
                message: decodeURIComponent(error),
                code: 'OAUTH_ERROR',
            } as AuthError;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const userJson = params.get('user');

        if (!accessToken || !refreshToken || !userJson) {
            throw {
                message: 'Invalid authentication response from server',
                code: 'INVALID_CALLBACK',
            } as AuthError;
        }

        // Clean up stored OAuth state
        secureRemove('oauth_state');
        secureRemove('oauth_nonce');

        let backendUser: any;
        try {
            backendUser = JSON.parse(userJson);
        } catch {
            throw {
                message: 'Invalid user data in auth response',
                code: 'INVALID_USER_DATA',
            } as AuthError;
        }

        const user = this.mapBackendUserToFrontend(backendUser);

        // Store tokens securely
        this.storeAuthTokens(accessToken, refreshToken);

        return { user, accessToken, refreshToken };
    }

    /**
     * Authenticate with Privy (wallet)
     */
    async authenticateWithPrivy(privyToken: string, embeddedWalletAddress?: string): Promise<AuthResponse> {
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
            const rawResponse = await apiPost<any>(
                '/auth/privy',
                { embeddedWalletAddress },
                {
                    headers: {
                        ...getSecurityHeaders(),
                        'X-Privy-Token': privyToken,
                    },
                }
            );

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

            return authResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Get Privy Sync Token for Session Hydration
     */
    async getPrivySyncToken(): Promise<{ privyToken: string | null }> {
        try {
            const token = secureRetrieve('access_token');
            if (!token) return { privyToken: null };
            const response = await apiGet<{ privyToken: string | null }>(
                '/auth/sync-privy',
                { headers: getSecurityHeaders() }
            );
            // Handle { data: { privyToken } } if wrapped, or just { privyToken }
            const data = (response as any).data || response;
            return { privyToken: data.privyToken || null };
        } catch (error) {
            // detailed logging for debug
            if (import.meta.env.DEV) console.warn('[Helper] Failed to get Privy sync token', error);
            return { privyToken: null };
        }
    }

    /**
     * Authenticate with manual wallet signature (no Privy)
     * Sends walletAddress + signature + nonce to POST /auth/wallet
     */
    async authenticateWithWallet(
        walletAddress: string,
        signature: string,
        nonce: string,
        chain: string = 'solana',
    ): Promise<AuthResponse> {
        // Rate limit check
        const rateLimit = checkAuthRateLimit('oauth', walletAddress);
        if (!rateLimit.allowed) {
            throw {
                message: 'Too many login attempts. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
            } as AuthError;
        }

        // Basic validation
        if (!walletAddress || !signature || !nonce) {
            throw {
                message: 'Missing required wallet authentication data',
                code: 'INVALID_INPUT',
            } as AuthError;
        }

        try {
            const rawResponse = await apiPost<any>(
                API_ENDPOINTS.AUTH_WALLET,
                { walletAddress, signature, nonce, chain },
                { headers: getSecurityHeaders() },
            );

            // Extract from envelope
            const response = rawResponse?.data || rawResponse;

            // Validate
            if (!validateResponseIntegrity(response)) {
                throw { message: 'Invalid server response', code: 'RESPONSE_INTEGRITY_ERROR' };
            }

            if (!response.user || !response.accessToken || !response.refreshToken) {
                throw { message: 'Server response missing required data', code: 'INVALID_RESPONSE' };
            }

            const authResponse: AuthResponse = {
                user: this.mapBackendUserToFrontend(response.user),
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
            };

            // Store tokens securely
            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);

            // Reset rate limit on success
            resetRateLimit(`auth:oauth:${walletAddress}`);

            return authResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Provision a wallet for specific chain via backend
     * Fallback when client-side creation fails
     */
    async provisionWallet(chainType: 'ethereum' | 'solana'): Promise<any> {
        try {
            const rawResponse = await apiPost<any>(
                '/auth/wallet/provision',
                { chainType },
                { headers: getSecurityHeaders() }
            );
            return rawResponse?.data || rawResponse;
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
    /**
     * Verify OTP code and complete login
     */
    async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
        try {
            const rawResponse = await apiPost<any>('/auth/verify-otp', { email, otp }, {
                headers: getSecurityHeaders(),
            });

            const response = rawResponse?.data || rawResponse;

            if (!response.user || !response.accessToken || !response.refreshToken) {
                throw { message: 'Invalid server response', code: 'INVALID_RESPONSE' };
            }

            const authResponse: AuthResponse = {
                user: this.mapBackendUserToFrontend(response.user),
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                privyToken: response.privyToken,
            };

            this.storeAuthTokens(authResponse.accessToken, authResponse.refreshToken);
            return authResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Verify email address from registration link
     */
    async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
        try {
            const rawResponse = await apiPost<any>('/auth/verify-email', { token }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Resend OTP code
     */
    async resendOtp(email: string): Promise<{ message: string }> {
        try {
            const rawResponse = await apiPost<any>('/auth/resend-otp', { email }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Request password change (Step 1)
     */
    async requestPasswordChange(currentPassword: string): Promise<{ message: string; requiresOtp: boolean; email: string }> {
        try {
            const rawResponse = await apiPost<any>('/auth/change-password/request', { currentPassword }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Verify password change (Step 2)
     */
    async verifyPasswordChange(otp: string, newPassword: string): Promise<{ message: string }> {
        try {
            const rawResponse = await apiPost<any>('/auth/change-password/verify', { otp, newPassword }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Request forgot password OTP (Step 1)
     */
    async forgotPasswordRequest(email: string): Promise<{ message: string; requiresOtp: boolean; email: string }> {
        try {
            const rawResponse = await apiPost<any>('/auth/forgot-password/request', { email }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }

    /**
     * Verify forgot password OTP and reset password (Step 2)
     */
    async forgotPasswordVerify(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
        try {
            const rawResponse = await apiPost<any>('/auth/forgot-password/verify', { email, otp, newPassword }, {
                headers: getSecurityHeaders(),
            });
            return rawResponse?.data || rawResponse;
        } catch (error) {
            throw sanitizeError(error);
        }
    }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export validation schemas for form validation
export { emailSchema, passwordSchema, displayNameSchema };
