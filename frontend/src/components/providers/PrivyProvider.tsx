/**
 * PrivyProvider - Wraps the app with Privy for Web3 wallet integration
 * Supports Solana chain, Google/email login with embedded wallets
 */

import React from 'react';
import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

interface PrivyWrapperProps {
    children: React.ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
    // If no Privy App ID is configured, render children without Privy
    if (!PRIVY_APP_ID || PRIVY_APP_ID.includes('jwks.json')) {
        console.warn('[Privy] No valid App ID configured. Wallet features will be limited.');
        return <>{children}</>;
    }

    return (
        <PrivyProviderBase
            appId={PRIVY_APP_ID}
            config={{
                // Login methods
                loginMethods: ['google', 'email', 'wallet'],

                // Appearance
                appearance: {
                    theme: 'dark',
                    accentColor: '#D4AF37', // Seniqu gold
                    logo: '/logo.svg',
                },

                // Embedded wallets
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },

                // Default chain
                defaultChain: {
                    id: 101, // Solana mainnet
                    name: 'Solana',
                    network: 'mainnet-beta',
                    nativeCurrency: {
                        name: 'SOL',
                        symbol: 'SOL',
                        decimals: 9,
                    },
                    rpcUrls: {
                        default: {
                            http: ['https://api.mainnet-beta.solana.com'],
                        },
                    },
                } as any,

                // Legal
                legal: {
                    termsAndConditionsUrl: '/terms',
                    privacyPolicyUrl: '/privacy',
                },
            }}
        >
            {children}
        </PrivyProviderBase>
    );
}

export default PrivyWrapper;
