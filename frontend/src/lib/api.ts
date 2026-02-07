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
import { getCSRFToken, generateCSRFToken, checkRateLimit, secureRetrieve } from './security';
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

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) return refreshPromise;

    // Get refresh token from secure storage
    const refreshToken = secureRetrieve('refresh_token');
    if (!refreshToken) {
        return Promise.reject(new Error('No refresh token available'));
    }

    refreshPromise = api
        .post('/auth/refresh', { refreshToken }, {
            __skipAuthInterceptor: true
        } as AxiosRequestConfig)
        .then((response) => {
            const newToken = response.data.accessToken;
            setAccessToken(newToken);
            return newToken;
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
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add CSRF token for mutating requests
        if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
            let csrfToken = getCSRFToken();
            if (!csrfToken) {
                csrfToken = generateCSRFToken();
            }
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        // Check rate limit
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
            originalRequest.url?.includes('/auth/callback');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                const newToken = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                setAccessToken(null);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return Promise.reject(refreshError);
            }
        }

        // Handle 429 - Rate limited
        if (error.response?.status === 429) {
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
    url: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(url, formData, {
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

    return response.data;
}

// ============================================
// EXPORT DEFAULT INSTANCE
// ============================================

export default api;
