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

// 3. Create modal (Lazy Lazy Singleton pattern)
const globalAny: any = globalThis;

// Initialize function rather than immediate execution
export const getAppKit = () => {
    // STRICT SINGLETON: Check if it already exists on window/global
    if (globalAny._reownAppKit) {
        return globalAny._reownAppKit;
    }

    try {
        console.log('[Reown] Initializing AppKit...');
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
                '--w3m-border-radius-master': '1px',
                '--w3m-font-family': 'Inter, sans-serif' // Match app font to prevent unused preload warning
            }
        });
    } catch (e: any) {
        // If it failed because it was already initialized (race condition), try to retrieve it
        if (e?.message?.includes('already initialized')) {
            console.warn("[Reown] AppKit already initialized, reusing instance.");
            // We can't easily "get" the instance if createAppKit threw, 
            // but usually it attaches to the DOM or global state. 
            // We'll just suppress the error to avoid crashing.
        } else {
            console.warn("[Reown] Failed to initialize AppKit:", e);
        }
    }

    return globalAny._reownAppKit;
};

// Execute immediately if not exists
if (!globalAny._reownAppKit) {
    getAppKit();
}


export const appKit = globalAny._reownAppKit;

// Export hook for usage in components
export { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

