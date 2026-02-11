import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { useWalletStore } from '../stores/useWalletStore';
import { useAuthStore } from '../stores/useAuthStore';
import walletService from '../services/walletService';
import type { WalletConnection } from '../services/walletService';

// ============================================================
// TYPES
// ============================================================

export type WalletType = 'embedded' | 'phantom' | 'solflare' | 'metamask' | 'walletconnect' | 'backpack' | 'coinbase' | 'other';
export type ChainType = 'solana' | 'ethereum' | 'polygon';

export interface WalletInfo {
    address: string;
    chain: ChainType;
    type: WalletType;
    isEmbedded: boolean;
    label?: string;
}

// ============================================================
// PLATFORM DETECTION
// ============================================================

const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
    );
};

const hasExtension = (name: string): boolean => {
    if (typeof window === 'undefined') return false;
    switch (name) {
        case 'phantom':
            return !!(window as any)?.solana?.isPhantom;
        case 'solflare':
            return !!(window as any)?.solflare?.isSolflare;
        case 'metamask':
            return !!(window as any)?.ethereum?.isMetaMask;
        case 'backpack':
            return !!(window as any)?.backpack;
        case 'coinbase':
            return !!(window as any)?.ethereum?.isCoinbaseWallet;
        default:
            return false;
    }
};

// ============================================================
// MAIN HOOK
// ============================================================

/**
 * useWallet — Comprehensive Wallet Management Hook
 *
 * Integrates Privy's embedded wallets with external wallet providers
 * for a unified wallet experience across desktop and mobile.
 *
 * Usage:
 * ```tsx
 * const { connect, disconnect, address, isConnected, walletType } = useWallet();
 * ```
 */
