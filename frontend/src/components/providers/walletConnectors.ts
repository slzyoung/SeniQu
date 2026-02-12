import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// Singleton initialization of Solana connectors
// This separates the side-effect of initialization from the React component lifecycle
// helping to avoid "WalletConnect Core is already initialized" warnings during HMR/re-renders.

let solanaConnectors: any;

try {
    solanaConnectors = toSolanaWalletConnectors({
        // Do not auto-connect to phantom/solflare immediately, let Privy handle the flow
        shouldAutoConnect: false,
    });
} catch (error: any) {
    // Ignore "WalletConnect Core is already initialized" error in development
    // This happens during HMR (Hot Module Replacement)
    if (error.message && error.message.includes('WalletConnect Core is already initialized')) {
        // console.debug('[WalletConnectors] Core already initialized (HMR)');
    } else {
        console.warn('[WalletConnectors] Failed to initialize Solana connectors:', error);
    }
}

export { solanaConnectors };
