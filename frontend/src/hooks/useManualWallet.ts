/**
 * useManualWallet — Direct Wallet Connection Hook (No Privy)
 *
 * Connects to wallet browser extensions (desktop) or mobile apps (via deep links)
 * directly, without going through Privy SDK. Handles the full auth flow:
 *
 * 1. Connect to wallet extension/app → get public address
 * 2. Request nonce from backend (POST /wallet/nonce)
 * 3. Prompt user to sign the nonce message
 * 4. Send signature to backend (POST /auth/wallet) → get JWT
 *
 * Security:
 * - Anti-throttling: rate-limited connections, debounced clicks
 * - Anti-hacking: nonce expiry, signature verification, sanitized errors
 * - Anti-replay: single-use nonces from backend
 */

import { useState, useCallback, useRef } from 'react';
import { walletService } from '../services/walletService';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';
import { useWalletStore } from '../stores/useWalletStore';
import { useToast } from '../stores/useNotificationStore';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute, isMobile, isWalletInAppBrowser } from '../lib/utils';
import { checkRateLimit } from '../lib/security';

// ============================================================
// TYPES
// ============================================================

export type ManualWalletType = 'phantom' | 'solflare' | 'metamask' | 'walletconnect';

export type WalletConnectionState =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'requesting-nonce'
    | 'awaiting-signature'
    | 'verifying'
    | 'authenticated'
    | 'error';

interface WalletProvider {
    publicKey?: { toString(): string; toBytes(): Uint8Array };
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect(): Promise<void>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    isConnected?: boolean;
    isPhantom?: boolean;
    isSolflare?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

/** Detect if a wallet extension is installed */
function getWalletProvider(walletType: ManualWalletType): WalletProvider | null {
    if (typeof window === 'undefined') return null;

    switch (walletType) {
        case 'phantom': {
            const solana = (window as any).solana;
            if (solana?.isPhantom) return solana;
            // Also check window.phantom.solana
            const phantom = (window as any).phantom?.solana;
            if (phantom?.isPhantom) return phantom;
            return null;
        }
        case 'solflare': {
            const solflare = (window as any).solflare;
            if (solflare?.isSolflare) return solflare;
            return null;
        }
        case 'metamask': {
            const ethereum = (window as any).ethereum;
            if (ethereum?.isMetaMask) return null; // MetaMask is EVM, handled differently
            return null;
        }
        default:
            return null;
    }
}

/** Get MetaMask provider (EVM-specific) - Handles Phantom & Coinbase interference */
function getMetaMaskProvider(): any {
    if (typeof window === 'undefined') return null;
    const ethereum = (window as any).ethereum;

    if (!ethereum) return null;

    // 1. Check if multiple providers are injected (EIP-6963 style or legacy array)
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
        // Find the one that is strictly MetaMask and NOT others
        const metaMask = ethereum.providers.find((p: any) =>
            p.isMetaMask && !p.isPhantom && !p.isCoinbaseWallet && !p.isWalletLink
        );
        if (metaMask) return metaMask;
    }

    // 2. Check standard injection
    // Explicitly check it is NOT Phantom, Coinbase, or WalletLink
    if (ethereum.isMetaMask && !ethereum.isPhantom && !ethereum.isCoinbaseWallet && !ethereum.isWalletLink) {
        return ethereum;
    }

    return null;
}

/** Check if wallet extension is installed */
export function isWalletInstalled(walletType: ManualWalletType): boolean {
    if (walletType === 'walletconnect') return true; // Always available
    if (walletType === 'metamask') return !!getMetaMaskProvider();
    return !!getWalletProvider(walletType);
}

/** Convert Uint8Array to base64 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Get wallet deep link for mobile */
function getMobileDeepLink(walletType: ManualWalletType): string | null {
    const currentUrl = encodeURIComponent(window.location.href);
    const host = window.location.host;

    switch (walletType) {
        case 'phantom':
            return `https://phantom.app/ul/browse/${currentUrl}?ref=${encodeURIComponent(host)}`;
        case 'solflare':
            return `https://solflare.com/ul/v1/browse/${currentUrl}?ref=${encodeURIComponent(host)}`;
        case 'metamask':
            return `https://metamask.app.link/dapp/${host}${window.location.pathname}`;
        default:
            return null;
    }
}

/** Get wallet install URL */
function getWalletInstallUrl(walletType: ManualWalletType): string {
    switch (walletType) {
        case 'phantom':
            return 'https://phantom.app/download';
        case 'solflare':
            return 'https://solflare.com/download';
        case 'metamask':
            return 'https://metamask.io/download';
        default:
            return '';
    }
}

