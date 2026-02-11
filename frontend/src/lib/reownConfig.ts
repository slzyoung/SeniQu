// import { createAppKit } from '@reown/appkit/react'
// import { SolanaAdapter } from '@reown/appkit-adapter-solana'
// import { mainnet, solana, solanaDevnet } from '@reown/appkit/networks'
// import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
// import { EthersAdapter } from '@reown/appkit-adapter-ethers'

// 1. Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Debug logging
console.log('[Reown] Initializing with Project ID:', projectId ? 'Beep Boop Hidden' : 'MISSING');
console.log('[Reown] Environment:', import.meta.env.MODE);

if (!projectId) {
    console.error('VITE_WALLETCONNECT_PROJECT_ID is not set in .env');
    // throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set') // Don't crash, just let Reown complain or use fallback
}

// 3. Create modal - COMMENTED OUT TO PREVENT CONFLICT WITH PRIVY
// Privy handles WalletConnect initialization internally via 'toSolanaWalletConnectors'
// export const appKit = createAppKit({ ... }) 

// Export dummy/null to satisfy imports if any, or just leave commented if unused.
// For now, let's keep the config but NOT initialize to see if that solves the specific error.
// Actually, 'createAppKit' HAS side effects.
export const appKit = null;

// Export hook for usage in components
// Export hook for usage in components
// export { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
export const useAppKit = () => ({ open: (options?: any) => console.log('Reown AppKit disabled (using Privy)', options) });
export const useAppKitAccount = () => ({ address: null, isConnected: false });
export const useAppKitProvider = (network?: string) => ({ walletProvider: null });
