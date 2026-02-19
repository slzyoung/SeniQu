/**
 * Auth Store - Global Authentication State Management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../lib/types';
import { ROLES, UserRole } from '../lib/constants';
import { setAccessToken } from '../lib/api';
import { secureStore, secureRetrieve, secureRemove } from '../lib/security';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoggingOut: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setLoggingOut: (loggingOut: boolean) => void;
    login: (user: User, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;

    // Role checks
    hasRole: (role: UserRole) => boolean;
    isAdmin: () => boolean;
    isArtist: () => boolean;
    isInstitution: () => boolean;

    // Feature flags / Capabilities
    isCustomAuthDisabled: boolean;
    disableCustomAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true, // Start loading to check stored auth
            isLoggingOut: false,
            error: null,
            isCustomAuthDisabled: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),

            disableCustomAuth: () => set({ isCustomAuthDisabled: true }),

            setLoggingOut: (isLoggingOut) => set({ isLoggingOut }),

            login: (user, accessToken, refreshToken) => {
                // Store access token in memory and secure storage
                setAccessToken(accessToken);
                secureStore('access_token', accessToken);
                secureStore('refresh_token', refreshToken);
                set({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                    isCustomAuthDisabled: false, // Reset flag on fresh login
                });
            },

            logout: () => {
                setAccessToken(null);
                secureRemove('access_token');
                secureRemove('refresh_token');
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                    // We don't reset isCustomAuthDisabled here, so it persists across logouts until refresh
                    // But maybe we should reset it on *login*? 
                    // No, if it's a plan limit, it won't change on login.
                });
            },

            updateUser: (updates) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...updates } });
                }
            },

            hasRole: (role) => {
                const user = get().user;
                return user?.role === role;
            },

            isAdmin: () => {
                const user = get().user;
                return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN;
            },

            isArtist: () => {
                const user = get().user;
                return user?.role === ROLES.ARTIST || user?.role === ROLES.INSTITUTION;
            },

            isInstitution: () => {
                const user = get().user;
                return user?.role === ROLES.INSTITUTION;
            },
        }),
        {
            name: 'seniqu-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                // Don't persist isCustomAuthDisabled so hard refresh retries the sync
            }),
            // Restore access token and set isLoading to false after rehydration
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('[AuthStore] Rehydration error:', error);
                    return;
                }

                if (state) {
                    // Restore access token from secure storage if authenticated
                    if (state.isAuthenticated) {
                        const storedToken = secureRetrieve('access_token');
                        if (storedToken) {
                            setAccessToken(storedToken);
                        } else {
                            // No token found, force logout
                            state.logout();
                        }
                    }
                    state.setLoading(false);
                }
            },
        }
    )
);

// Initialize from stored token on app load
export function initializeAuth(): void {
    const storedToken = secureRetrieve('access_token');
    if (storedToken) {
        setAccessToken(storedToken);
    }
}

// Listen for logout events from API interceptor
if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout();
    });
}
