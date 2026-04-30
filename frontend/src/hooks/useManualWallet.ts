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

// EIP-6963 Types
interface EIP6963ProviderInfo {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
}

interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
    detail: {
        info: EIP6963ProviderInfo;
        provider: any;
    };
}

// ============================================================
// HELPERS
// ============================================================

/** Detect if a wallet extension is installed */
function getWalletProvider(walletType: ManualWalletType): WalletProvider | null {
    if (typeof window === 'undefined') return null;

    // Mobile In-App Browser Detection
    // Many wallets inject a generic 'window.solana' or 'window.ethereum' regardless of who they are.
    const isMobileInApp = isWalletInAppBrowser();

    switch (walletType) {
        case 'phantom': {
            // Phantom checks
            const solana = (window as any).solana;
            if (solana?.isPhantom) return solana;

            // Phantom also injects window.phantom.solana
            const phantom = (window as any).phantom?.solana;
            if (phantom?.isPhantom) return phantom;

            // In generic mobile browsers, they might just be 'window.solana'
            if (isMobileInApp && solana) return solana;

            return null;
        }
        case 'solflare': {
            const solflare = (window as any).solflare;
            if (solflare?.isSolflare) return solflare;

            // If strictly mobile in-app and we see a solana object but it's not Phantom...
            // It might be Solflare masquerading or just generic. 
            // Better to only return if we are sure or if user explicitly clicked 'Solflare'.
            const solana = (window as any).solana;
            if (isMobileInApp && solana && solana.isSolflare) return solana;

            return null;
        }
        case 'metamask': {
            const ethereum = (window as any).ethereum;
            if (ethereum?.isMetaMask) return null; // MetaMask is EVM, handled by getMetaMaskProvider
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

    // 3. Mobile Fallback
    // In strict mobile environments (like MetaMask Mobile Browser), window.ethereum IS MetaMask.
    // They might not set isMetaMask=true in all versions, or might have flags we don't know.
    // simpler check for mobile.
    if (isWalletInAppBrowser() && ethereum) {
        return ethereum;
    }

    return null;
}

/**
 * Discover MetaMask Provider via EIP-6963
 * This avoids conflicts with Coinbase Wallet or other extensions that override window.ethereum
 */
function getMetaMaskProviderViaEIP6963(): Promise<any> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(null);
            return;
        }

        let resolved = false;
        const providers: EIP6963ProviderDetail[] = [];

        function onAnnounceProvider(event: EIP6963AnnounceProviderEvent) {
            providers.push(event.detail);

            // Check for MetaMask specifically by RDNS or Name
            if (event.detail.info.rdns === 'io.metamask' || event.detail.info.name.toLowerCase().includes('metamask')) {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(event.detail.provider);
                }
            }
        }

        function cleanup() {
            window.removeEventListener('eip6963:announceProvider', onAnnounceProvider as EventListener);
        }

        window.addEventListener('eip6963:announceProvider', onAnnounceProvider as EventListener);

        // Dispatch request for providers
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        // Short timeout fallback to check window.ethereum if EIP-6963 is not supported/too slow
        setTimeout(() => {
            if (!resolved) {
                // If we found any provider that claims to be MetaMask but didn't match RDNS perfectly, try it
                const bestGuess = providers.find(p => p.info.name.toLowerCase().includes('metamask'));
                if (bestGuess) {
                    resolved = true;
                    cleanup();
                    resolve(bestGuess.provider);
                } else {
                    // Fallback to standard injection check
                    resolved = true;
                    cleanup();
                    resolve(getMetaMaskProvider());
                }
            }
        }, 1000); // Wait 1 second for announcements
    });
}

/** Check if wallet extension is installed */
export function isWalletInstalled(walletType: ManualWalletType): boolean {
    if (walletType === 'walletconnect') return true; // Always available
    if (walletType === 'metamask') return true; // We'll double check in try/catch via EIP-6963

    const provider = getWalletProvider(walletType);
    if (provider) return true;

    // Mobile fallback: if we are on mobile, we can "try" to deep link even if not installed detection works
    if (isMobile()) return true;

    return false;
}

