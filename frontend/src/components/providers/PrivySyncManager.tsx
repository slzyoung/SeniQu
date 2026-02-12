import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import api from '../../lib/api';

export const PrivySyncManager = () => {
    // Monitor Privy State
    const { ready, authenticated, user, getAccessToken } = usePrivy();

    useEffect(() => {
        const syncPrivyParams = async () => {
            if (ready && authenticated && user) {
                try {
                    // Get the Privy Access Token
                    const token = await getAccessToken();
                    if (token) {
                        // Sync with backend: This ensures the backend knows about the Privy ID and any linked wallet
                        // It also handles the case where the user created a wallet on the frontend
                        // and we need to link it to their backend account.
                        await api.post('/auth/privy', {}, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            // Skip our own auth interceptor which adds the backend JWT
                            __skipAuthInterceptor: true
                        } as any);

                        console.log("[PrivySyncManager] Synced Privy session with backend.");
                    }
                } catch (error) {
                    console.error("[PrivySyncManager] Sync failed:", error);
                }
            }
        };

        syncPrivyParams();
    }, [ready, authenticated, user, getAccessToken]);

    return null;
};
