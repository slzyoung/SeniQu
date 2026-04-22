import { useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { getDashboardRoute } from '../../lib/utils';
import { needsProfileCompletion } from '../../lib/authHelpers';

/**
 * PrivyAuthenticationLogic
 * 
 * Centralized logic for bidirectional synchronization between Privy (Wallet/Social Auth) 
 * and our Backend (Custom JWT).
 * 
 * responsibilities:
 * 1. Hydration (Backend -> Privy): If backend has session, log into Privy via custom token.
 * 2. Login (Privy -> Backend): If user logs into Privy, authenticate with backend.
 * 3. Logout: standardized logout flow.
 * 
 * Designed to prevent:
 * - Infinite loops (Syncing A -> B -> A)
 * - Race conditions
 * - Duplicate initializations
 */
export const PrivyAuthenticationLogic = () => {
    // Privy Hooks
    const {
        ready,
        authenticated: privyAuthenticated,
        user: privyUser,
        getAccessToken,
        createWallet,
    } = usePrivy();

    // Backend Auth Store
    const {
        isAuthenticated: backendAuthenticated,
        login: storeLogin,
        logout: storeLogout,
    } = useAuthStore();

    const navigate = useNavigate();
    const location = useLocation();

    // ============================================================
    // STATE MACHINE REFS (Prevent Rerenders)
    // ============================================================

    // Locks to prevent concurrent sync operations
    const isSyncingRef = useRef(false);

    // Tracks constraints to avoid frequent re-verification
    const lastCheckedPrivyIdRef = useRef<string | null>(null);
    const wasPrivyInitiatedRef = useRef(false);

    // ============================================================
    // 1. LOGIN LOGIC (Privy -> Backend)
    // ============================================================
    const handlePrivyLogin = useCallback(async () => {
        if (isSyncingRef.current) return;
        if (lastCheckedPrivyIdRef.current === privyUser?.id) return;

        isSyncingRef.current = true;
        console.log('[PrivyAuth] Starting Privy -> Backend sync...');

        try {
            const privyToken = await getAccessToken();
            if (!privyToken) {
                console.warn('[PrivyAuth] No access token found');
                return;
            }

            // A. Ensure Wallet Exists (for embedded users)
            const embeddedWalletAddress = privyUser?.wallet?.address;
            if (!embeddedWalletAddress && privyUser?.wallet === undefined) {
                // Attempt creation only if strictly needed and not present
                // Note: relying on 'createOnLogin' config in PrivyProvider is safer usually, 
                // but we check here just in case specific logic is needed.
            }

            // B. Authenticate with Backend
            const response = await authService.authenticateWithPrivy(privyToken, embeddedWalletAddress);

            // C. Update Store
            wasPrivyInitiatedRef.current = true;
            storeLogin(response.user, response.accessToken, response.refreshToken);
            lastCheckedPrivyIdRef.current = privyUser?.id || 'unknown';

            console.log('[PrivyAuth] Backend sync successful');

            // D. Navigation Redirect — ONLY from auth-specific pages
            // Do NOT redirect from public content pages like /gallery/nearby, /marketplace, etc.
            const authOnlyRoutes = ['/', '/auth/callback'];
            const isAuthRoute = authOnlyRoutes.includes(location.pathname) || location.pathname.startsWith('/auth/');

            if (isAuthRoute) {
                const needsCompletion = needsProfileCompletion(response.user);
                const dashboardRoute = needsCompletion
                    ? '/complete-profile'
                    : getDashboardRoute(response.user.role);
                navigate(dashboardRoute, { replace: true });
            }

        } catch (error) {
            console.error('[PrivyAuth] Login sync failed:', error);
            // Optional: Force logout if sync fails to avoid stuck state?
            // privyLogout(); 
        } finally {
            isSyncingRef.current = false;
        }
    }, [privyUser, getAccessToken, createWallet, storeLogin, navigate, location.pathname]);


    // ============================================================
    // EFFECTS
    // ============================================================

    // A. CHANGE DETECTION: Privy -> Backend
    useEffect(() => {
        if (!ready) return;

        // User is logged into Privy, but not Backend
        // AND we haven't already synced this user
        if (privyAuthenticated && !backendAuthenticated) {
            handlePrivyLogin();
        }
    }, [ready, privyAuthenticated, backendAuthenticated, handlePrivyLogin]);


    // B. LOGOUT SYNC: Privy -> Backend
    // If Privy logs out, we must log out the backend IF it was a Privy connection
    useEffect(() => {
        if (!ready) return;

        if (!privyAuthenticated && backendAuthenticated && wasPrivyInitiatedRef.current) {
            console.log('[PrivyAuth] Privy logout user detected. Clearing backend session.');
            wasPrivyInitiatedRef.current = false;
            lastCheckedPrivyIdRef.current = null;
            storeLogout();
        }
    }, [ready, privyAuthenticated, backendAuthenticated, storeLogout]);

    // C. CLEAR FLAGS on Manual Backend Logout
    useEffect(() => {
        if (!backendAuthenticated) {
            wasPrivyInitiatedRef.current = false;
            lastCheckedPrivyIdRef.current = null;
        }
    }, [backendAuthenticated]);

    return null; // Logic-only component
};
