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
import { usePrivy, useSubscribeToJwtAuthWithFlag } from '@privy-io/react-auth';
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
    const {
        isAuthenticated: backendAuthenticated,
        login: storeLogin,
        logout: storeLogout,
        isCustomAuthDisabled,
        disableCustomAuth
    } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Guard against duplicate token exchanges
    const isExchangingRef = useRef(false);
    const lastExchangedPrivyIdRef = useRef<string | null>(null);
    const failedAttemptsRef = useRef(0);
    const MAX_RETRIES = 3;

    // Track whether the CURRENT backend session was initiated through Privy
    // Only Privy-initiated sessions should be logged out when Privy logs out
    const wasPrivyLoginRef = useRef(false);

    /**
     * Exchange Privy token for backend JWT
     */
    const exchangeToken = useCallback(async () => {
        // Prevent concurrent exchanges
        if (isExchangingRef.current) return;

        // Don't re-exchange for the same Privy user if already done
        if (user?.id && lastExchangedPrivyIdRef.current === user.id) return;

        // Stop after max retries to prevent infinite loops (429s)
        if (failedAttemptsRef.current >= MAX_RETRIES) {
            console.warn(`[PrivyAuthBridge] Max retries (${MAX_RETRIES}) exceeded for token exchange. Stop.`);
            return;
        }

        isExchangingRef.current = true;

        try {
            const privyToken = await getAccessToken();

            if (!privyToken) {
                console.warn('[PrivyAuthBridge] No Privy access token available');
                failedAttemptsRef.current += 1;
                return;
            }

            console.log(`[PrivyAuthBridge] Exchanging Privy token for backend JWT (Attempt ${failedAttemptsRef.current + 1}/${MAX_RETRIES})...`);

            // 1. Ensure Embedded Wallet Exists
            let embeddedWalletAddress = user?.wallet?.address;

            // Debug: Check all linked accounts
            // console.log('[PrivyAuthBridge] Checking wallets:', {
            //     embedded: embeddedWalletAddress,
            //     linked: user?.linkedAccounts?.filter(a => a.type === 'wallet')
            // });

            if (!embeddedWalletAddress && user && createWallet) {
                // console.log('[PrivyAuthBridge] No embedded wallet found. Attempting to create one...');
                try {
                    const wallet = await createWallet();
                    embeddedWalletAddress = wallet.address;
                    // console.log('[PrivyAuthBridge] Embedded wallet created:', embeddedWalletAddress);
                } catch (wErr: any) {
                    console.error('[PrivyAuthBridge] Failed to create embedded wallet:', wErr);
                    // Do NOT fail the entire login just because wallet creation failed
                    // The backend can try to provision it later

                    // Fallback: Check if it exists in linked accounts even if user.wallet is null (sync issue)
                    const linkedWallet = user.linkedAccounts.find(a => a.type === 'wallet' && (a as any).walletClientType === 'privy');
                    if (linkedWallet) {
                        embeddedWalletAddress = (linkedWallet as any).address;
                        // console.log('[PrivyAuthBridge] Found wallet in linked accounts fallback:', embeddedWalletAddress);
                    }
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
            failedAttemptsRef.current = 0; // Reset on success

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
            failedAttemptsRef.current += 1;

            // If it's a 429 or 4xx, maybe we should stop retrying immediately?
            // For now, let the retry counter handle it.
        } finally {
            isExchangingRef.current = false;
        }
    }, [user?.id, ready, getAccessToken, storeLogin, navigate, location.pathname, createWallet]); // Using user.id instead of user object to prevent churn

    /**
     * Effect: When Privy authenticates but backend is not authenticated,
     * exchange the Privy token for a backend JWT
     */
    useEffect(() => {
        if (!ready) return;

        // Reset tracking when user changes or logs out
        if (!authenticated) {
            lastExchangedPrivyIdRef.current = null;
            failedAttemptsRef.current = 0;
            return;
        }

        if (authenticated && !backendAuthenticated) {
            exchangeToken();
        }
    }, [ready, authenticated, backendAuthenticated, exchangeToken, user?.id]);

    /**
     * Effect: When Privy logs out, also log out backend —
     * BUT ONLY if the current session was initiated through Privy.
     * 
     * HACK: We need to be careful not to create a loop if the logout was triggered by the backend.
     */
    useEffect(() => {
        if (!ready) return;

        if (!authenticated && backendAuthenticated && wasPrivyLoginRef.current) {
            console.log('[PrivyAuthBridge] Privy logged out — syncing backend logout');
            wasPrivyLoginRef.current = false;
            storeLogout();
            // Reset state
            lastExchangedPrivyIdRef.current = null;
            failedAttemptsRef.current = 0;
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

    /**
     * HYDRATION: Backend -> Privy
     * If user is logged in to backend, fetch custom token and log in to Privy
     */
    // Track hydration attempt to prevent retries
    const hasAttemptedHydrationRef = useRef(false);

    const getExternalJwt = useCallback(async () => {
        try {
            if (isCustomAuthDisabled) return undefined;
            if (hasAttemptedHydrationRef.current) return undefined; // One shot only

            // Only fetch if backend says we are authenticated
            if (!backendAuthenticated) return undefined;

            console.log("[PrivyAuthBridge] Fetching custom token for hydration...");
            hasAttemptedHydrationRef.current = true; // Mark as attempted

            const { privyToken } = await authService.getPrivySyncToken();

            if (privyToken) {
                console.log("[PrivyAuthBridge] Hydration token received.");
                return privyToken;
            }
            return undefined;
        } catch (error) {
            console.error("[PrivyAuthBridge] Failed to fetch hydration token:", error);
            // Don't disable custom auth immediately on network error, but prevent loops
            // disableCustomAuth(); 
            return undefined;
        }
    }, [isCustomAuthDisabled, backendAuthenticated]);

    const handleAuthError = useCallback((error: any) => {
        console.error("[PrivyAuthBridge] Hydration Error:", error);

        // Check for 400 Bad Request specifically (Invalid Auth Token)
        const isBadRequest = error?.message?.includes('400') || error?.status === 400;

        if (isBadRequest) {
            console.warn("[PrivyAuthBridge] Critical Auth Error (400). Disabling hydration PERMANENTLY for this session.");
            disableCustomAuth();
        } else {
            // For other errors, just log it. Don't disable yet.
        }
    }, [disableCustomAuth]);

    // Use the hook to sync state (Backend -> Privy)
    // We only enable this if:
    // 1. Backend is authenticated
    // 2. Custom auth hasn't been explicitly disabled (due to previous error)
    // 3. User is NOT already authenticated in Privy (to avoid redundant checks, though SDK handles this)

    // MEMOIZE the props to prevent re-renders of the hook internals if possible
    const shouldSubscribe = backendAuthenticated && !isCustomAuthDisabled && !authenticated;

    useSubscribeToJwtAuthWithFlag({
        isAuthenticated: shouldSubscribe,
        isLoading: false,
        getExternalJwt,
        onError: handleAuthError,
    });

    /**
     * AUTO-CREATE WALLET
     * If user is authenticated in Privy but has no wallet, create one automatically.
     * This handles cases where createOnLogin failed or wasn't triggered.
     */
    useEffect(() => {
        if (!ready || !authenticated || !user) return;

        // Check if user already has an embedded wallet
        const hasEmbeddedWallet = user.wallet?.address || user.linkedAccounts?.some((a: any) => a.type === 'wallet' && a.walletClientType === 'privy');

        if (!hasEmbeddedWallet && createWallet) {
            // console.log("[PrivyAuthBridge] Authenticated but no wallet found. Auto-creating...");

            // Add a small delay/debounce to avoid conflict with initial login
            const timer = setTimeout(() => {
                createWallet().then(wallet => {
                    console.log("[PrivyAuthBridge] Auto-created wallet:", wallet.address);
                }).catch(() => {
                    // console.error("[PrivyAuthBridge] Auto-create failed:", err);
                });
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [ready, authenticated, user?.id, createWallet]); // Use user.id for stability

    return <>{children}</>;
}

export default PrivyAuthBridge;
