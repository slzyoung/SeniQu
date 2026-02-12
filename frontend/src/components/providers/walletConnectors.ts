import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// Singleton initialization of Solana connectors
// This separates the side-effect of initialization from the React component lifecycle
// helping to avoid "WalletConnect Core is already initialized" warnings during HMR/re-renders.

// Use a global variable to persist across HMR updates
let solanaConnectors: any;

// Type safety for the global object
const globalAny: any = globalThis;

// Initialize strictly once
if (!globalAny._seniquSolanaConnectors) {
    try {
        // Double check before initializing to be safe against race conditions
        if (!globalAny._seniquSolanaConnectors) {
            console.log('[WalletConnectors] Initializing Solana connectors...');
            globalAny._seniquSolanaConnectors = toSolanaWalletConnectors({
                shouldAutoConnect: false,
            });
        }
    } catch (error: any) {
        // Ignore "WalletConnect Core is already initialized" error
        if (error?.message?.includes('WalletConnect Core is already initialized') ||
            error?.message?.includes('Init() was called')) {
            console.debug('[WalletConnectors] Core already initialized (HMR/Race Condition) - ignoring.');
        } else {
            console.warn('[WalletConnectors] Failed to initialize Solana connectors:', error);
            globalAny._seniquSolanaConnectors = [];
        }
    }
}

solanaConnectors = globalAny._seniquSolanaConnectors;

export { solanaConnectors };
