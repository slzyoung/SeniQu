import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Copy,
    ExternalLink,
    Send,
    QrCode,
    RefreshCw,
    ArrowDownLeft,
    Loader2,
    ArrowUpRight,
    ArrowRightLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { QrReader } from 'react-qr-reader';
import { Button, Input, Modal } from '../../../../components/ui';
import { usePrivyWallet } from '../../../../hooks/usePrivyWallet';
import { useToast } from '../../../../stores/useNotificationStore';
import { useCurrentUser } from '../../../../hooks/useUser';
import { useWalletTransactions } from '../../../../hooks/useWalletData';
import { useTokenPrices } from '../../../../hooks/useTokenPrices';
import { useAuthStore } from '../../../../stores/useAuthStore';
import api from '../../../../lib/api';
import './WalletPage.css';

import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Transaction, SystemProgram } from '@solana/web3.js';


// ============================================
// ASSETS & CONFIG
// ============================================

// Images from public/images/crypto
const ICONS = {
    solana: '/images/crypto/solana.svg',
    ethereum: '/images/crypto/ethereum.svg',
    usdt: '/images/crypto/usdt.svg',
    usdc: '/images/crypto/usdc.svg',
};

type ChainType = 'solana' | 'ethereum';

interface TokenAsset {
    symbol: string;
    name: string;
    balance: number;
    price: number;
    value: number;
    icon: string;
    isNative?: boolean;
}

// ============================================
// COMPONENTS
// ============================================



// ============================================
// MAIN COMPONENT
// ============================================

