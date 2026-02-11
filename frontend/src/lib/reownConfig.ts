import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solana, solanaDevnet } from '@reown/appkit/networks'
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'

// 1. Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Debug logging
console.log('[Reown] Initializing with Project ID:', projectId ? 'Beep Boop Hidden' : 'MISSING');
console.log('[Reown] Environment:', import.meta.env.MODE);

if (!projectId) {
    console.error('VITE_WALLETCONNECT_PROJECT_ID is not set in .env');
    // throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set') // Don't crash, just let Reown complain or use fallback
}

// 2. Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})

// 3. Create modal
// This is a singleton that can be imported and used anywhere
export const appKit = createAppKit({
    adapters: [solanaWeb3JsAdapter as any],
    networks: [solana, solanaDevnet],
    metadata: {
        name: 'Seniqu',
        description: 'Seniqu Art Platform',
        url: import.meta.env.VITE_APP_URL || 'https://seniqu.com',
        icons: ['https://seniqu.com/logo.png']
    },
    projectId,
    features: {
        analytics: true
    }
})

// Export hook for usage in components
export { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
