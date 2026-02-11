/**
 * PrivyAuthBridge — Bridges Privy auth state to backend JWT system
 *
 * This component sits inside PrivyWrapper and:
 * 1. Detects when user authenticates via Privy (wallet, email, Google)
 * 2. Exchanges the Privy access token for a backend JWT
 * 3. Updates useAuthStore with the user + tokens
 * 4. Redirects to /dashboard on successful login
 *
 * Security:
 * - Only exchanges tokens when Privy is authenticated but backend is not
 * - Prevents duplicate token exchanges with a ref guard
 * - Handles errors gracefully without crashing the app
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { getDashboardRoute } from '../../lib/utils';

interface PrivyAuthBridgeProps {
    children: React.ReactNode;
}

export function PrivyAuthBridge({ children }: PrivyAuthBridgeProps) {
    const { authenticated, ready, user, getAccessToken } = usePrivy();
    const { isAuthenticated: backendAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Guard against duplicate token exchanges
    const isExchangingRef = useRef(false);
    const lastExchangedPrivyIdRef = useRef<string | null>(null);

    /**
     * Exchange Privy token for backend JWT
     */
    const exchangeToken = useCallback(async () => {
        // Prevent concurrent exchanges
        if (isExchangingRef.current) return;

        // Don't re-exchange for the same Privy user
        if (user?.id && lastExchangedPrivyIdRef.current === user.id) return;

        isExchangingRef.current = true;

        try {
            // Get the Privy access token
            const privyToken = await getAccessToken();

            if (!privyToken) {
                console.warn('[PrivyAuthBridge] No Privy access token available');
                return;
            }

            console.log('[PrivyAuthBridge] Exchanging Privy token for backend JWT...');

            // Call backend to verify Privy token and get our JWT
            const response = await authService.authenticateWithPrivy(privyToken);

            // Store in auth store (this also stores tokens securely)
            storeLogin(response.user, response.accessToken, response.refreshToken);

            // Mark this Privy user as exchanged
            lastExchangedPrivyIdRef.current = user?.id || null;

            console.log('[PrivyAuthBridge] Token exchange successful, user:', response.user.id);

            // Show success toast
            // We use a custom event or store method if available, but here we can't easily access the hook outside a component
            // So we rely on the side-effect of storeLogin which updates UI state

            // Redirect to dashboard if currently on landing or auth pages
            const isOnPublicPage = ['/', '/gallery', '/auth/callback'].includes(location.pathname) ||
                location.pathname.startsWith('/auth');

            if (isOnPublicPage) {
                const dashboardRoute = getDashboardRoute(response.user.role);
                navigate(dashboardRoute, { replace: true });
            }
        } catch (err: any) {
            console.error('[PrivyAuthBridge] Token exchange failed:', err);
            // Don't crash the app — user can retry
            // If the backend is unreachable, they're still Privy-authenticated
            // but won't have access to backend features
        } finally {
            isExchangingRef.current = false;
        }
    }, [user?.id, getAccessToken, storeLogin, navigate, location.pathname]);

    /**
     * Effect: When Privy authenticates but backend is not authenticated,
     * exchange the Privy token for a backend JWT
     */
    useEffect(() => {
        if (!ready) return;

        if (authenticated && !backendAuthenticated) {
            exchangeToken();
        }
    }, [ready, authenticated, backendAuthenticated, exchangeToken]);

    /**
     * Effect: When Privy logs out, also log out backend
     */
    useEffect(() => {
        if (ready && !authenticated && backendAuthenticated) {
            // Privy logged out, sync backend logout
            console.log('[PrivyAuthBridge] Privy logged out — syncing backend logout');
            storeLogout();
            lastExchangedPrivyIdRef.current = null;
        }
    }, [ready, authenticated, backendAuthenticated, storeLogout]);

    return <>{children}</>;
}

export default PrivyAuthBridge;
