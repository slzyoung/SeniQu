import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, solana, solanaDevnet } from '@reown/appkit/networks'
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'

// 1. Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Debug logging
console.log('[Reown] Initializing with Project ID:', projectId ? 'Beep Boop Hidden' : 'MISSING');
console.log('[Reown] Environment:', import.meta.env.MODE);

if (!projectId) {
    console.error('VITE_WALLETCONNECT_PROJECT_ID is not set in .env');
    // throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set') // Don't crash, just let Reown complain or use fallback
}

// 2. Set up adapters
export const networks = [solana, solanaDevnet, mainnet]

// 3. Create modal
// 3. Create modal (Singleton pattern with HMR support)
const globalAny: any = globalThis;

if (!globalAny._reownAppKit) {
    try {
        globalAny._reownAppKit = createAppKit({
            adapters: [
                new SolanaAdapter({
                    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
                }),
                new EthersAdapter()
            ],
            networks: networks as any,
            projectId: projectId || 'c4f79cc821948d9e1718f2776358ba', // Fallback
            features: {
                analytics: true,
                email: false, // Disable email, we use custom auth
                socials: [],
            },
            themeMode: 'dark',
            themeVariables: {
                '--w3m-accent': '#D4AF37', // Gold
                '--w3m-border-radius-master': '1px'
            }
        })
    } catch (e) {
        console.warn("[Reown] Failed to initialize or already initialized:", e);
    }
}

export const appKit = globalAny._reownAppKit;

// Export hook for usage in components
export { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