// ============================================================
// RATE LIMIT CONFIG
// ============================================================

const WALLET_RATE_LIMITS = {
    connect: { key: 'wallet_manual_connect', max: 5, window: 60000 },
    sign: { key: 'wallet_manual_sign', max: 3, window: 60000 },
};

// ============================================================
// HOOK
// ============================================================

export function useManualWallet() {
    const [state, setState] = useState<WalletConnectionState>('idle');
    const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
    const [activeWalletType, setActiveWalletType] = useState<ManualWalletType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const storeLogin = useAuthStore((s) => s.login);
    const walletStore = useWalletStore();
    const toast = useToast();
    const navigate = useNavigate();

    // Guards against concurrent operations
    const isProcessingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Reset to idle state
     */
    const reset = useCallback(() => {
        setState('idle');
        setConnectedAddress(null);
        setActiveWalletType(null);
        setError(null);
        isProcessingRef.current = false;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Connect to a Solana wallet extension (Phantom/Solflare)
     */
    const connectSolanaWallet = useCallback(async (
        walletType: 'phantom' | 'solflare'
    ): Promise<{ address: string; signMessage: (msg: Uint8Array) => Promise<Uint8Array> }> => {
        const provider = getWalletProvider(walletType);

        if (!provider) {
            throw new Error(`${walletType === 'phantom' ? 'Phantom' : 'Solflare'} wallet not found. Please install the extension.`);
        }

        try {
            // Connect to wallet
            // Solflare: provider.connect() resolves to void? check docs.
            // Usually we check provider.publicKey after connect.
            const result = await provider.connect();

            // Handle different response structures
            const publicKey = provider.publicKey || (result as any)?.publicKey;

            if (!publicKey) {
                // If deep linking on mobile, it might not return immediately?
                // But for in-app browser, it should.
                throw new Error(`Failed to get public key from ${walletType}`);
            }

            const address = publicKey.toString();
            console.log(`[ManualWallet] Connected address: ${address}`);

            // Return address and a sign function
            return {
                address,
                signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
                    try {
                        console.log(`[ManualWallet] Asking ${walletType} to sign message (${message.length} bytes)`);
                        let signResult;

                        // Phantom and Solflare handle signMessage differently in some environments
                        if (walletType === 'phantom') {
                            // Phantom: Standard single argument (Uint8Array)
                            // Passing extra arguments can cause issues or UI hangs
                            signResult = await provider.signMessage(message);
                        } else {
                            // Solflare: Suggest 'utf8' encoding to avoid "Invalid Transaction" errors
                            // especially on mobile adapters which might misinterpret raw bytes
                            signResult = await (provider as any).signMessage(message, 'utf8');
                        }

                        console.log(`[ManualWallet] Got sign result type:`, signResult?.constructor?.name);

                        // Robustly extract signature
                        let rawSig: any;
                        if (signResult instanceof Uint8Array) {
                            rawSig = signResult;
                        } else if (signResult && typeof signResult === 'object' && 'signature' in signResult) {
                            rawSig = signResult.signature;
                        } else {
                            rawSig = signResult;
                        }

                        // Enforce Uint8Array conversion (handles plain arrays, Buffers, etc.)
                        const finalSig = new Uint8Array(rawSig);

                        if (finalSig.length === 0) {
                            throw new Error("Signature is empty");
                        }

                        console.log(`[ManualWallet] Signature extracted successfully (${finalSig.length} bytes)`);
                        return finalSig;

                    } catch (err: any) {
                        console.error(`${walletType} signing error details:`, err);
                        throw new Error(`Signing failed: ${err.message}`);
                    }
                },
            };
        } catch (err: any) {
            console.error(`${walletType} connect error:`, err);
            throw err;
        }
    }, []);

    /**
     * Connect to MetaMask (EVM wallet, uses personal_sign for Solana nonce)
     */
    const connectMetaMask = useCallback(async (): Promise<{
        address: string;
        signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
    }> => {
        const ethereum = getMetaMaskProvider();

        if (!ethereum) {
            throw new Error('MetaMask not found. Please install the MetaMask extension.');
        }

        try {
            // Request account access
            const accounts = await ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found in MetaMask.');
            }

            const address = accounts[0];

            return {
                address,
                signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
                    const msgHex = '0x' + Array.from(message)
                        .map((b: number) => b.toString(16).padStart(2, '0'))
                        .join('');

                    try {
                        const signature = await ethereum.request({
                            method: 'personal_sign',
                            params: [msgHex, address],
                        });

                        // Convert hex signature to Uint8Array
                        const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
                        const bytes = new Uint8Array(sig.length / 2);
                        for (let i = 0; i < sig.length; i += 2) {
                            bytes[i / 2] = parseInt(sig.substr(i, 2), 16);
                        }
                        return bytes;
                    } catch (err: any) {
                        console.error('MetaMask signMessage error:', err);
                        throw err;
                    }
                },
            };
        } catch (err: any) {
            console.error('MetaMask connect error:', err);
            throw err;
        }
    }, []);

    /**
     * Full wallet login flow:
     * connect → request nonce → sign → verify → authenticate
     */
    const connectAndLogin = useCallback(async (walletType: ManualWalletType) => {
        // Anti-throttling: prevent concurrent operations
        if (isProcessingRef.current) return;

        // Rate limit check
        const rl = checkRateLimit(WALLET_RATE_LIMITS.connect.key, WALLET_RATE_LIMITS.connect.max, WALLET_RATE_LIMITS.connect.window);
        if (!rl.allowed) {
            const seconds = Math.ceil((rl.retryAfter || 60000) / 1000);
            setError(`Too many attempts. Please wait ${seconds} seconds.`);
            toast.error('Rate Limited', `Please wait ${seconds} seconds before trying again.`);
            return;
        }

        isProcessingRef.current = true;
        setError(null);
        setActiveWalletType(walletType);

        const isMobileDevice = isMobile();
        const inAppBrowser = isWalletInAppBrowser();

        // --- MOBILE DEEP LINKING ---
        // If on mobile and NOT inside a wallet browser, redirect to the wallet app
        // EXCEPTION: WalletConnect uses its own modal/link
        if (isMobileDevice && !inAppBrowser && walletType !== 'walletconnect') {
            const deepLink = getMobileDeepLink(walletType);
            if (deepLink) {
                setState('connecting');
                // Small delay to allow UI to update before redirect
                setTimeout(() => {
                    window.location.href = deepLink;
                }, 500);
                isProcessingRef.current = false;
                return;
            }
        }

        try {
            // === STEP 1: Connect to wallet ===
            setState('connecting');

            let address: string;
            let signMessage: (msg: Uint8Array) => Promise<Uint8Array>;

            if (walletType === 'walletconnect') {
                // WalletConnect is handled via AuthModal directly calling Privy or Reown
                // We return a special error or status so UI knows to trigger that flow?
                // Or better: we throw a specific error that isn't really an error.
                // For now, let's keep the existing error but make it clearer
                isProcessingRef.current = false;
                setState('idle');
                return null; // Return null to indicate "handled elsewhere" or "no-op"
            } else if (walletType === 'metamask') {
                // Check if installed
                if (!isWalletInstalled('metamask') && !isMobileDevice) {
                    const installUrl = getWalletInstallUrl('metamask');
                    setError('MetaMask not installed.');
                    toast.error('MetaMask Not Found', 'Please install MetaMask extension.');
                    window.open(installUrl, '_blank');
                    setState('error');
                    isProcessingRef.current = false;
                    return;
                }
                const result = await connectMetaMask();
                address = result.address;
                signMessage = result.signMessage;
            } else {
                // Phantom / Solflare
                if (!isWalletInstalled(walletType) && !isMobileDevice) {
                    const walletName = walletType === 'phantom' ? 'Phantom' : 'Solflare';
                    const installUrl = getWalletInstallUrl(walletType);
                    setError(`${walletName} not installed.`);
                    toast.error(`${walletName} Not Found`, `Please install ${walletName} wallet.`);
                    window.open(installUrl, '_blank');
                    setState('error');
                    isProcessingRef.current = false;
                    return;
                }
                const result = await connectSolanaWallet(walletType);
                address = result.address;
                signMessage = result.signMessage;
            }

            setState('connected');
            setConnectedAddress(address);

            // === STEP 2: Request nonce from backend ===
            setState('requesting-nonce');

            const chain = walletType === 'metamask' ? 'ethereum' : 'solana';
            const nonceResponse = await walletService.requestNonce(address, chain);

            // === STEP 3: Sign the nonce message ===
            setState('awaiting-signature');

            // Helpful toast for user
            toast.info('Sign Message', 'Please check your wallet to sign the verification message.');

            // Rate limit signing
            const signRl = checkRateLimit(WALLET_RATE_LIMITS.sign.key, WALLET_RATE_LIMITS.sign.max, WALLET_RATE_LIMITS.sign.window);
            if (!signRl.allowed) {
                throw new Error('Too many signing attempts. Please wait.');
            }

            const messageBytes = new TextEncoder().encode(nonceResponse.message);
            const signatureBytes = await signMessage(messageBytes);
            const signatureBase64 = uint8ArrayToBase64(signatureBytes);

            // === STEP 4: Verify and authenticate ===
            setState('verifying');

            const authResponse = await authService.authenticateWithWallet(
                address,
                signatureBase64,
                nonceResponse.nonce,
                chain,
            );

            // === STEP 5: Handle Authentication ===
            setState('authenticated');

            // If new user, return without storing login state (must complete profile first)
            if (authResponse.isNewUser) {
                return authResponse;
            }

            // Existing user - store state and redirect
            storeLogin(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
            walletStore.setConnected(address, chain, walletType);

            toast.success('Welcome!', `Connected with ${walletType === 'phantom' ? 'Phantom' : walletType === 'solflare' ? 'Solflare' : walletType === 'metamask' ? 'MetaMask' : 'WalletConnect'}`);

            const redirectPath = getDashboardRoute(authResponse.user.role);
            navigate(redirectPath);

            return authResponse;

        } catch (err: any) {
            console.error('[useManualWallet] Error:', err);

            // Detect user rejection
            const isUserRejection =
                err?.message?.toLowerCase().includes('rejected') ||
                err?.message?.toLowerCase().includes('user rejected') ||
                err?.message?.toLowerCase().includes('user denied') ||
                err?.message?.toLowerCase().includes('cancelled') ||
                err?.message?.toLowerCase().includes('user closed') ||
                err?.code === 4001 ||
                err?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                toast.info('Cancelled', 'You cancelled the wallet connection.');
                setError(null);
            } else {
                const sanitizedMessage = err?.message || 'Connection failed. Please try again.';
                // Don't leak internal error details
                const userMessage = sanitizedMessage.length > 100
                    ? 'Connection failed. Please try again.'
                    : sanitizedMessage;
                setError(userMessage);
                toast.error('Connection Failed', userMessage);
            }

            setState('error');
        } finally {
            isProcessingRef.current = false;
        }
    }, [connectSolanaWallet, connectMetaMask, storeLogin, walletStore, toast, navigate]);

    /**
     * Login using an existing provider (e.g. from Reown AppKit)
     * Skips connection step, proceeds to Sign -> Auth
     */
    const loginWithProvider = useCallback(async (address: string, provider: any, chain: string = 'solana') => {
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        setError(null);
        setState('requesting-nonce');
        setConnectedAddress(address);

        try {
            // === STEP 1: Request nonce ===
            const nonceResponse = await walletService.requestNonce(address, chain);

            // === STEP 2: Sign Message ===
            setState('awaiting-signature');

            const messageBytes = new TextEncoder().encode(nonceResponse.message);
            let signatureBytes: Uint8Array;

            // Handle Reown Provider / Standard Provider
            if (provider.signMessage) {
                const result = await provider.signMessage(messageBytes);
                // Some providers return object { signature: ... }, others return signature directly
                signatureBytes = result.signature || result;
            } else {
                throw new Error('Provider does not support signMessage');
            }

            const signatureBase64 = uint8ArrayToBase64(signatureBytes);

            // === STEP 3: Verify & Authenticate ===
            setState('verifying');
            const authResponse = await authService.authenticateWithWallet(
                address,
                signatureBase64,
                nonceResponse.nonce,
                chain
            );

            setState('authenticated');

            if (authResponse.isNewUser) {
                return authResponse;
            }

            // Existing user
            storeLogin(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
            // We assume Reown manages connection state, but we can sync local store if needed
            // walletStore.setConnected(address, chain, 'walletconnect'); 

            toast.success('Welcome!', 'Connected via WalletConnect');
            const redirectPath = getDashboardRoute(authResponse.user.role);
            navigate(redirectPath);

            return authResponse;

        } catch (err: any) {
            console.error('LoginWithProvider Error:', err);
            // Detect user rejection
            if (err?.message?.includes('rejected')) {
                toast.info('Cancelled', 'Signature request rejected');
            } else {
                toast.error('Login Failed', err?.message || 'Failed to authenticate');
                setError(err?.message);
            }
            setState('error');
        } finally {
            isProcessingRef.current = false;
        }

    }, [storeLogin, walletStore, toast, navigate]);

    return {
        // State
        state,
        connectedAddress,
        activeWalletType,
        error,

        // Actions
        connectAndLogin,
        reset,
        loginWithProvider, // Export new function

        isProcessing: isProcessingRef.current,
        isWalletInstalled,
        getWalletInstallUrl,
    };
}

export default useManualWallet;
