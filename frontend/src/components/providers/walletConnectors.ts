import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// Singleton initialization of Solana connectors
// This separates the side-effect of initialization from the React component lifecycle
// helping to avoid "WalletConnect Core is already initialized" warnings during HMR/re-renders.

// Use a global variable to persist across HMR updates
let solanaConnectors: any;

// Type safety for the global object
const globalAny: any = globalThis;

// Initialize strictly once
// Initialize strictly once
if (!globalAny._seniquSolanaConnectors) {
    try {
        console.log('[WalletConnectors] Initializing Solana connectors...');
        globalAny._seniquSolanaConnectors = toSolanaWalletConnectors({
            shouldAutoConnect: false, // EXPLICITLY FALSE to prevent Solflare/Phantom popups
        });
        console.log('[WalletConnectors] Solana connectors initialized successfully.');
    } catch (error: any) {
        // Ignore "WalletConnect Core is already initialized" error
        // This happens during HMR or strict mode double-mount
        if (error?.message?.includes('WalletConnect Core is already initialized') ||
            error?.message?.includes('Init() was called')) {
            console.debug('[WalletConnectors] Core already initialized (HMR/Race Condition) - ignoring.');
        } else {
            console.warn('[WalletConnectors] Failed to initialize Solana connectors:', error);
            // Don't set it to empty array on error, leaving it undefined allows retry
        }
    }
} else {
    // console.debug('[WalletConnectors] Skipping initialization - already exists.');
}

solanaConnectors = globalAny._seniquSolanaConnectors;

export { solanaConnectors };