/** Convert Uint8Array to base64 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** 
 * Get wallet deep link for mobile 
 * Uses Universal Links where available for best UX (no browser prompt)
 * Falls back to custom schemes.
 */
function getMobileDeepLink(walletType: ManualWalletType): string | null {
    // Current page URL (where we want the user to return)
    // We strip any hash/search params to keep it clean, or keep them if needed?
    // Usually standardizing the return URL is safer.
    const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname);
    const host = window.location.host;

    // "ref" is often used by wallets to display the dApp name
    const ref = encodeURIComponent("https://" + host);

    switch (walletType) {
        case 'phantom':
            // Phantom Universal Link (Best practice)
            // ref: https://docs.phantom.app/solana/deep-linking
            return `https://phantom.app/ul/browse/${returnUrl}?ref=${ref}`;

        case 'solflare':
            // Solflare Universal Link
            // ref: https://docs.solflare.com/developer/mobile-deeplinks
            return `https://solflare.com/ul/v1/browse/${returnUrl}?ref=${ref}`;

        case 'metamask':
            // MetaMask Mobile
            // ref: https://docs.metamask.io/wallet/how-to/mobile-best-practices/#deeplinking
            const cleanHost = host.replace('www.', '');
            return `https://metamask.app.link/dapp/${cleanHost}${window.location.pathname}`;

        case 'walletconnect':
            // WalletConnect handles its own deep linking via the modal/qr code
            return null;

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
    connect: { key: 'wallet_manual_connect', max: 10, window: 60000 },
    sign: { key: 'wallet_manual_sign', max: 5, window: 60000 },
};

// Storage Keys
const STORAGE_KEYS = {
    CONNECTING_WALLET: 'seniqu_connecting_wallet',
    CONNECTING_TIME: 'seniqu_connecting_time',
};

// Connection timeout (desktop: 15s, mobile: 30s)
const CONNECTION_TIMEOUT_MS = isMobile() ? 30000 : 15000;

// Debounce cooldown between connect attempts
const CONNECT_DEBOUNCE_MS = 2000;

