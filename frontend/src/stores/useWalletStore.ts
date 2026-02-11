import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type WalletType = 'phantom' | 'solflare' | 'metamask' | 'walletconnect' | 'backpack' | 'coinbase' | 'embedded' | 'other';
export type ChainType = 'solana' | 'ethereum' | 'polygon';

export interface WalletConnection {
    id: string;
    address: string;
    chain: ChainType;
    provider: WalletType;
    label?: string;
    isPrimary: boolean;
    isEmbedded: boolean;
}

interface WalletState {
    // Connection state
    status: WalletConnectionStatus;
    address: string | null;
    chain: ChainType;
    walletType: WalletType;
    balance: number;

    // Embedded wallet
    embeddedAddress: string | null;
    hasEmbeddedWallet: boolean;

    // Multi-wallet connections
    connections: WalletConnection[];

    // Error state
    error: string | null;

    // Actions
    setConnecting: () => void;
    setConnected: (address: string, chain: string, walletType: string) => void;
    setBalance: (balance: number) => void;
    setError: (error: string) => void;
    disconnect: () => void;
    setEmbeddedWallet: (address: string) => void;
    setConnections: (connections: WalletConnection[]) => void;
    addConnection: (connection: WalletConnection) => void;
    removeConnection: (id: string) => void;
    reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
    status: 'disconnected' as WalletConnectionStatus,
    address: null as string | null,
    chain: 'solana' as ChainType,
    walletType: 'other' as WalletType,
    balance: 0,
    embeddedAddress: null as string | null,
    hasEmbeddedWallet: false,
    connections: [] as WalletConnection[],
    error: null as string | null,
};

// ============================================================
// STORE
// ============================================================

export const useWalletStore = create<WalletState>()(
    persist(
        (set) => ({
            ...initialState,

            setConnecting: () =>
                set({ status: 'connecting', error: null }),

            setConnected: (address: string, chain: string, walletType: string) =>
                set({
                    status: 'connected',
                    address,
                    chain: (chain || 'solana') as ChainType,
                    walletType: (walletType || 'other') as WalletType,
                    error: null,
                }),

            setBalance: (balance: number) =>
                set({ balance }),

            setError: (error: string) =>
                set({ status: 'error', error }),

            disconnect: () =>
                set({
                    status: 'disconnected',
                    address: null,
                    balance: 0,
                    walletType: 'other',
                    error: null,
                }),

            setEmbeddedWallet: (address: string) =>
                set({
                    embeddedAddress: address,
                    hasEmbeddedWallet: true,
                }),

            setConnections: (connections: WalletConnection[]) =>
                set({ connections }),

            addConnection: (connection: WalletConnection) =>
                set((state) => ({
                    connections: [...state.connections, connection],
                })),

            removeConnection: (id: string) =>
                set((state) => ({
                    connections: state.connections.filter((c) => c.id !== id),
                })),

            reset: () => set(initialState),
        }),
        {
            name: 'seniqu-wallet-store',
            partialize: (state) => ({
                address: state.address,
                chain: state.chain,
                walletType: state.walletType,
                embeddedAddress: state.embeddedAddress,
                hasEmbeddedWallet: state.hasEmbeddedWallet,
            }),
        },
    ),
);

export default useWalletStore;