export function WalletPage() {
    // 1. Auth & Wallet Hooks
    const {
        embeddedSolanaWallet,
        embeddedEthereumWallet, // NEW: Support Ethereum
        embeddedWallet, // GENERIC: First found wallet
        ready,
        user,
        authenticated,
        login,
        createWallet
    } = usePrivyWallet();

    const toast = useToast();
    const { prices } = useTokenPrices(); // NEW: Real-time prices
    const { data: rawTransactions, isLoading: txLoading, refetch: refetchTransactions } = useWalletTransactions();
    const transactions = Array.isArray(rawTransactions) ? rawTransactions : (rawTransactions as any)?.data ?? [];

    // 2. Local State
    const { user: storeUser } = useAuthStore();
    const { data: freshUser, isLoading: isUserLoading, refetch: refetchUser } = useCurrentUser();

    // Use fresh user data from API if available, otherwise fall back to store
    // This ensures we see the latest wallet state even if store is stale
    const backendUser = freshUser || storeUser;
    const [activeChain, setActiveChain] = useState<ChainType>('solana');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    // Track if user clicked "Deposit" but needed to login first
    const [pendingDeposit, setPendingDeposit] = useState(false);


    // Balances
    const [solBalance, setSolBalance] = useState<number>(0);
    const [ethBalance, setEthBalance] = useState<number>(0);

    // Modals
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [isBalanceHidden, setIsBalanceHidden] = useState(false); // NEW: Privacy mode

    // Send Form
    const [sendAmount, setSendAmount] = useState('');
    const [sendAddress, setSendAddress] = useState('');
    const [isSending, setIsSending] = useState(false);

    // ... (keep existing derived helpers) ...
    // 3. Derived Helpers
    // 3. Derived Helpers
    // Active Wallet is now derived primarily from Backend Data for security
    // We try to find a matching wallet in backendUser.wallets
    const activeBackendWallet = useMemo(() => {
        if (!backendUser?.wallets?.length) return undefined;

        // 1. Filter by Active Chain
        const chainWallets = backendUser.wallets.filter((w: any) => {
            const wChain = (w.chainType || w.chain_type || '').toLowerCase();
            return wChain === activeChain.toLowerCase() || wChain.includes(activeChain.toLowerCase());
        });

        // 2. Try strict Embedded match first (Best for security)
        const embeddedMatch = chainWallets.find((w: any) =>
            w.isEmbedded || w.is_embedded || w.privy_wallet_id || w.walletClientType === 'privy'
        );

        if (embeddedMatch) return embeddedMatch;

        // 3. Fallback: Take the first wallet matching the chain
        // UsersService puts Privy wallets FIRST in the list, so this effectively defaults to Embedded
        // even if the explicit flag is missing or false locally.
        // This mimics the 'Deposit Modal' logic which the user liked.
        return chainWallets[0];
    }, [backendUser, activeChain]);

    // Debugging to help trace issues
    // useEffect(() => {
    //     console.log("[WalletPage] Debug Wallet Selection:", {
    //         activeChain,
    //         backendWallets: backendUser?.wallets,
    //         activeBackendWallet,
    //         embeddedSolana: embeddedSolanaWallet?.address,
    //         embeddedEth: embeddedEthereumWallet?.address
    //     });
    // }, [activeChain, backendUser, activeBackendWallet]);

    // We still keep the "embedded" one for signing/provider capability usage (client-side)
    // But for "existence" checks, we verify against backend.
    const activeWallet = activeChain === 'solana' ? embeddedSolanaWallet : embeddedEthereumWallet;

    // 4. UNIFIED RESOLUTION LOGIC (Fix for inconsistency)
    const resolveActiveWallet = useCallback(() => {
        // 1. Backend Source (Best Case & Primary Source of Truth)
        // Access properties safely to avoid TS errors on runtime-only fields
        const wallet = activeBackendWallet as any;
        if (wallet?.address || wallet?.wallet_address) {
            return {
                address: wallet.address || wallet.wallet_address,
                verified: true
            };
        }

        // 2. Client-Side Fallback (Active Chain) with strict checking
        // Check specific chain wallet first
        if (activeChain === 'solana' && embeddedSolanaWallet?.address) {
            return { address: embeddedSolanaWallet.address, verified: false };
        }
        if (activeChain === 'ethereum' && embeddedEthereumWallet?.address) {
            return { address: embeddedEthereumWallet.address, verified: false };
        }

        // 3. Generic Fallback - if we have a generic embedded wallet and it matches the chain (or we are desperate)
        if (embeddedWallet?.address) {
            const wChain = (embeddedWallet as any).chainType?.toLowerCase();
            // If chain matches OR if we have no specific chain info but it's an embedded wallet
            if (!wChain || wChain === activeChain.toLowerCase()) {
                return { address: embeddedWallet.address, verified: false };
            }
        }

        return { address: undefined, verified: false };
    }, [activeBackendWallet, activeChain, embeddedSolanaWallet, embeddedEthereumWallet, embeddedWallet]);

    const { address: currentAddress, verified: isCurrentVerified } = resolveActiveWallet();




    // 4. Fetch Logic
    const fetchBalances = useCallback(async () => {
        // Fetch Solana
        if (embeddedSolanaWallet?.address) {
            try {
                const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://rpc.ankr.com/solana';
                const connection = new Connection(rpcUrl, 'confirmed');
                const pubKey = new PublicKey(embeddedSolanaWallet.address);
                const bal = await connection.getBalance(pubKey);
                setSolBalance(bal / LAMPORTS_PER_SOL);
            } catch (err: any) {
                console.warn("[WalletPage] Sol balance fetch failed:", err.message);
                // Don't crash, just keep 0 or last known
            }
        }

        // Fetch Ethereum
        if (embeddedEthereumWallet?.address) {
            try {
                // Check if wallet object actually has the provider method
                const walletAny = embeddedEthereumWallet as any;

                // GUARD: Check if getProvider exists
                if (typeof walletAny.getProvider !== 'function') {
                    // console.debug("[WalletPage] Eth wallet provider method missing");
                    return;
                }

                const provider = await walletAny.getProvider();

                if (provider) {
                    try {
                        // EIP-1193 request
                        const balHex = await provider.request({
                            method: 'eth_getBalance',
                            params: [embeddedEthereumWallet.address, 'latest']
                        });
                        const balWei = parseInt(balHex, 16);
                        setEthBalance(balWei / 1e18);
                    } catch (reqErr: any) {
                        console.warn("[WalletPage] Eth provider request failed:", reqErr.message);
                    }
                } else {
                    // Fallback: Use public RPC if wallet provider not available (e.g. not yet loaded)
                    // or just log warning
                    // console.debug("[WalletPage] Eth wallet provider not ready yet");
                }
            } catch (err: any) {
                console.warn("[WalletPage] Eth balance error:", err.message);
            }
        }
    }, [embeddedSolanaWallet, embeddedEthereumWallet]);

    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    // 4.5 Sync Wallets with Backend
    // This ensures that the backend 'privy_wallets' table is up-to-date with Privy's authoritative data.
    // We trigger this when Privy is ready and authenticated.
    // 4.5 Sync Wallets with Backend
    // This ensures that the backend 'privy_wallets' table is up-to-date with Privy's authoritative data.
    // We trigger this when Privy is ready and authenticated.
    useEffect(() => {
        if (!ready || !authenticated || !user?.id) return;

        const syncWallets = async () => {
            // Anti-Throttling: Check if backend already has the wallets we expect
            // If the backend user object already has wallets for both chains (or the relevant ones), skipping might be safe?
            // Actually, we should sync occasionally to catch updates, but not on every render.
            // We'll use a session storage flag to avoid spamming on every page navigation, OR just a simple check.

            const lastSync = sessionStorage.getItem(`last_wallet_sync_${user.id}`);
            const now = Date.now();
            // Sync only if > 60 seconds since last sync, OR if backend wallets are empty
            const shouldSync = !backendUser?.wallets?.length || (now - parseInt(lastSync || '0') > 60000);

            if (shouldSync) {
                try {
                    // console.debug("[WalletPage] Syncing wallets with backend...");
                    await api.post('/users/me/sync-wallets');

                    // Refresh user profile to get the updated wallet addresses
                    const updatedUser = await api.get('/users/me');
                    useAuthStore.getState().setUser(updatedUser as any);
                    await refetchUser(); // Ensure React Query data is also updated

                    sessionStorage.setItem(`last_wallet_sync_${user.id}`, now.toString());
                } catch (err) {
                    console.error("[WalletPage] Failed to sync wallets:", err);
                }
            } else {
                // console.debug("[WalletPage] Skipping wallet sync (throttled/cached)");
            }
        };

        // Debounce slightly to avoid spamming on mount
        const timer = setTimeout(syncWallets, 1500);
        return () => clearTimeout(timer);
    }, [ready, authenticated, user?.id, backendUser?.wallets?.length]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // 1. Force Backend Sync
            await api.post('/users/me/sync-wallets');
            const updatedUser = await api.get('/users/me');
            useAuthStore.getState().setUser(updatedUser as any);

            // 2. Refresh Client Data
            await Promise.all([fetchBalances(), refetchTransactions(), refetchUser()]);
            toast.success('Updated', 'Wallet synced and verified.');
        } catch (err) {
            console.error("Manual refresh failed:", err);
            toast.error("Sync Failed", "Could not verify wallet status.");
        } finally {
            setIsRefreshing(false);
        }
    };

    // 5. Create Wallet Handler
    const handleCreateOrDeposit = useCallback(async () => {
        // A. If wallet for ACTIVE chain exists -> Just show modal.
        if (activeWallet) {
            setShowReceiveModal(true);
            return;
        }

        // B. If wallet for ACTIVE chain is missing, we MUST try to create it.
        // Even if another chain's wallet exists (e.g. has Eth but needs Sol).
        if (embeddedWallet && !activeWallet) {
            console.log(`[WalletPage] Embedded wallet exists, but missing for ${activeChain}. Attempting creation...`);
            // We proceed to creation flow below.
            // Privy's createWallet() is smart enough to "add" the missing chain if the user already has an embedded wallet identity.
        } else if (embeddedWallet) {
            // This else block is actually redundant if activeWallet is derived correctly from embeddedWallet,
            // but we keep it as a fallback safety.
            // If we are here, it means we have 'embeddedWallet' (generic) but not 'activeWallet' (specific).
            // So we should NOT return here, we should let it fall through to creation.
        }

        // C. Check if Backend User already has a wallet (but Privy not auth'd)
        // Only trigger if Privy is READY but not authenticated.
        // Also, we might want to check if the bridge is currently working...
        // C. Check if Backend User already has a wallet (but Privy not auth'd)
        // IMMEDIATE DISPLAY FIX: We no longer block the UI for "Silent Sync".
        // If the backend has the wallet, we allow the modal to open immediately.
        // The modal's internal logic (render) already prioritizes backendUser.wallets.
        if (backendUser?.wallets?.length) {
            // Check if we have the specific wallet for the active chain
            const hasChainWallet = backendUser.wallets.find((w: any) => {
                const wChain = (w.chainType || w.chain_type || '').toLowerCase();
                return wChain === activeChain.toLowerCase();
            });
            if (hasChainWallet) {
                // Console log for debugging, but proceed to show modal
                // console.log("[WalletPage] Backend Verified Wallet found. Opening modal immediately.");
                setShowReceiveModal(true);
                return;
            }
        }

        // D. No wallet at all -> Create one.
        if (isCreating) return; // Prevent double clicks

        setIsCreating(true);
        let loadingId: string | undefined;

        try {
            // 0. Wait for Privy to be ready
            if (!ready) {
                console.warn("[WalletPage] Privy not ready yet. Ignoring click.");
                toast.info("Initializing", "Please wait while we secure the connection...");
                return;
            }

            console.log("[WalletPage] handleCreateOrDeposit state:", { ready, authenticated, user: user?.id, activeChain });

            // Debug State
            console.log("[WalletPage Debug]", {
                ready,
                authenticated,
                hasActiveWallet: !!activeWallet,
                activeChain,
                backendAddress: "REMOVED",
                embeddedAddress: embeddedWallet?.address,
                userObjectWallet: user?.wallet?.address
            });

            // 1. Ensure Auth
            if (!authenticated) {
                console.warn("[WalletPage] User is not authenticated in Privy. Triggering login.");
                setPendingDeposit(true);
                toast.info("Authentication Required", "Please sign in to create a secure wallet.");
                await login();
                return;
            }

            // 1.5 Force Logout if authenticated but no wallet (Stale session fix)
            // REMOVED: This causes a logout loop ("appears for 1 second").
            // We should trust the sync process or allow createWallet to handle it.
            /*
            const hasWalletInUserObject = !!user?.wallet?.address;
            if (authenticated && !embeddedWallet && !hasWalletInUserObject && !pendingDeposit) {
                console.warn("[WalletPage] Authenticated but no wallet found. Attempting creation instead of logout.");
                // await logout();
                // setPendingDeposit(true);
                // await login();
                // return;
            }
            */

            // 2. Double-check embeddedWallet didn't appear after login (Race condition check)
            // If we have the specific wallet we need, just show it
            if (activeWallet) {
                setShowReceiveModal(true);
                return;
            }

            // 3. Create
            loadingId = toast.info("Securing Wallet", `Generating your unique ${activeChain} identity...`);

            // Try to create wallet. Note: createWallet might be generic, 
            // but if multi-wallet is enabled, we rely on Privy to handle it or us to find it.
            // If the user already has an embedded wallet (but for other chain), createWallet() might throw 'already exists'
            // or return the existing one.
            let wallet;
            try {
                wallet = await createWallet();
            } catch (createErr: any) {
                // If specific chain wallet is missing but another exists, specific handling might be needed here
                // depending on SDK version. For now we catch 'already exists'
                throw createErr;
            }

            if (loadingId) toast.dismiss(loadingId);

            if (wallet) {
                toast.success("Success", "Wallet generated successfully!");

                // Force a refresh of wallet list and balances
                setTimeout(async () => {
                    fetchBalances();

                    // NEW: Immediately sync with backend to ensure the DB knows about this new wallet
                    try {
                        await api.post('/users/me/sync-wallets');
                        // Refresh user profile so UI gets the new address from DB
                        const updatedUser = await api.get('/users/me');
                        useAuthStore.getState().setUser(updatedUser as any);
                        await refetchUser(); // Ensure React Query data matches
                    } catch (syncErr) {
                        console.error("[WalletPage] Post-creation sync failed:", syncErr);
                    }

                    setShowReceiveModal(true);
                }, 1000);
            }
        } catch (error: any) {
            console.error("Wallet creation error:", error);
            const errMsg = error?.message || error?.toString();

            if (loadingId) toast.dismiss(loadingId);

            // Handle "User already has an embedded wallet" gracefully
            if (errMsg?.toLowerCase().includes('already has') || errMsg?.toLowerCase().includes('exists')) {
                // If Privy says it exists but we didn't find it in 'activeWallet':
                // 1. It might be on the other chain (e.g. have ETH, need SOL).
                // 2. It might be a sync issue.

                console.log("[WalletPage] Wallet already exists. Checking if we can find it...");

                // If we are looking for Solana but have Ethereum (or vice versa), 
                // and createWallet failed, it implies we hit the limit (1 wallet per user?).
                // Check if the generic 'embeddedWallet' is available
                if (embeddedWallet) {
                    toast.info("Wallet Found", `Using your existing secure identity.`);
                    setShowReceiveModal(true);
                } else {
                    toast.success("Wallet Synced", "Retrieving your wallet addresses...");
                    // Force a reload to sync state if it's really stuck
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }

            } else if (errMsg?.toLowerCase().includes('allow user to close') || errMsg?.toLowerCase().includes('reject')) {
                // User closed the modal
                toast.error("Cancelled", "Wallet creation was cancelled.");
                setPendingDeposit(false);
            } else {
                toast.error("Creation Failed", "Could not generate wallet. Please try again.");
                setPendingDeposit(false);
            }
        } finally {
            setIsCreating(false);
        }
    }, [activeWallet, embeddedWallet, isCreating, authenticated, login, createWallet, toast, fetchBalances, backendUser?.wallets, ready, user?.id]);

    // Effect: Handle Auto-Deposit after Login
    useEffect(() => {
        // Only proceed if user clicked Deposit (pendingDeposit) AND is now authenticated
        if (authenticated && pendingDeposit && !isCreating) {
            console.log("[WalletPage] Auto-Deposit triggered. Authenticated:", authenticated);

            // If wallet already appeared (e.g. from createOnLogin), just show it
            if (activeWallet || embeddedWallet) {
                console.log("[WalletPage] Wallet found immediately. Opening modal.");
                setPendingDeposit(false);
                setShowReceiveModal(true);
            } else {
                // If no wallet yet, trigger creation automatically
                // We use a timeout to let Privy state settle/sync
                console.log("[WalletPage] No wallet found yet. Retrying creation in 1s...");
                const timer = setTimeout(() => {
                    handleCreateOrDeposit();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [authenticated, pendingDeposit, activeWallet, embeddedWallet, isCreating, handleCreateOrDeposit]);

    // 5.5 Withdraw Button Handler (Smart)
    const handleWithdrawClick = () => {
        // User requested: Do NOT auto-paste address. Input should be empty.
        // User requested: Do NOT show "Sending to your connected wallet" toast.

        setSendAddress('');
        setShowSendModal(true);
    };

    // 6. Send Handler (Solana Only for now as requested, but structure supports both)
    const handleSend = async () => {
        if (!sendAddress || !sendAmount) return;

        // Anti-Drain / Safety Checks
        if (activeChain === 'ethereum') {
            toast.info("Coming Soon", "ETH sending is coming soon.");
            return;
        }

        // Strict Address Validation (Solana)
        try {
            new PublicKey(sendAddress);
        } catch (e) {
            toast.error("Invalid Address", "Please enter a valid Solana address.");
            return;
        }

        // Prevent self-send (UX)
        if (activeWallet?.address === sendAddress) {
            toast.error("Self-Send", "You cannot send to yourself.");
            return;
        }

        setIsSending(true);
        try {
            const amount = parseFloat(sendAmount);
            if (isNaN(amount) || amount <= 0) {
                toast.error('Invalid Amount', 'Please enter a valid amount.');
                setIsSending(false);
                return;
            }

            // ROBUST PROVIDER RETRIEVAL
            // If 'activeWallet' is a verified backend object, it might not have the provider method.
            // We need the ACTUAL embedded wallet object from Privy hooks to sign.
            // If user is not authenticated in Privy (Silent Sync state), we cannot sign.
            if (!embeddedWallet && !embeddedSolanaWallet) {
                toast.error("Security Check", "Please refresh to secure the connection before sending.");
                return;
            }

            // Use the specific wallet provider if available, otherwise generic
            const signingWallet = activeChain === 'solana' ? embeddedSolanaWallet : embeddedEthereumWallet;
            const walletToUse = signingWallet || embeddedWallet;

            if (!walletToUse) {
                toast.error("Wallet Not Ready", "Signing capability unavailable.");
                return;
            }

            const provider = await (walletToUse as any).getProvider();

            // Standardized RPC (Mainnet)
            const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(walletToUse.address),
                    toPubkey: new PublicKey(sendAddress),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            transaction.feePayer = new PublicKey(walletToUse.address);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            const signedTx = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction(signature);

            toast.success('Sent!', `Transferred ${amount} SOL.`);
            setShowSendModal(false);
            setSendAddress('');
            setSendAmount('');
            fetchBalances();

        } catch (error: any) {
            console.error("Send failed", error);
            // Friendly error messages
            if (error?.message?.includes('Simulation failed') || error?.toString().includes('0x1')) {
                toast.error("Transaction Failed", "Insufficient funds or invalid state.");
            } else {
                toast.error("Failed", "Transaction failed. Please try again.");
            }
        } finally {
            setIsSending(false);
        }
    };

    // 7. Assets Logic
    // Construct the asset list based on active chain
    const getAssets = (): TokenAsset[] => {
        if (activeChain === 'solana') {
            return [
                {
                    symbol: 'SOL',
                    name: 'Solana',
                    balance: solBalance,
                    price: prices.solana || 0,
                    value: solBalance * (prices.solana || 0),
                    icon: ICONS.solana,
                    isNative: true
                },
                {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: 0, // Mock for now
                    price: prices['usd-coin'] || 1,
                    value: 0,
                    icon: ICONS.usdc
                },
                {
                    symbol: 'USDT',
                    name: 'Tether',
                    balance: 0, // Mock for now
                    price: prices.tether || 1,
                    value: 0,
                    icon: ICONS.usdt
                }
            ];
        } else {
            return [
                {
                    symbol: 'ETH',
                    name: 'Ethereum',
                    balance: ethBalance,
                    price: prices.ethereum || 0,
                    value: ethBalance * (prices.ethereum || 0),
                    icon: ICONS.ethereum,
                    isNative: true
                },
                {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: 0,
                    price: prices['usd-coin'] || 1,
                    value: 0,
                    icon: ICONS.usdc
                },
                {
                    symbol: 'USDT',
                    name: 'Tether',
                    balance: 0,
                    price: prices.tether || 1,
                    value: 0,
                    icon: ICONS.usdt
                }
            ];
        }
    };

    const assets = getAssets();
    const totalPortfolioValue = assets.reduce((acc, curr) => acc + curr.value, 0);

    // Chain switcher ref for sliding indicator
    const solBtnRef = useRef<HTMLButtonElement>(null);
    const ethBtnRef = useRef<HTMLButtonElement>(null);
    const switcherRef = useRef<HTMLDivElement>(null);

    const getIndicatorStyle = () => {
        const activeBtn = activeChain === 'solana' ? solBtnRef.current : ethBtnRef.current;
        if (!activeBtn || !switcherRef.current) return { left: 4, width: 80 };
        const parentRect = switcherRef.current.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        return {
            left: btnRect.left - parentRect.left,
            width: btnRect.width,
        };
    };

    // 7. Render
    if (!ready || isUserLoading) {
        return (
            <div className="wlt-page">
                <div className="wlt-loading">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </div>
        );
    }

    const indicatorStyle = getIndicatorStyle();

    return (
        <motion.div
            className="wlt-page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* ── Chain Switcher Bar ── */}
            <div className="wlt-chain-bar">
                <div className="wlt-chain-switcher" ref={switcherRef}>
                    <div
                        className="wlt-chain-indicator"
                        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                    />
                    <button
                        ref={solBtnRef}
                        className={`wlt-chain-btn ${activeChain === 'solana' ? 'active' : ''}`}
                        onClick={() => setActiveChain('solana')}
                    >
                        <img src={ICONS.solana} alt="SOL" />
                        <span>Solana</span>
                    </button>
                    <button
                        ref={ethBtnRef}
                        className={`wlt-chain-btn ${activeChain === 'ethereum' ? 'active' : ''}`}
                        onClick={() => setActiveChain('ethereum')}
                    >
                        <img src={ICONS.ethereum} alt="ETH" />
                        <span>Ethereum</span>
                    </button>
                </div>

                <div className="wlt-chain-actions">
                    <button
                        className="wlt-icon-btn"
                        onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                        title={isBalanceHidden ? 'Show Balance' : 'Hide Balance'}
                    >
                        {isBalanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            {/* ── Balance Hero Card ── */}
            <motion.div
                className="wlt-balance-card"
                key={activeChain}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
            >
                <div className="wlt-balance-orb" />

                <div className="wlt-balance-top">
                    <div className="wlt-chain-badge">
                        <img src={ICONS[activeChain]} alt={activeChain} />
                        {activeChain === 'solana' ? 'SOL' : 'ETH'}
                    </div>
                    <div
                        className={`wlt-verified-dot ${isCurrentVerified ? '' : 'syncing'}`}
                        title={isCurrentVerified ? 'Verified' : 'Syncing...'}
                    />
                </div>

                <div className="wlt-balance-amount">
                    {isBalanceHidden ? (
                        <span className="wlt-balance-hidden">••••••</span>
                    ) : (
                        <span className="wlt-balance-value">
                            ${totalPortfolioValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            <span className="wlt-currency">USD</span>
                        </span>
                    )}
                </div>

                {/* Address Row */}
                <div className="wlt-address-row">
                    {currentAddress ? (
                        <>
                            <span className="wlt-address-text">{currentAddress}</span>
                            <div className="wlt-address-actions">
                                <button
                                    className="wlt-addr-btn"
                                    onClick={() => {
                                        if (currentAddress) {
                                            navigator.clipboard.writeText(currentAddress);
                                            toast.success('Copied', 'Address copied');
                                        }
                                    }}
                                    title="Copy"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    className="wlt-addr-btn"
                                    onClick={() => setShowReceiveModal(true)}
                                    title="QR Code"
                                >
                                    <QrCode size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <span className="wlt-address-empty">
                            <Loader2 size={12} className="animate-spin" />
                            {ready ? 'Syncing wallet...' : 'Connecting...'}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* ── Quick Actions ── */}
            <motion.div
                className="wlt-actions-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <motion.div className="wlt-action-item" onClick={handleCreateOrDeposit} whileTap={{ scale: 0.95 }}>
                    <motion.button 
                        className={`wlt-action-circle deposit ${isCreating ? 'disabled' : ''}`}
                        whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(201, 168, 76, 0.4)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        {isCreating ? <Loader2 size={20} className="animate-spin" /> : <ArrowDownLeft size={20} />}
                    </motion.button>
                    <span className="wlt-action-label">Deposit</span>
                </motion.div>

                <motion.div className="wlt-action-item" onClick={currentAddress ? handleWithdrawClick : undefined} whileTap={{ scale: 0.95 }}>
                    <motion.button 
                        className={`wlt-action-circle withdraw ${!currentAddress ? 'disabled' : ''}`}
                        whileHover={{ y: -3, boxShadow: '0 8px 20px var(--shadow-color)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        <Send size={20} />
                    </motion.button>
                    <span className="wlt-action-label">Withdraw</span>
                </motion.div>


                <motion.div className="wlt-action-item" onClick={handleRefresh} whileTap={{ scale: 0.95 }}>
                    <motion.button 
                        className={`wlt-action-circle refresh ${isRefreshing ? 'disabled' : ''}`}
                        whileHover={{ y: -3, boxShadow: '0 8px 20px var(--shadow-color)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </motion.button>
                    <span className="wlt-action-label">Refresh</span>
                </motion.div>
            </motion.div>

            {/* ── Content Grid (Assets + History) ── */}
            <div className="wlt-content-grid">
                {/* Assets */}
                <div>
                    <div className="wlt-section-header">
                        <span className="wlt-section-title">Assets</span>
                    </div>
                    <div className="wlt-list-container">
                        {assets.map((asset, i) => (
                            <motion.div
                                key={asset.symbol}
                                className="wlt-asset-row"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                                whileHover={{ scale: 1.01, y: -2 }}
                            >
                                <div className="wlt-asset-left">
                                    <div className="wlt-asset-icon">
                                        <img src={asset.icon} alt={asset.name} />
                                    </div>
                                    <div>
                                        <p className="wlt-asset-name">{asset.symbol}</p>
                                        <p className="wlt-asset-sub">
                                            {asset.name} &bull; ${asset.price.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="wlt-asset-right">
                                    <p className="wlt-asset-bal">
                                        {isBalanceHidden ? '••••' : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                    </p>
                                    <p className="wlt-asset-val">
                                        {isBalanceHidden ? '••••' : `$${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Transactions */}
                <div>
                    <div className="wlt-section-header">
                        <span className="wlt-section-title">History</span>
                        <button
                            className="wlt-section-action"
                            onClick={() =>
                                window.open(
                                    activeChain === 'solana'
                                        ? `https://solscan.io/account/${activeWallet?.address}`
                                        : `https://etherscan.io/address/${activeWallet?.address}`,
                                    '_blank'
                                )
                            }
                        >
                            Explorer <ExternalLink size={12} />
                        </button>
                    </div>

                    {txLoading ? (
                        <div className="wlt-empty">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Syncing...</span>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="wlt-empty">
                            <ArrowRightLeft size={24} />
                            <span>No recent transactions</span>
                        </div>
                    ) : (
                        <div className="wlt-list-container">
                            {transactions.map((tx: any, i: number) => (
                                <motion.div
                                    key={tx.id}
                                    className="wlt-tx-row"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.25, delay: i * 0.04 }}
                                >
                                    <div className="wlt-tx-left">
                                        <div className={`wlt-tx-icon ${tx.tx_type === 'deposit' ? 'deposit' : 'withdraw'}`}>
                                            {tx.tx_type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                        </div>
                                        <div>
                                            <p className="wlt-tx-type">{tx.tx_type} {tx.token_symbol}</p>
                                            <p className="wlt-tx-date">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="wlt-tx-right">
                                        <p className={`wlt-tx-amount ${tx.tx_type === 'deposit' ? 'positive' : 'negative'}`}>
                                            {isBalanceHidden ? '••••' : `${tx.tx_type === 'deposit' ? '+' : '-'}${tx.amount} ${tx.token_symbol}`}
                                        </p>
                                        <span className={`wlt-tx-status ${tx.status}`}>{tx.status}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DEPOSIT MODAL ── */}
            <Modal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                title={`Deposit ${activeChain === 'solana' ? 'SOL' : 'ETH'}`}
                description="Scan or copy your address"
                size="sm"
            >
                {(() => {
                    let displayAddress: string | undefined;
                    if (backendUser?.wallets?.length) {
                        const exactMatch = (backendUser.wallets as any[]).find((w: any) => {
                            const wChain = (w.chainType || w.chain_type || '').toLowerCase();
                            return wChain === activeChain.toLowerCase();
                        });
                        if (exactMatch) displayAddress = exactMatch.address || exactMatch.wallet_address;
                    }
                    if (!displayAddress) {
                        if (activeChain === 'solana' && embeddedSolanaWallet?.address) displayAddress = embeddedSolanaWallet.address;
                        else if (activeChain === 'ethereum' && embeddedEthereumWallet?.address) displayAddress = embeddedEthereumWallet.address;
                    }
                    return (
                        <div className="flex flex-col items-center">
                            {displayAddress ? (
                                <div className="p-4 bg-white rounded-2xl mb-6 shadow-xl border-2 border-gold/10 relative">
                                    <QRCode value={displayAddress} size={200} level="M" viewBox="0 0 256 256" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white p-1 rounded-full shadow-lg">
                                            <img src={ICONS[activeChain]} alt="Chain" className="w-8 h-8" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-theme-elevated rounded-2xl mb-6 border border-theme-border/50 animate-pulse">
                                    <Loader2 className="w-8 h-8 text-gold animate-spin mb-2" />
                                    <span className="text-xs text-theme-muted">Generating...</span>
                                </div>
                            )}
                            <div className="w-full bg-theme-elevated p-4 rounded-xl mb-6 text-center border border-theme-border">
                                {displayAddress ? (
                                    <p className="text-sm font-mono text-theme-text break-all select-all">{displayAddress}</p>
                                ) : (
                                    <div className="h-5 w-3/4 mx-auto bg-theme-bg/50 rounded animate-pulse" />
                                )}
                            </div>
                            <div className="flex justify-center gap-2 mb-6">
                                <img src={ICONS[activeChain]} alt="Native" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" />
                                <img src={ICONS.usdt} alt="USDT" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" />
                                <img src={ICONS.usdc} alt="USDC" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" />
                            </div>
                            <Button className="w-full" variant="gold" onClick={() => {
                                if (displayAddress) {
                                    navigator.clipboard.writeText(displayAddress);
                                    toast.success('Copied', 'Address copied to clipboard');
                                }
                            }} disabled={!displayAddress}>
                                <Copy className="w-4 h-4 mr-2" /> Copy Address
                            </Button>
                        </div>
                    );
                })()}
            </Modal>

            {/* ── WITHDRAW MODAL ── */}
            <Modal
                isOpen={showSendModal}
                onClose={() => { setShowSendModal(false); setShowScanModal(false); setSendAddress(''); setSendAmount(''); }}
                title={`Withdraw ${activeChain === 'solana' ? 'SOL' : 'ETH'}`}
                description="Send to another wallet"
                size="sm"
            >
                {activeChain === 'ethereum' ? (
                    <div className="text-center py-8">
                        <p className="text-theme-muted">ETH withdrawals coming soon.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {!showScanModal && (
                            <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setShowScanModal(true)} leftIcon={<QrCode className="w-4 h-4" />}>
                                    Scan QR
                                </Button>
                            </div>
                        )}
                        {showScanModal ? (
                            <div className="relative overflow-hidden rounded-xl bg-black aspect-square">
                                <QrReader
                                    constraints={{ facingMode: 'environment' }}
                                    onResult={(result: any) => {
                                        if (result?.text) {
                                            setSendAddress(result.text);
                                            setShowScanModal(false);
                                            toast.success('Scanned', 'Address captured.');
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                />
                                <Button variant="secondary" size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10" onClick={() => setShowScanModal(false)}>
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Input label="Recipient" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="Solana address..." />
                                <div>
                                    <Input label="Amount" type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" />
                                    <div className="flex justify-between items-center mt-2 px-1">
                                        <span className="text-xs text-theme-muted">{(solBalance || 0).toFixed(4)} SOL available</span>
                                        <button onClick={() => setSendAmount(solBalance ? (solBalance - 0.0001).toFixed(4) : '0')} className="text-xs text-gold hover:underline font-medium">Max</button>
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="pt-4">
                            <Button variant="primary" className="w-full h-12 text-base" onClick={handleSend} disabled={!sendAddress || !sendAmount || isSending} isLoading={isSending}>
                                {isSending ? 'Processing...' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </motion.div>
    );
}

export default WalletPage;

