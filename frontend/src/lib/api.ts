/**
 * API Client - Anti-Throttling, Retry Logic, Request Management
 */

import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    InternalAxiosRequestConfig
} from 'axios';
import { API_BASE_URL, RATE_LIMIT } from './constants';
import { getCSRFToken, generateCSRFToken, checkRateLimit, secureRetrieve, secureStore } from './security';
import { ApiError } from './types';

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================

const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable cookies for CSRF
});

// ============================================
// REQUEST QUEUE FOR RATE LIMITING
// ============================================

// ============================================
// REQUEST QUEUE FOR RATE LIMITING (Removed unused implementation)
// ============================================

// ============================================
// REQUEST DEDUPLICATION
// ============================================

const pendingRequests = new Map<string, Promise<unknown>>();

function getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) {
        console.log('[API Token Refresh] Reuse active refresh token promise...');
        return refreshPromise;
    }

    // Get refresh token from secure storage
    const refreshToken = secureRetrieve('refresh_token');
    if (!refreshToken) {
        console.warn('[API Token Refresh] No refresh token available in secure storage');
        return Promise.reject(new Error('No refresh token available'));
    }

    console.log('[API Token Refresh] Launching refresh request to backend...');
    refreshPromise = api
        .post('/auth/refresh', { refreshToken }, {
            __skipAuthInterceptor: true
        } as AxiosRequestConfig)
        .then((response) => {
            const newToken = response.data.accessToken;
            setAccessToken(newToken);
            secureStore('access_token', newToken); // Sync secure storage!
            console.log(`[API Token Refresh] Successfully refreshed token! New token prefix: ${newToken.substring(0, 12)}...`);
            // Resolve all queued requests with the new token
            failedQueue.forEach(({ resolve }) => resolve(newToken));
            failedQueue = [];
            return newToken;
        })
        .catch((err) => {
            console.error('[API Token Refresh] Refresh token request failed:', err.message);
            // Reject all queued requests
            failedQueue.forEach(({ reject }) => reject(err));
            failedQueue = [];
            throw err;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add Authorization header
        if (accessToken && !(config as { __skipAuthInterceptor?: boolean }).__skipAuthInterceptor) {
            // Remove any potential old/expired authorization headers to prevent duplicates
            if (config.headers.delete) {
                config.headers.delete('Authorization');
                config.headers.delete('authorization');
            } else {
                delete config.headers['Authorization'];
                delete config.headers['authorization'];
            }

            if (config.headers.set) {
                config.headers.set('Authorization', `Bearer ${accessToken}`);
            } else {
                config.headers['Authorization'] = `Bearer ${accessToken}`;
            }
            console.log(`[API Request] Sending authorized request to: ${config.url} | Token: ${accessToken.substring(0, 12)}...`);
        } else {
            console.log(`[API Request] Sending public/skipped request to: ${config.url}`);
        }

        // Add CSRF token for mutating requests
        if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
            let csrfToken = getCSRFToken();
            if (!csrfToken) {
                csrfToken = generateCSRFToken();
            }
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        // Check rate limit — skip for auth endpoints to prevent blocking token refresh
        const isAuthPath = config.url?.includes('/auth/');
        if (!isAuthPath) {
            const rateLimitKey = `api:${config.url}`;
            const { allowed, retryAfter } = checkRateLimit(
                rateLimitKey,
                RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
                60000
            );

            if (!allowed) {
                return Promise.reject({
                    response: {
                        status: 429,
                        data: {
                            message: 'Rate limit exceeded',
                            retryAfter,
                        },
                    },
                });
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
            _retryCount?: number;
        };

        // Handle 401 - Token expired
        // Skip refresh for auth endpoints to prevent infinite loops
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/refresh') ||
            originalRequest.url?.includes('/auth/callback') ||
            originalRequest.url?.includes('/auth/verify-email') ||
            originalRequest.url?.includes('/auth/verify-otp') ||
            originalRequest.url?.includes('/auth/resend-otp');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            console.log(`[API Response] Received 401 for: ${originalRequest.url} | Attempting token refresh...`);

            // If a refresh is already in progress, queue this request
            if (refreshPromise) {
                console.log(`[API Response] Queuing request for: ${originalRequest.url} until active refresh completes.`);
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((newToken) => {
                    console.log(`[API Response] Retrying queued request for: ${originalRequest.url} with new token...`);
                    
                    if (originalRequest.headers.delete) {
                        originalRequest.headers.delete('Authorization');
                        originalRequest.headers.delete('authorization');
                    } else {
                        delete originalRequest.headers['Authorization'];
                        delete originalRequest.headers['authorization'];
                    }

                    if (originalRequest.headers.set) {
                        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
                    } else {
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    }
                    return api(originalRequest);
                }).catch((err) => {
                    return Promise.reject(err);
                });
            }

            try {
                const newToken = await refreshAccessToken();
                console.log(`[API Response] Retrying primary request: ${originalRequest.url} with newly refreshed token...`);
                
                if (originalRequest.headers.delete) {
                    originalRequest.headers.delete('Authorization');
                    originalRequest.headers.delete('authorization');
                } else {
                    delete originalRequest.headers['Authorization'];
                    delete originalRequest.headers['authorization'];
                }

                if (originalRequest.headers.set) {
                    originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
                } else {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                console.error('[API Response] Refresh failed. Clearing token and dispatching logout event.');
                // Refresh failed, clear tokens and redirect to login
                setAccessToken(null);
                // Small delay to debounce multiple simultaneous logout events
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }, 100);
                return Promise.reject(refreshError);
            }
        }

        // Handle 429 - Rate limited (with max retry to prevent infinite loops)
        if (error.response?.status === 429) {
            const retryCount429 = (originalRequest as any)._retryCount429 || 0;
            if (retryCount429 >= 3) {
                return Promise.reject(error);
            }
            (originalRequest as any)._retryCount429 = retryCount429 + 1;

            const retryAfter = error.response.headers['retry-after'];
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : RATE_LIMIT.RETRY_DELAY_MS;

            await new Promise((r) => setTimeout(r, delay));
            return api(originalRequest);
        }

        // Retry logic for network errors
        if (!error.response && originalRequest) {
            const retryCount = originalRequest._retryCount || 0;

            if (retryCount < RATE_LIMIT.MAX_RETRIES) {
                originalRequest._retryCount = retryCount + 1;

                // Exponential backoff
                const delay = RATE_LIMIT.RETRY_DELAY_MS * Math.pow(2, retryCount);
                await new Promise((r) => setTimeout(r, delay));

                return api(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

// ============================================
// API METHODS WITH DEDUPLICATION
// ============================================

export async function apiGet<T>(
    url: string,
    config?: AxiosRequestConfig
): Promise<T> {
    const requestKey = getRequestKey({ method: 'get', url, ...config });

    // Check for duplicate request
    if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey) as Promise<T>;
    }

    const promise = api.get<T>(url, config).then((res) => res.data);
    pendingRequests.set(requestKey, promise);

    try {
        const result = await promise;
        return result;
    } finally {
        pendingRequests.delete(requestKey);
    }
}

export async function apiPost<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
}

export async function apiPut<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
}

export async function apiPatch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
): Promise<T> {
    const response = await api.patch<T>(url, data, config);
    return response.data;
}

export async function apiDelete<T>(
    url: string,
    config?: AxiosRequestConfig
): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
}

// ============================================
// FILE UPLOAD
// ============================================

export async function uploadFile(
    file: File,
    folder:
        | "artworks"
        | "avatars"
        | "videos"
        | "collections"
        | "general"
        | "artist-profiles"
        | "creator-profiles"
        | "artist-banners"
        | "creator-banners"
        | "collector-profiles"
        | "collector-banners" = "general",
    onProgress?: (progress: number) => void,
    scopeId?: string,
    city?: string
): Promise<{ key: string; url: string; size: number; contentType: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (scopeId) {
        formData.append('scopeId', scopeId);
    }
    if (city) {
        formData.append('city', city);
    }

    const response = await api.post('/storage/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(progress);
            }
        },
    });

    return response.data?.data || response.data;
}

// ============================================
// EXPORT DEFAULT INSTANCE
// ============================================

export default api;
