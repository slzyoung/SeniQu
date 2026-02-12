import { useCallback } from 'react';
import { useSubscribeToJwtAuthWithFlag } from '@privy-io/react-auth';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import api from '../lib/api';

/**
 * PrivyAuthBridge
 * 
 * Bridges our custom backend authentication with Privy's embedded wallet system.
 * Uses `useSubscribeToJwtAuthWithFlag` to automatically sync authentication state.
 * 
 * Flow:
 * 1. User logs in to Backend -> useAuthStore.isAuthenticated = true
 * 2. useSubscribeToJwtAuthWithFlag sees isAuthenticated=true
 * 3. It calls getExternalJwt()
 * 4. We fetch custom token from backend
 * 5. Privy SDK handles the rest (login/refresh)
 */
export const PrivyAuthBridge = () => {
    const {
        isAuthenticated: isBackendAuthenticated,
        isCustomAuthDisabled,
        disableCustomAuth
    } = useAuthStore();
    const toast = useToast();

    // Define the JWT fetcher callback
    // This function must return a Promise<string | null>
    const getExternalJwt = useCallback(async () => {
        try {
            if (isCustomAuthDisabled) return null; // Don't fetch if feature disabled

            console.log("[PrivyAuthBridge] Fetching custom token...");
            const response = await api.get('/auth/privy-token');

            // Handle NestJS TransformInterceptor response structure
            const customToken = response.data?.data?.token || response.data?.token || response.data?.privyToken;

            if (customToken) {
                console.log("[PrivyAuthBridge] Token received.");
                return customToken;
            } else {
                console.warn("[PrivyAuthBridge] No token in response:", response.data);
                return null;
            }
        } catch (error) {
            console.error("[PrivyAuthBridge] Failed to fetch token:", error);
            return null;
        }
    }, [isCustomAuthDisabled]);

    const handleAuthError = useCallback((error: any) => {
        console.error("[PrivyAuthBridge] Sync Error:", error);

        // Check for specific error indicating feature is disabled
        if (error?.message?.includes('External auth providers are not enabled') ||
            error?.toString().includes('External auth providers are not enabled') ||
            error?.message?.includes('JWT-based authentication is not enabled') ||
            error?.toString().includes('JWT-based authentication is not enabled')) {

            disableCustomAuth();
            toast.error("Privy Custom Auth Not Enabled", "This feature requires Custom authentication to be enabled in your Privy dashboard (paid plan).");
            return;
        }

        // Check for 401 Unauthorized which implies the same or bad token
        if (error?.response?.status === 401 || error?.status === 401) {
            // If we get a 401 from Privy on custom auth, it usually means the feature is off or token invalid
            // Safest to disable to prevent loop
            disableCustomAuth();
            toast.error("Authentication Sync Failed", "Could not verify custom token with Privy. Feature disabled.");
        }
    }, [toast, disableCustomAuth]);

    // Use the hook to sync state
    useSubscribeToJwtAuthWithFlag({
        isAuthenticated: isBackendAuthenticated && !isCustomAuthDisabled, // Stop trying if disabled
        isLoading: false,
        getExternalJwt,
        onError: handleAuthError,
    });

    return null;
};
