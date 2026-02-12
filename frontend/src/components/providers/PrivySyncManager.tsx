import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

// Module-level variable to track if sync is blocked for this session (prevents log spam)
// let isSyncBlocked = false;

export const PrivySyncManager = () => {
    // 1. Check if user is authenticated in OUR app
    // const authState = useAuthStore.getState();

    // 2. Monitor Privy State
    const { ready, authenticated, user } = usePrivy();

    useEffect(() => {
        console.log(`[PrivySyncManager] State Update: ready=${ready}, auth=${authenticated}, user=${user?.id}`);

        if (ready && authenticated && user) {
            console.log("[PrivySyncManager] User is fully authenticated with Privy:", user.id);
            // Here we could potentially sync with backend if needed, 
            // but Free Plan limits prevent "pushing" auth. 
        }
    }, [ready, authenticated, user]);

    // PRIVY FREE PLAN ADAPTATION
    // ---------------------------
    // Custom Auth (loginWithCustomToken) is NOT supported on the Free Plan.
    // We strictly rely on client-side auth (Email, Google, Wallet).
    // This component now just monitors state consistency but DOES NOT attempt to sync/mint tokens.

    return null;
};
