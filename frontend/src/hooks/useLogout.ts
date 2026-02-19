/**
 * useLogout — Unified logout hook
 * 
 * Single source of truth for all logout flows across the app.
 * Handles: Privy logout, store cleanup, token removal, navigation,
 * and throttle protection against double-clicks.
 * 
 * SECURITY: Prevents PrivyAuthBridge re-login loop by setting
 * isLoggingOut flag before clearing Privy session.
 */

import { useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { ROUTES } from '../lib/constants';

/** Minimum ms between logout attempts (anti-throttle) */
const LOGOUT_THROTTLE_MS = 600;

interface UseLogoutOptions {
    /** Route to navigate after logout. Defaults to ROUTES.HOME */
    redirectTo?: string;
    /** Callback after logout completes */
    onComplete?: () => void;
}

export function useLogout(options: UseLogoutOptions = {}) {
    const { logout: privyLogout } = usePrivy();
    const { logout: storeLogout, setLoggingOut } = useAuthStore();
    const { setMobileMenuOpen } = useUIStore();
    const navigate = useNavigate();
    const isRunningRef = useRef(false);
    const lastCallRef = useRef(0);

    const handleLogout = useCallback(async () => {
        // Throttle guard — prevent double-click / rapid fire
        const now = Date.now();
        if (now - lastCallRef.current < LOGOUT_THROTTLE_MS) return;
        if (isRunningRef.current) return;

        lastCallRef.current = now;
        isRunningRef.current = true;

        try {
            // 1. Set flag FIRST — prevents PrivyAuthBridge from re-initiating login
            setLoggingOut(true);

            // 2. Close mobile menu if open
            setMobileMenuOpen(false);

            // 3. Logout from Privy (try/catch — errors must not block store cleanup)
            try {
                await privyLogout();
            } catch (err) {
                console.warn('[useLogout] Privy logout failed (non-blocking):', err);
            }

            // 4. Small settle delay for Privy cleanup
            await new Promise(resolve => setTimeout(resolve, 50));

            // 5. Clear backend tokens and store state (ALWAYS runs)
            storeLogout();

            // 6. Navigate away
            navigate(options.redirectTo ?? ROUTES.HOME, { replace: true });

            // 7. Optional callback
            options.onComplete?.();
        } finally {
            // 8. Clear the logging-out flag after everything settles
            // Use a short delay so PrivyAuthBridge effect cycle completes
            setTimeout(() => {
                setLoggingOut(false);
                isRunningRef.current = false;
            }, 300);
        }
    }, [privyLogout, storeLogout, setLoggingOut, setMobileMenuOpen, navigate, options]);

    return handleLogout;
}

export default useLogout;