/** Race a promise against a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Please try again.`)), ms)
        ),
    ]);
}

// ============================================================
// HOOK
// ============================================================

export function useManualWallet() {
    const [state, setState] = useState<WalletConnectionState>('idle');
    const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
    const [activeWalletType, setActiveWalletType] = useState<ManualWalletType | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const storeLogin = useAuthStore((s) => s.login);
    const walletStore = useWalletStore();
    const toast = useToast();
    const navigate = useNavigate();

    // Guards against concurrent operations
    const isProcessingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Store signer function after connect — avoids re-connecting during loginWithWallet
    const signerRef = useRef<{
        signMessage: (msg: Uint8Array, specificAddress?: string) => Promise<Uint8Array>;
        walletType: ManualWalletType;
    } | null>(null);

    // Debounce guard — prevent rapid-fire connect attempts
    const lastAttemptRef = useRef<number>(0);

    // Auto-Resume Connection on Mount (Mobile Redirect Handling)
    useState(() => {
        const storedWallet = sessionStorage.getItem(STORAGE_KEYS.CONNECTING_WALLET) as ManualWalletType | null;
        const storedTime = sessionStorage.getItem(STORAGE_KEYS.CONNECTING_TIME);

        if (storedWallet && storedTime) {
            const timeDiff = Date.now() - parseInt(storedTime, 10);
            // Resume if within 5 minutes
            if (timeDiff < 5 * 60 * 1000) {
                console.log(`[ManualWallet] Resuming connection to ${storedWallet}`);
                // Restore active wallet type immediately so UI shows "Connecting..."
                setActiveWalletType(storedWallet);
                setState('connecting');

                // Set a safety timeout to reset if nothing happens (e.g. deep link failed)
                setTimeout(() => {
                    setState((curr) => {
                        if (curr === 'connecting') {
                            console.log('[ManualWallet] Resume timeout - resetting state');
                            // Clean reset without triggering errors
                            sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_WALLET);
                            sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_TIME);
                            return 'idle';
                        }
                        return curr;
                    });
                }, 3000); // Reduced to 3s grace period for wallet adapter to pick up
            } else {
                // Expired - clear it
                sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_WALLET);
                sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_TIME);
            }
        }
    });

    /**
     * Reset to idle state
     */
    const reset = useCallback(() => {
        setState('idle');
        setConnectedAddress(null);
        setActiveWalletType(null);
        setAvailableAccounts([]);
        setError(null);
        isProcessingRef.current = false;
        signerRef.current = null;

        // Clear session storage
        sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_WALLET);
        sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_TIME);

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
    ): Promise<{ address: string; accounts: string[]; signMessage: (msg: Uint8Array) => Promise<Uint8Array> }> => {
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
            // Standard Solana Wallet Adapter returns { publicKey }
            // Some newer standards might return { accounts: PublicKey[] }
            const publicKey = provider.publicKey || (result as any)?.publicKey;

            // Check for multiple accounts support (if wallet exposes it)
            // Note: Most current adapters only expose the active account, but we prepare for it.
            const accounts: string[] = [];

            if ((result as any)?.accounts && Array.isArray((result as any).accounts)) {
                (result as any).accounts.forEach((acc: any) => {
                    // Handle if account is PublicKey object or string
                    if (typeof acc === 'string') accounts.push(acc);
                    else if (acc.toString) accounts.push(acc.toString());
                });
            } else if (publicKey) {
                accounts.push(publicKey.toString());
            }

            if (accounts.length === 0) {
                // If deep linking on mobile, it might not return immediately?
                // But for in-app browser, it should.
                throw new Error(`Failed to get public key from ${walletType}`);
            }

            const address = accounts[0];
            console.log(`[ManualWallet] Connected address: ${address.slice(0, 8)}...${address.slice(-4)}`);

            // Return address and a sign function
            return {
                address,
                accounts,
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
                            // Solflare: Standard signMessage just like Phantom.
                            // Previously 'utf8' was passed but it causes "Invalid transaction" errors.
                            signResult = await (provider as any).signMessage(message);
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
        accounts: string[];
        signMessage: (msg: Uint8Array, specificAddress?: string) => Promise<Uint8Array>;
    }> => {
        // Try EIP-6963 discovery first, then fallback to standard injection
        let ethereum = await getMetaMaskProviderViaEIP6963();

        if (!ethereum) {
            // Final fallback check
            ethereum = getMetaMaskProvider();
        }

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
                accounts,
                signMessage: async (message: Uint8Array, specificAddress?: string): Promise<Uint8Array> => {
                    const msgHex = '0x' + Array.from(message)
                        .map((b: number) => b.toString(16).padStart(2, '0'))
                        .join('');

                    const fromAddress = specificAddress || address;

                    try {
                        const signature = await ethereum.request({
                            method: 'personal_sign',
                            params: [msgHex, fromAddress],
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

    // connectAndLogin removed — dead code, replaced by connectWallet + loginWithWallet two-step flow

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
            // Pass current domain for SIWS/SIWE domain binding
            const domain = window.location.host;
            const nonceResponse = await walletService.requestNonce(address, chain, domain);

            // === STEP 2: Sign Message ===
            setState('awaiting-signature');

            // Helpful toast specifically for mobile users who might need to check app
            if (isMobile()) {
                toast.info('Check Wallet', 'Please switch to your wallet app to sign the message.', 10000); // 10s duration
            }

            const messageBytes = new TextEncoder().encode(nonceResponse.message);
            let signatureBytes: Uint8Array;

            // Handle Reown Provider / Standard Provider
            if (provider.signMessage) {
                console.log('[ManualWallet] Helper: Calling provider.signMessage...');

                // Add 60s timeout for signing to prevent infinite hanging
                const result = await withTimeout(
                    Promise.resolve(provider.signMessage(messageBytes)),
                    60000,
                    'Signature request'
                );

                console.log('[ManualWallet] Helper: Sign Message Result:', result); // DEBUG

                // Robust handling of different signature return formats
                if (result instanceof Uint8Array) {
                    signatureBytes = result;
                } else if (typeof result === 'object' && result.signature) {
                    // Some adapters return { signature: Uint8Array }
                    signatureBytes = result.signature;
                } else if (typeof result === 'string') {
                    // Reown sometimes returns hex string "0x..." or base58?
                    if (result.startsWith('0x')) {
                        // Hex string
                        const sig = result.slice(2);
                        const match = sig.match(/.{1,2}/g);
                        if (match) {
                            signatureBytes = new Uint8Array(match.map((byte: string) => parseInt(byte, 16)));
                        } else {
                            throw new Error('Invalid hex signature');
                        }
                    } else {
                        // If it is a base58 string, we need bs58 decode, but we don't have it here.
                        // For now, fail if we can't parse it as hex to avoid "string not assignable to number" errors.
                        throw new Error('Unknown string signature format (not hex)');
                    }
                } else {
                    // Last ditch: try strict cast if it looks like an array
                    if (Array.isArray(result) || ArrayBuffer.isView(result)) {
                        signatureBytes = new Uint8Array(result as any);
                    } else {
                        // Try to cast from object values ONLY if it's an object (and not null/string/etc)
                        if (typeof result === 'object' && result !== null) {
                            // potential {0: 12, 1: 34 ...}
                            const values = Object.values(result);
                            // Ensure all values are numbers
                            if (values.every((v: any) => typeof v === 'number')) {
                                signatureBytes = new Uint8Array(values as number[]);
                            } else {
                                throw new Error('Unknown signature object format: values are not all numbers');
                            }
                        } else {
                            throw new Error('Unknown signature format returned by provider');
                        }
                    }
                }

                if (!signatureBytes || signatureBytes.length === 0) {
                    throw new Error('Empty signature returned');
                }

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
            const redirectPath = getDashboardRoute(authResponse.user);
            navigate(redirectPath);

            return authResponse;

        } catch (err: any) {
            console.error('LoginWithProvider Error:', err);
            // Detect user rejection
            if (err?.message?.includes('rejected') || err?.message?.includes('User denied')) {
                toast.info('Cancelled', 'Signature request rejected');
            } else if (isMobile() && (err?.message?.includes('closed') || err?.message?.includes('ignoring'))) {
                // Mobile specific: sometimes "closed" just means they switched apps back too fast?
                // or maybe the wallet app closed the session?
                console.warn('[ManualWallet] Mobile session interruption:', err);
                // Don't show error toast for these widespread mobile "flukes" unless critical
            } else {
                toast.error('Login Failed', err?.message || 'Failed to authenticate');
                setError(err?.message);
            }
            setState('error');
        } finally {
            isProcessingRef.current = false;
        }

    }, [storeLogin, walletStore, toast, navigate]);

    /**
     * Step 1: Connect Wallet Only (Returns accounts for selection)
     */
    /**
     * Step 1: Connect Wallet Only (Returns accounts for selection)
     * Stores signer in signerRef to avoid re-connecting in loginWithWallet.
     * Includes debounce guard and connection timeout.
     */
    const connectWallet = useCallback(async (walletType: ManualWalletType) => {
        if (isProcessingRef.current) return null;

        // Debounce: reject if < 2s since last attempt
        const now = Date.now();
        if (now - lastAttemptRef.current < CONNECT_DEBOUNCE_MS) {
            console.log('[ManualWallet] Debounced — too soon since last attempt');
            return null;
        }
        lastAttemptRef.current = now;

        // Rate limit check
        const rl = checkRateLimit(WALLET_RATE_LIMITS.connect.key, WALLET_RATE_LIMITS.connect.max, WALLET_RATE_LIMITS.connect.window);
        if (!rl.allowed) {
            const seconds = Math.ceil((rl.retryAfter || 60000) / 1000);
            setError(`Too many attempts. Please wait ${seconds} seconds.`);
            toast.error('Rate Limited', `Please wait ${seconds} seconds before trying again.`);
            return null;
        }

        isProcessingRef.current = true;
        setError(null);
        setActiveWalletType(walletType);
        setAvailableAccounts([]);
        signerRef.current = null;
        setState('connecting');

        const isMobileDevice = isMobile();
        const inAppBrowser = isWalletInAppBrowser();

        // --- MOBILE DEEP LINKING ---
        if (isMobileDevice && !inAppBrowser && walletType !== 'walletconnect') {
            const deepLink = getMobileDeepLink(walletType);
            if (deepLink) {
                sessionStorage.setItem(STORAGE_KEYS.CONNECTING_WALLET, walletType);
                sessionStorage.setItem(STORAGE_KEYS.CONNECTING_TIME, Date.now().toString());
                setTimeout(() => { window.location.href = deepLink; }, 500);
                isProcessingRef.current = false;
                return null;
            }
        }

        try {
            if (walletType === 'walletconnect') {
                // WalletConnect handled externally via Reown/Privy hooks in AuthModal
                isProcessingRef.current = false;
                setState('idle');
                return []; // Signal "handled elsewhere"
            } else if (walletType === 'metamask') {
                try {
                    const result = await withTimeout(
                        connectMetaMask(),
                        CONNECTION_TIMEOUT_MS,
                        'MetaMask connection'
                    );
                    const accounts = result.accounts || [result.address];
                    setAvailableAccounts(accounts);
                    signerRef.current = { signMessage: result.signMessage, walletType };
                    setState('connected');
                    return accounts;
                } catch (err: any) {
                    if (err.message.includes('MetaMask not found')) {
                        const installUrl = getWalletInstallUrl('metamask');
                        setError('MetaMask not installed.');
                        toast.error('MetaMask Not Found', 'Please install MetaMask extension.');
                        if (!isMobileDevice) window.open(installUrl, '_blank');
                        setState('error');
                        return null;
                    }
                    throw err;
                }
            } else {
                // Phantom / Solflare
                if (!isWalletInstalled(walletType) && !isMobileDevice) {
                    const walletName = walletType === 'phantom' ? 'Phantom' : 'Solflare';
                    const installUrl = getWalletInstallUrl(walletType);
                    setError(`${walletName} not installed.`);
                    toast.error(`${walletName} Not Found`, `Please install ${walletName} wallet.`);
                    window.open(installUrl, '_blank');
                    setState('error');
                    return null;
                }
                const result = await withTimeout(
                    connectSolanaWallet(walletType),
                    CONNECTION_TIMEOUT_MS,
                    `${walletType} connection`
                );
                setAvailableAccounts(result.accounts || [result.address]);
                signerRef.current = { signMessage: result.signMessage, walletType };
                setState('connected');
                return result.accounts || [result.address];
            }
        } catch (err: any) {
            console.error(`[ManualWallet] ${walletType} connect error:`, err);

            // Detect user rejection vs real error
            const isUserRejection =
                err?.message?.toLowerCase().includes('rejected') ||
                err?.message?.toLowerCase().includes('user denied') ||
                err?.message?.toLowerCase().includes('cancelled') ||
                err?.message?.toLowerCase().includes('user closed') ||
                err?.code === 4001;

            if (isUserRejection) {
                toast.info('Cancelled', 'You cancelled the wallet connection.');
                setError(null);
            } else {
                const userMessage = (err?.message?.length > 120)
                    ? 'Connection failed. Please try again.'
                    : err?.message || 'Connection failed. Please try again.';
                setError(userMessage);
                toast.error('Connection Failed', userMessage);
            }
            setState('error');
            return null;
        } finally {
            isProcessingRef.current = false;
        }
    }, [connectSolanaWallet, connectMetaMask, toast]);

    /**
     * Step 2: Login with specific account (after selection)
     */
    /**
     * Step 2: Login with specific account (after selection)
     * Uses stored signerRef to avoid re-connecting and triggering a second popup.
     */
    const loginWithWallet = useCallback(async (address: string, walletType: ManualWalletType) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setError(null);

        const chain = walletType === 'metamask' ? 'ethereum' : 'solana';

        try {
            // Use stored signer from connectWallet (no second popup)
            let signMessage: (msg: Uint8Array, specificAddress?: string) => Promise<Uint8Array>;

            if (signerRef.current && signerRef.current.walletType === walletType) {
                signMessage = signerRef.current.signMessage;
            } else {
                // Fallback: re-acquire signer (rare — only if signerRef was cleared)
                console.warn('[ManualWallet] signerRef missing, re-connecting as fallback');
                if (walletType === 'metamask') {
                    const res = await connectMetaMask();
                    signMessage = res.signMessage;
                } else {
                    const res = await connectSolanaWallet(walletType as any);
                    signMessage = res.signMessage;
                }
            }

            // Rate limit signing
            const signRl = checkRateLimit(WALLET_RATE_LIMITS.sign.key, WALLET_RATE_LIMITS.sign.max, WALLET_RATE_LIMITS.sign.window);
            if (!signRl.allowed) {
                throw new Error('Too many signing attempts. Please wait.');
            }

            // 1. Request Nonce
            setState('requesting-nonce');
            const nonceResponse = await walletService.requestNonce(address, chain);

            // 2. Sign
            setState('awaiting-signature');
            toast.info('Sign Message', 'Please check your wallet to sign the verification message.');

            const messageBytes = new TextEncoder().encode(nonceResponse.message);
            const signatureBytes = await signMessage(messageBytes, address);

            let signatureEncoded: string;
            if (walletType === 'metamask') {
                signatureEncoded = '0x' + Array.from(signatureBytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            } else {
                signatureEncoded = uint8ArrayToBase64(signatureBytes);
            }

            // 3. Authenticate
            setState('verifying');
            const authResponse = await authService.authenticateWithWallet(
                address,
                signatureEncoded,
                nonceResponse.nonce,
                chain
            );

            setState('authenticated');

            // Clear session storage on success
            sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_WALLET);
            sessionStorage.removeItem(STORAGE_KEYS.CONNECTING_TIME);

            if (authResponse.isNewUser) {
                return authResponse;
            }

            storeLogin(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
            walletStore.setConnected(address, chain, walletType);

            const walletLabel = walletType === 'phantom' ? 'Phantom'
                : walletType === 'solflare' ? 'Solflare'
                    : walletType === 'metamask' ? 'MetaMask'
                        : 'WalletConnect';
            toast.success('Welcome!', `Connected with ${walletLabel}`);
            const redirectPath = getDashboardRoute(authResponse.user);
            navigate(redirectPath);

            return authResponse;

        } catch (err: any) {
            console.error('[ManualWallet] Login error:', err);
            const isUserRejection =
                err?.message?.toLowerCase().includes('rejected') ||
                err?.message?.toLowerCase().includes('user rejected') ||
                err?.message?.toLowerCase().includes('user denied') ||
                err?.message?.toLowerCase().includes('cancelled') ||
                err?.message?.toLowerCase().includes('user closed') ||
                err?.code === 4001 ||
                err?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                toast.info('Cancelled', 'Signature request rejected');
                setError(null);
                setState('connected'); // Go back to connected state (selection)
            } else {
                const msg = (err?.message?.length > 120)
                    ? 'Authentication failed. Please try again.'
                    : err?.message || 'Authentication failed';
                setError(msg);
                toast.error('Login Failed', msg);
                setState('error');
            }
        } finally {
            isProcessingRef.current = false;
        }
    }, [connectSolanaWallet, connectMetaMask, storeLogin, walletStore, toast, navigate]);

    return {
        // State
        state,
        connectedAddress,
        availableAccounts,
        activeWalletType,
        error,

        // Actions (rate-limited & debounced)
        reset,
        loginWithProvider,
        connectWallet,
        loginWithWallet,
        setAvailableAccounts,
        setActiveWalletType,

        // Utilities
        isProcessing: isProcessingRef.current,
        isWalletInstalled,
        getWalletInstallUrl,
        // NOTE: connectSolanaWallet & connectMetaMask intentionally NOT exported
        // — they bypass rate limits and debounce guards. Use connectWallet() instead.
    };
}

export default useManualWallet;
