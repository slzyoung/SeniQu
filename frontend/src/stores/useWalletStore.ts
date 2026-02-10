/**
 * Wallet Store - Zustand store for managing wallet state
 * Supports Solana wallets via Privy.io
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalletType = 'phantom' | 'solflare' | 'metamask' | 'walletconnect' | 'embedded' | null;

interface WalletState {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    walletType: WalletType;

    // Wallet data
    address: string | null;
    shortAddress: string | null;
    balance: number | null;
    chain: 'solana' | 'ethereum' | null;

    // Embedded wallet (auto-created via Privy for Google/email users)
    hasEmbeddedWallet: boolean;
    embeddedAddress: string | null;

    // Actions
    setConnecting: (isConnecting: boolean) => void;
    connectWallet: (params: {
        address: string;
        walletType: WalletType;
        chain?: 'solana' | 'ethereum';
        isEmbedded?: boolean;
    }) => void;
    setBalance: (balance: number) => void;
    disconnectWallet: () => void;
    setEmbeddedWallet: (address: string) => void;
}

function shortenAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export const useWalletStore = create<WalletState>()(
    persist(
        (set) => ({
            // Initial state
            isConnected: false,
            isConnecting: false,
            walletType: null,
            address: null,
            shortAddress: null,
            balance: null,
            chain: null,
            hasEmbeddedWallet: false,
            embeddedAddress: null,

            // Actions
            setConnecting: (isConnecting) => set({ isConnecting }),

            connectWallet: ({ address, walletType, chain = 'solana', isEmbedded = false }) =>
                set({
                    isConnected: true,
                    isConnecting: false,
                    address,
                    shortAddress: shortenAddress(address),
                    walletType,
                    chain,
                    hasEmbeddedWallet: isEmbedded ? true : undefined,
                    embeddedAddress: isEmbedded ? address : undefined,
                }),

            setBalance: (balance) => set({ balance }),

            disconnectWallet: () =>
                set({
                    isConnected: false,
                    isConnecting: false,
                    walletType: null,
                    address: null,
                    shortAddress: null,
                    balance: null,
                    chain: null,
                }),

            setEmbeddedWallet: (address) =>
                set({
                    hasEmbeddedWallet: true,
                    embeddedAddress: address,
                }),
        }),
        {
            name: 'seniqu-wallet-store',
            partialize: (state) => ({
                address: state.address,
                shortAddress: state.shortAddress,
                walletType: state.walletType,
                chain: state.chain,
                hasEmbeddedWallet: state.hasEmbeddedWallet,
                embeddedAddress: state.embeddedAddress,
            }),
        }
    )
);
