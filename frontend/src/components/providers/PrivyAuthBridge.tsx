/**
 * PrivyAuthBridge — Bridges Privy auth state to backend JWT system
 *
 * This component sits inside PrivyWrapper and:
 * 1. Detects when user authenticates via Privy (wallet connection)
 * 2. Exchanges the Privy access token for a backend JWT
 * 3. Updates useAuthStore with the user + tokens
 * 4. Redirects to /dashboard on successful login
 *
 * IMPORTANT: This bridge only handles Privy-initiated logins (wallets).
 * Email/password and Google logins go through AuthModal → authService directly
 * and are NOT managed by this bridge.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { getDashboardRoute } from '../../lib/utils';
import { needsProfileCompletion } from '../../lib/authHelpers';

interface PrivyAuthBridgeProps {
    children: React.ReactNode;
}

export function PrivyAuthBridge({ children }: PrivyAuthBridgeProps) {
    const { authenticated, ready, user, getAccessToken, createWallet } = usePrivy();
    const { isAuthenticated: backendAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Guard against duplicate token exchanges
    const isExchangingRef = useRef(false);
    const lastExchangedPrivyIdRef = useRef<string | null>(null);

    // Track whether the CURRENT backend session was initiated through Privy
    // Only Privy-initiated sessions should be logged out when Privy logs out
    const wasPrivyLoginRef = useRef(false);

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
            const privyToken = await getAccessToken();

            if (!privyToken) {
                console.warn('[PrivyAuthBridge] No Privy access token available');
                return;
            }

            console.log('[PrivyAuthBridge] Exchanging Privy token for backend JWT...');

            // 1. Ensure Embedded Wallet Exists
            let embeddedWalletAddress = user?.wallet?.address;

            if (!embeddedWalletAddress && user && createWallet) {
                console.log('[PrivyAuthBridge] No embedded wallet found. Attempting to create one...');
                try {
                    const wallet = await createWallet();
                    embeddedWalletAddress = wallet.address;
                    console.log('[PrivyAuthBridge] Embedded wallet created:', embeddedWalletAddress);
                } catch (wErr) {
                    console.error('[PrivyAuthBridge] Failed to create embedded wallet:', wErr);
                    // Continue anyway, maybe they can create it later
                }
            }

            // 2. Authenticate with Backend
            const response = await authService.authenticateWithPrivy(privyToken, embeddedWalletAddress);

            // Mark this as a Privy-initiated login BEFORE storing
            wasPrivyLoginRef.current = true;

            // Store in auth store
            storeLogin(response.user, response.accessToken, response.refreshToken);

            // Mark this Privy user as exchanged
            lastExchangedPrivyIdRef.current = user?.id || null;

            console.log('[PrivyAuthBridge] Token exchange successful, user:', response.user.id);

            // Redirect to dashboard if currently on landing or auth pages
            const isOnPublicPage = ['/', '/gallery', '/auth/callback'].includes(location.pathname) ||
                location.pathname.startsWith('/auth');

            if (isOnPublicPage) {
                const needsCompletion = needsProfileCompletion(response.user);
                const dashboardRoute = needsCompletion
                    ? '/complete-profile'
                    : getDashboardRoute(response.user.role);
                navigate(dashboardRoute, { replace: true });
            }
        } catch (err: any) {
            console.error('[PrivyAuthBridge] Token exchange failed:', err);
        } finally {
            isExchangingRef.current = false;
        }
    }, [user, getAccessToken, storeLogin, navigate, location.pathname]);

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
     * Effect: When Privy logs out, also log out backend —
     * BUT ONLY if the current session was initiated through Privy.
     * 
     * Email/password and Google logins don't go through Privy,
     * so Privy being !authenticated should NOT trigger backend logout
     * for those sessions.
     */
    useEffect(() => {
        if (!ready) return;

        if (!authenticated && backendAuthenticated && wasPrivyLoginRef.current) {
            console.log('[PrivyAuthBridge] Privy logged out — syncing backend logout');
            wasPrivyLoginRef.current = false;
            storeLogout();
            lastExchangedPrivyIdRef.current = null;
        }
    }, [ready, authenticated, backendAuthenticated, storeLogout]);

    /**
     * Effect: Reset the Privy login flag when backend logs out
     * (e.g., user manually logs out or token expires)
     */
    useEffect(() => {
        if (!backendAuthenticated) {
            wasPrivyLoginRef.current = false;
            lastExchangedPrivyIdRef.current = null;
        }
    }, [backendAuthenticated]);

    return <>{children}</>;
}

export default PrivyAuthBridge;