export function useWallet() {
    const { login, logout, authenticated, user, ready, connectWallet } = usePrivy();
    const { wallets: privyWallets } = useWallets();
    const { wallets: solanaWallets } = useSolanaWallets();

    const walletStore = useWalletStore();
    const authStore = useAuthStore();

    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [connections, setConnections] = useState<WalletConnection[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);

    // ============================================
    // DERIVED STATE
    // ============================================

    const isMobile = useMemo(() => isMobileDevice(), []);

    /**
     * Get the embedded wallet (created by Privy for email/Google users)
     */
    const embeddedWallet = useMemo(() => {
        if (!privyWallets || privyWallets.length === 0) return null;
        return privyWallets.find((w) => w.walletClientType === 'privy') || null;
    }, [privyWallets]);

    /**
     * Get all external wallets (Phantom, MetaMask, etc.)
     */
    const externalWallets = useMemo(() => {
        if (!privyWallets) return [];
        return privyWallets.filter((w) => w.walletClientType !== 'privy');
    }, [privyWallets]);

    /**
     * Get the active wallet (embedded or first external)
     */
    const activeWallet = useMemo(() => {
        if (embeddedWallet) return embeddedWallet;
        if (externalWallets.length > 0) return externalWallets[0];
        if (solanaWallets.length > 0) return solanaWallets[0];
        return null;
    }, [embeddedWallet, externalWallets, solanaWallets]);

    /**
     * Current wallet address
     */
    const address = useMemo(() => {
        return activeWallet?.address || walletStore.address || null;
    }, [activeWallet, walletStore.address]);

    /**
     * Connection status
     */
    const isConnected = useMemo(() => {
        return !!(authenticated && (address || privyWallets.length > 0));
    }, [authenticated, address, privyWallets]);

    /**
     * Determine wallet type
     */
    const walletType = useMemo((): WalletType => {
        if (!activeWallet) return 'other';
        const clientType = activeWallet.walletClientType;
        if (clientType === 'privy') return 'embedded';
        if (clientType === 'phantom') return 'phantom';
        if (clientType === 'solflare') return 'solflare';
        if (clientType === 'metamask') return 'metamask';
        if (clientType === 'wallet_connect' || clientType === 'walletconnect') return 'walletconnect';
        if (clientType === 'coinbase_wallet') return 'coinbase';
        return 'other';
    }, [activeWallet]);

    /**
     * Detect which wallets are available
     */
    const availableWallets = useMemo(() => {
        const wallets: { name: string; type: WalletType; available: boolean; isMobileApp: boolean }[] = [
            {
                name: 'Phantom',
                type: 'phantom',
                available: hasExtension('phantom') || isMobile,
                isMobileApp: isMobile,
            },
            {
                name: 'Solflare',
                type: 'solflare',
                available: hasExtension('solflare') || isMobile,
                isMobileApp: isMobile,
            },
            {
                name: 'MetaMask',
                type: 'metamask',
                available: hasExtension('metamask') || isMobile,
                isMobileApp: isMobile,
            },
            {
                name: 'Backpack',
                type: 'backpack',
                available: hasExtension('backpack'),
                isMobileApp: false,
            },
            {
                name: 'WalletConnect',
                type: 'walletconnect',
                available: true, // Always available (QR code / deep link)
                isMobileApp: isMobile,
            },
        ];
        return wallets;
    }, [isMobile]);

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Connect wallet — triggers Privy's wallet connection UI
     */
    const connect = useCallback(async () => {
        try {
            setLinkError(null);

            if (!authenticated) {
                // If not logged in, trigger full Privy login
                login();
                return;
            }

            // If already authenticated, open wallet connector
            connectWallet();
        } catch (err: any) {
            setLinkError(err.message || 'Failed to connect wallet');
            console.error('[useWallet] Connect error:', err);
        }
    }, [authenticated, login, connectWallet]);

    /**
     * Disconnect wallet and cleanup
     */
    const disconnect = useCallback(async () => {
        try {
            walletStore.disconnect();
            setConnections([]);

            if (authenticated) {
                await logout();
            }
        } catch (err: any) {
            console.error('[useWallet] Disconnect error:', err);
        }
    }, [authenticated, logout, walletStore]);

    /**
     * Sign a message with the active wallet
     */
    const signMessage = useCallback(async (message: string): Promise<string | null> => {
        if (!activeWallet) {
            throw new Error('No active wallet');
        }

        try {
            // Privy wallets have a signMessage method
            if ('signMessage' in activeWallet && typeof activeWallet.signMessage === 'function') {
                const signature = await activeWallet.signMessage(
                    new TextEncoder().encode(message),
                );
                // Convert to base64 for transport
                if (signature instanceof Uint8Array) {
                    return Buffer.from(signature).toString('base64');
                }
                return String(signature);
            }

            throw new Error('Wallet does not support message signing');
        } catch (err: any) {
            console.error('[useWallet] Sign message error:', err);
            throw err;
        }
    }, [activeWallet]);

    /**
     * Link the current wallet to the backend account
     * Uses nonce-based signature verification
     */
    const linkWalletToAccount = useCallback(async (chain: ChainType = 'solana') => {
        if (!address || !activeWallet) {
            throw new Error('No wallet connected');
        }

        if (!authStore.isAuthenticated) {
            throw new Error('Must be logged in to link wallet');
        }

        setIsLinking(true);
        setLinkError(null);

        try {
            // Step 1: Request nonce from backend
            const { nonce, message } = await walletService.requestNonce(address, chain);

            // Step 2: Sign the nonce message with the wallet
            const signature = await signMessage(message);
            if (!signature) {
                throw new Error('Failed to sign message');
            }

            // Step 3: Link wallet with verified signature
            const result = await walletService.linkWallet({
                walletAddress: address,
                chain,
                provider: walletType,
                signature,
                nonce,
                isEmbedded: walletType === 'embedded',
                isPrimary: connections.length === 0,
            });

            // Step 4: Update local state
            walletStore.setConnected(address, chain, walletType);

            // Refresh connections
            await fetchConnections();

            return result;
        } catch (err: any) {
            setLinkError(err.message || 'Failed to link wallet');
            throw err;
        } finally {
            setIsLinking(false);
        }
    }, [address, activeWallet, authStore.isAuthenticated, walletType, connections, signMessage, walletStore]);

    /**
     * Unlink a wallet from the account
     */
    const unlinkWallet = useCallback(async (walletId: string) => {
        try {
            await walletService.unlinkWallet(walletId);
            setConnections((prev) => prev.filter((c) => c.id !== walletId));
        } catch (err: any) {
            console.error('[useWallet] Unlink error:', err);
            throw err;
        }
    }, []);

    /**
     * Fetch wallet connections from backend
     */
    const fetchConnections = useCallback(async () => {
        if (!authStore.isAuthenticated) return;

        setIsLoadingConnections(true);
        try {
            const { wallets } = await walletService.getConnections();
            setConnections(wallets);
        } catch (err: any) {
            console.error('[useWallet] Fetch connections error:', err);
        } finally {
            setIsLoadingConnections(false);
        }
    }, [authStore.isAuthenticated]);

    // ============================================
    // EFFECTS
    // ============================================

    /**
     * Sync Privy wallet state with local store
     */
    useEffect(() => {
        if (activeWallet && authenticated) {
            walletStore.setConnected(
                activeWallet.address,
                activeWallet.chainId?.includes('solana') ? 'solana' : 'ethereum',
                walletType,
            );
        }
    }, [activeWallet, authenticated, walletType]);

    /**
     * Auto-link embedded wallet when created
     */
    useEffect(() => {
        if (embeddedWallet && authStore.isAuthenticated && authenticated) {
            const chain = embeddedWallet.chainId?.includes('solana') ? 'solana' : 'ethereum';
            walletService
                .linkEmbeddedWallet(embeddedWallet.address, chain)
                .catch((err) => {
                    // Ignore "already linked" errors
                    if (!err.message?.includes('already linked')) {
                        console.error('[useWallet] Auto-link embedded error:', err);
                    }
                });
        }
    }, [embeddedWallet, authStore.isAuthenticated, authenticated]);

    /**
     * Fetch connections on auth
     */
    useEffect(() => {
        if (authStore.isAuthenticated) {
            fetchConnections();
        }
    }, [authStore.isAuthenticated, fetchConnections]);

    // ============================================
    // RETURN
    // ============================================

    return {
        // State
        isConnected,
        isReady: ready,
        address,
        chain: activeWallet?.chainId?.includes('solana') ? 'solana' as ChainType : 'ethereum' as ChainType,
        walletType,
        balance: walletStore.balance,

        // Wallet references
        embeddedWallet,
        externalWallets,
        activeWallet,
        privyWallets,
        solanaWallets,

        // Connections (from backend)
        connections,
        isLoadingConnections,

        // Link state
        isLinking,
        linkError,

        // Actions
        connect,
        disconnect,
        signMessage,
        linkWalletToAccount,
        unlinkWallet,
        fetchConnections,

        // Platform
        isMobile,
        availableWallets,

        // Privy state
        authenticated,
        user,
    };
}

export default useWallet;
