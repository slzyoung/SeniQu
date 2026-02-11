import { useSyncJwtBasedAuthState } from '@privy-io/react-auth';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';

// Module-level variable to track if sync is blocked for this session (prevents log spam)
let isSyncBlocked = false;

export const PrivySyncManager = () => {
    useSyncJwtBasedAuthState({
        getExternalJwt: async () => {
            // 1. Check if user is authenticated in OUR app
            const authState = useAuthStore.getState();
            if (!authState.isAuthenticated) {
                return undefined;
            }

            // 0. Check module-level block (fastest check to stop spam)
            if (isSyncBlocked) {
                return undefined;
            }

            // 2. Rate Limiting / Circuit Breaker
            const NOW = Date.now();
            const STORAGE_KEY_TIME = 'privy_last_sync_time';
            const STORAGE_KEY_COUNT = 'privy_sync_attempts';

            const lastTime = parseInt(sessionStorage.getItem(STORAGE_KEY_TIME) || '0', 10);
            const attempts = parseInt(sessionStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);

            // If last attempt was less than 5 seconds ago, it's a rapid retry loop
            if (NOW - lastTime < 5000) {
                const newAttempts = attempts + 1;
                sessionStorage.setItem(STORAGE_KEY_COUNT, newAttempts.toString());
                sessionStorage.setItem(STORAGE_KEY_TIME, NOW.toString());

                if (newAttempts > 3) {
                    console.error('[PrivySyncManager] 🛑 Infinite Auth Loop Detected (Rapid Retries). Sync blocked for this session.');
                    isSyncBlocked = true; // Block in memory
                    return undefined; // Stop the loop
                }
            } else {
                // Reset counter if enough time passed (normal behavior)
                sessionStorage.setItem(STORAGE_KEY_COUNT, '1');
                sessionStorage.setItem(STORAGE_KEY_TIME, NOW.toString());
            }

            try {
                // 3. Fetch Token
                const { privyToken } = await authService.getPrivySyncToken();
                console.log('[PrivySyncManager] Fetched Privy Sync Token');

                return privyToken || undefined;
            } catch (error) {
                console.error('[PrivySyncManager] Failed to get sync token', error);
                return undefined;
            }
        },
        // Subscribe to App Auth State changes
        subscribe: (onChange) => {
            const unsub = useAuthStore.subscribe((state, prevState) => {
                // If authentication state passes from false->true or true->false, or user changes
                if (
                    state.isAuthenticated !== prevState.isAuthenticated ||
                    state.user?.id !== prevState.user?.id
                ) {
                    onChange();
                }
            });
            return unsub;
        },
        enabled: true,
    });

    return null;
};
