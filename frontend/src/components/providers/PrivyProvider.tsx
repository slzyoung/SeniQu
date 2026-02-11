import React from 'react';
import { PrivyProvider as PrivySDKProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

// ============================================================
// CHAIN DEFINITIONS
// ============================================================

/**
 * Solana chain definitions for Privy
 */
const solanaMainnet = {
    id: 101,
    name: 'Solana',
    network: 'mainnet-beta',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: {
        default: { http: ['https://api.mainnet-beta.solana.com'] },
    },
};

const solanaDevnet = {
    id: 102,
    name: 'Solana Devnet',
    network: 'devnet',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: {
        default: { http: ['https://api.devnet.solana.com'] },
    },
};

// ============================================================
// EXTERNAL WALLET CONNECTORS
// ============================================================

/**
 * Configure Solana external wallet connectors
 * Supports: Phantom, Solflare, Backpack, and other Solana wallets
 */
const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: false,
});

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;
// const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!PRIVY_APP_ID) {
    console.error('[PrivyProvider] VITE_PRIVY_APP_ID is not set in environment variables');
}

// ============================================================
// PRIVY PROVIDER COMPONENT
// ============================================================

interface PrivyProviderProps {
    children: React.ReactNode;
}

/**
 * PrivyProvider — Enterprise Wallet Integration
 *
 * Features:
 * - Privy embedded wallet (auto-created for email/Google users)
 * - External Solana wallets (Phantom, Solflare, Backpack)
 * - External EVM wallets (MetaMask, Coinbase Wallet)
 * - WalletConnect / Reown protocol for mobile deep-linking
 * - Multi-chain support (Solana + Ethereum)
 *
 * Security:
 * - Token verification handled by backend PrivyService (SDK-based)
 * - No private keys exposed to frontend
 * - Embedded wallets use Privy's secure enclave
 */
export const PrivyProvider: React.FC<PrivyProviderProps> = ({ children }) => {
    if (!PRIVY_APP_ID) {
        console.warn('[PrivyProvider] Running without Privy — wallet features disabled');
        return <>{children}</>;
    }

    return (
        <PrivySDKProvider
            appId={PRIVY_APP_ID}
            config={{
                // ============================================
                // APPEARANCE
                // ============================================
                appearance: {
                    theme: 'dark',
                    accentColor: '#D4AF37', // Seniqu gold
                    logo: '/logo.svg',
                    // Show both Solana and EVM wallets
                    walletChainType: 'ethereum-and-solana',
                    // Wallet list: auto-detect installed + popular options
                    walletList: [
                        'phantom',
                        'solflare',
                        'metamask',
                        'wallet_connect',
                        'coinbase_wallet',
                        'detected_solana_wallets',
                        'detected_ethereum_wallets',
                    ],
                    showWalletLoginFirst: false,
                },

                // ============================================
                // LOGIN METHODS
                // ============================================
                loginMethods: ['google', 'email', 'wallet'],

                // ============================================
                // EMBEDDED WALLETS
                // ============================================
                embeddedWallets: {
                    // Auto-create embedded wallets for ALL users
                    solana: {
                        createOnLogin: 'all-users',
                    },
                    ethereum: {
                        createOnLogin: 'all-users',
                    },
                },

                // ============================================
                // EXTERNAL WALLETS
                // ============================================
                externalWallets: {
                    solana: {
                        connectors: solanaConnectors,
                    },
                },

                // ============================================
                // WALLETCONNECT / REOWN
                // ============================================
                // Disable Privy's WalletConnect integration to avoid conflict with Reown AppKit
                // ...(WALLETCONNECT_PROJECT_ID && {
                //     walletConnectCloudProjectId: WALLETCONNECT_PROJECT_ID,
                // }),

                // ============================================
                // SUPPORTED CHAINS
                // ============================================
                supportedChains: [solanaMainnet, solanaDevnet],
                defaultChain: solanaMainnet,
            }}
        >
            {children}
        </PrivySDKProvider>
    );
};

// Alias for backward compatibility — App.tsx imports PrivyWrapper
export const PrivyWrapper = PrivyProvider;

export default PrivyProvider;
