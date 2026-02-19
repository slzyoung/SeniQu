import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, solana, solanaDevnet } from '@reown/appkit/networks'

import { EthersAdapter } from '@reown/appkit-adapter-ethers'

// 1. Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Debug logging
if (import.meta.env.DEV) {
    console.log('[Reown] Project ID:', projectId ? 'present' : 'MISSING');
}

if (!projectId) {
    console.error('VITE_WALLETCONNECT_PROJECT_ID is not set in .env');
}

// 2. Set up adapters
export const networks = [solana, solanaDevnet, mainnet]

// 3. Create modal (Eager Initialization)
// We initialize immediately to ensure hooks like useAppKit work in GlobalLayout/AuthModal.
// We DO NOT pass Phantom/Solflare adapters here to avoid them "probing" the window
// and causing auto-connect popups. We handle those wallets manually in useManualWallet.t
// s.
export const appKit = createAppKit({
    adapters: [
        new SolanaAdapter({
            wallets: [] // No injected wallets managed by Reown, only WalletConnect (QR)
        }),
        new EthersAdapter()
    ],
    networks: networks as any,
    projectId: projectId || 'c4f79cc821948d9e1718f2776358ba', // Fallback
    metadata: {
        name: 'Seniqu',
        description: 'Preserve and collect digital heritage.',
        url: 'https://seniqu.com',
        icons: ['https://seniqu.com/logo.png'],
    },
    features: {
        analytics: true,
        email: false,
        socials: [],
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#D4AF37', // Gold
        '--w3m-border-radius-master': '1px',
        '--w3m-font-family': 'Inter, sans-serif'
    }
});

// Export hooks
export { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

