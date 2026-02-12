import { useState, useEffect, useCallback } from 'react';
import {
    Wallet,
    Copy,
    ExternalLink,
    Send,
    QrCode,
    RefreshCw,
    ArrowDownLeft,
    Shield,
    CheckCircle,
    Loader2,
    ArrowUpRight,
    TrendingUp,
    ArrowRightLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { QrReader } from 'react-qr-reader';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge, Input, Modal } from '../../../components/ui';
import { usePrivyWallet } from '../../../hooks/usePrivyWallet';
import { useToast } from '../../../stores/useNotificationStore';
import { useWalletTransactions } from '../../../hooks/useWalletData';
import { useTokenPrices } from '../../../hooks/useTokenPrices';
import { useAuthStore } from '../../../stores/useAuthStore';

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
    const { user: backendUser } = useAuthStore();
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
    const activeWallet = activeChain === 'solana' ? embeddedSolanaWallet : embeddedEthereumWallet;

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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchBalances(), refetchTransactions()]);
            toast.success('Updated', 'Portfolio refreshed');
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
        if (backendUser?.walletAddress && ready && !authenticated && !isCreating) {
            // console.log("[WalletPage] Backend auth active but Privy not authenticated. Waiting for silent sync...");

            // DEBOUNCE/DELAY: Give PrivyAuthBridge time to hydrate (silent login)
            const syncTimer = setTimeout(() => {
                // Check status again inside timeout
                if (backendUser?.walletAddress && !authenticated) {
                    console.log("[WalletPage] Silent sync continuing... (User authenticated in backend, waiting for Privy)");
                    // WE DO NOT FORCE LOGIN ANYMORE.
                    // This creates a bad UX ("disappearing wallet" or "random modal").
                    // Instead, we show a "Syncing" state in the UI.

                    /*
                    if (ready) {
                        setPendingDeposit(true);
                        // login(); // Manual override REMOVED
                    }
                    */
                }
            }, 5000);

            return () => clearTimeout(syncTimer);
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

            // 1. Ensure Auth - check both authenticated state and user object
            if (!authenticated || !user) {
                console.warn("[WalletPage] User is not authenticated in Privy. Triggering login.");
                setPendingDeposit(true);
                toast.info("Authentication Required", "Please sign in to create a secure wallet.");
                await login();
                return;
            }

            // 2. Double-check embeddedWallet (Race condition check)
            if (activeWallet) {
                setShowReceiveModal(true);
                return;
            }

            // 3. Check if wallet actually exists in linkedAccounts (but wasn't picked up activeWallet for some reason)
            // This prevents trying to create a wallet that already exists
            const existingAccount = user.linkedAccounts?.find(
                (a: any) => a.type === 'wallet' &&
                    (a.walletClientType === 'privy' || a.connectorType === 'embedded') &&
                    (a.chainType === activeChain || a.chain_type === activeChain)
            );

            if (existingAccount) {
                console.log("[WalletPage] Found existing wallet in linkedAccounts, skipping creation:", existingAccount);
                // We can't easily "set" activeWallet since it's a hook derivation, 
                // but we CAN just show the modal and let the modal read from user.linkedAccounts if activeWallet is null.
                // We'll handle that in the modal logic or just rely on the fallback we added to UsePrivyWallet.
                // If UsePrivyWallet isn't updating fast enough, force a re-check or just open modal if we valid address.
                setShowReceiveModal(true);
                toast.success("Wallet Found", "Accessing your secure wallet...");
                return;
            }

            // 4. Create
            loadingId = toast.info("Securing Wallet", `Generating your unique ${activeChain} identity...`);

            await createWallet();

            // If successful, the hook updates activeWallet, but it might take a moment.
            if (loadingId) toast.dismiss(loadingId);
            toast.success("Success", "Wallet generated successfully!");

            // Allow time for hook to update
            setTimeout(() => {
                fetchBalances();
                setShowReceiveModal(true);
            }, 1000);

        } catch (error: any) {
            console.error("Wallet creation error:", error);
            const errMsg = error?.message || error?.toString();

            if (loadingId) toast.dismiss(loadingId);

            // Handle "User already has an embedded wallet" gracefully
            if (errMsg?.toLowerCase().includes('already has') || errMsg?.toLowerCase().includes('exists')) {
                console.log("[WalletPage] Wallet already exists error caught.");

                // Fallback: Check generic embedded wallet or search again
                // Implementation note: if createWallet failed, it implies Privy knows about the wallet.
                // We should just show the modal and try to display whatever address we can find.

                const fallbackAddress = user?.wallet?.address ||
                    (user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.walletClientType === 'privy') as any)?.address;

                if (fallbackAddress) {
                    toast.info("Wallet Restored", "Your wallet is ready.");
                    setShowReceiveModal(true);
                } else {
                    // Worst case
                    toast.warning("Syncing", "Wallet exists but is syncing. Please refresh.");
                }
            } else if (errMsg?.toLowerCase().includes('allow user to close') || errMsg?.toLowerCase().includes('reject')) {
                toast.error("Cancelled", "Wallet creation was cancelled.");
                setPendingDeposit(false);
            } else {
                toast.error("Creation Failed", "Could not generate wallet. Please try again.");
                setPendingDeposit(false);
            }
        } finally {
            setIsCreating(false);
        }
    }, [activeWallet, embeddedWallet, isCreating, authenticated, login, createWallet, toast, fetchBalances, backendUser?.walletAddress, ready, user?.id]);

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


    // 6. Send Handler (Solana Only for now as requested, but structure supports both)
    const handleSend = async () => {
        if (!sendAddress || !sendAmount || !activeWallet) return;
        if (activeChain === 'ethereum') {
            toast.info("Coming Soon", "ETH sending is coming soon.");
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

            const provider = await (activeWallet as any).getProvider();
            const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(activeWallet.address),
                    toPubkey: new PublicKey(sendAddress),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            transaction.feePayer = new PublicKey(activeWallet.address);
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
            toast.error("Failed", "Transaction failed to send.");
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

    // ... (Render) ...
    return (
        <PageContainer
            title="Seniqu Wallet"
            subtitle="Secure, multi-chain embedded wallet"
        >
            {/* Header / Network Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                {/* Network Switcher */}
                <div className="flex bg-theme-elevated p-1 rounded-xl border border-theme-border self-start">
                    <button
                        onClick={() => setActiveChain('solana')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeChain === 'solana'
                            ? 'bg-gold text-black shadow-lg shadow-gold/20'
                            : 'text-theme-muted hover:text-theme-text'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <img src={ICONS.solana} alt="Solana" className="w-4 h-4" />
                            Solana
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveChain('ethereum')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeChain === 'ethereum'
                            ? 'bg-gold text-black shadow-lg shadow-gold/20'
                            : 'text-theme-muted hover:text-theme-text'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <img src={ICONS.ethereum} alt="Ethereum" className="w-4 h-4" />
                            Ethereum
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant={activeChain === 'solana' ? 'gold' : 'default'} className="hidden sm:flex">
                        {activeChain === 'solana' ? 'Mainnet' : 'Mainnet'}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                        className="text-theme-muted hover:text-gold"
                        title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                    >
                        {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Wallet Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Balance Card */}
                <Card variant="elevated" className="col-span-1 lg:col-span-2 relative overflow-hidden border-gold/20 shadow-xl shadow-black/40">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl border border-gold/10 shadow-inner backdrop-blur-md">
                                    <Wallet className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wider">Total Balance</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default" className="text-[10px] text-theme-muted border-theme-border/50 bg-black/20">
                                            {activeChain} Network
                                        </Badge>
                                        <Badge variant={activeWallet ? "success" : "warning"} className="text-[10px] flex items-center gap-1">
                                            {activeWallet ? <Shield className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                                            {activeWallet ? "Secured" : "Syncing..."}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl md:text-5xl font-bold text-theme-text font-mono tracking-tight">
                                        {isBalanceHidden ? '••••••' : `$${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </span>
                                    {!isBalanceHidden && <span className="text-lg font-medium text-theme-muted">USD</span>}
                                </div>
                            </div>
                        </div>

                        {/* Address Bar */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 backdrop-blur-md flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold mb-1">
                                    Your {activeChain === 'solana' ? 'Solana' : 'Ethereum'} Address
                                </span>
                                {activeWallet || backendUser?.walletAddress || backendUser?.embeddedWalletAddress ? (
                                    <div className="flex items-center gap-2">
                                        <code className={`text-xs md:text-sm font-mono truncate max-w-[150px] md:max-w-xs ${activeWallet ? 'text-theme-text' : 'text-theme-muted opacity-70'}`}>
                                            {activeWallet?.address || backendUser?.walletAddress || backendUser?.embeddedWalletAddress || 'Syncing...'}
                                        </code>
                                        <button
                                            onClick={() => {
                                                const addr = activeWallet?.address || backendUser?.walletAddress || backendUser?.embeddedWalletAddress;
                                                if (addr) {
                                                    navigator.clipboard.writeText(addr);
                                                    toast.success('Copied', 'Address copied');
                                                }
                                            }}
                                            className="text-theme-muted hover:text-gold transition-colors"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        {!activeWallet && (backendUser?.walletAddress || backendUser?.embeddedWalletAddress) && (
                                            <Badge variant="gold" className="text-[9px] h-4 px-1 ml-2 border-gold/30 text-gold/80 animate-pulse">
                                                By Seniqu
                                            </Badge>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-theme-muted italic">
                                        <span>Wallet locked or initializing...</span>
                                        <button onClick={handleCreateOrDeposit} className="text-gold hover:underline not-italic ml-2">
                                            Unlock
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setShowReceiveModal(true)}
                                    className="h-8 w-8 p-0 rounded-lg bg-white/5 hover:bg-white/10 text-theme-text"
                                    title="Show QR"
                                >
                                    <QrCode className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Actions Panel */}
                <div className="col-span-1 flex flex-col gap-4">
                    <Card variant="default" className="flex-1 flex flex-col justify-center gap-3 p-5 border-theme-border/60 bg-theme-elevated/30">
                        <h4 className="text-sm font-bold text-theme-text mb-1 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-gold" />
                            Quick Actions
                        </h4>

                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                            <Button
                                variant="gold"
                                className="w-full justify-center lg:justify-start h-12 text-sm font-bold shadow-gold/10 hover:shadow-gold/20 transition-all"
                                onClick={handleCreateOrDeposit}
                                isLoading={isCreating}
                                leftIcon={<ArrowDownLeft className="w-4 h-4" />}
                            >
                                Deposit
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full justify-center lg:justify-start h-12 text-sm font-bold border-theme-border hover:border-gold/30 bg-theme-bg"
                                onClick={() => setShowSendModal(true)}
                                disabled={!activeWallet}
                                leftIcon={<Send className="w-4 h-4" />}
                            >
                                Withdraw
                            </Button>
                        </div>
                    </Card>

                    {/* Mini Security Card (Mobile Compact) */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-4 border border-blue-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-100">Bank-Grade Security</p>
                                <p className="text-[10px] text-blue-200/60">Non-custodial & Encrypted</p>
                            </div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500 opacity-80" />
                    </div>
                </div>
            </div>

            {/* Assets & Activity Tabs (or Split View) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Assets & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Assets List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
                                Your Assets
                            </h3>
                            <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors">
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {assets.map((asset) => (
                                <div key={asset.symbol} className="flex items-center justify-between p-4 rounded-xl bg-theme-elevated/40 border border-theme-border hover:border-gold/30 hover:bg-theme-elevated/60 transition-all group cursor-default">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-bg p-2 border border-theme-border group-hover:border-gold/20 transition-colors">
                                            <img src={asset.icon} alt={asset.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-theme-text">{asset.symbol}</p>
                                            <p className="text-xs text-theme-muted flex items-center gap-1">
                                                {asset.name}
                                                <span className="w-0.5 h-0.5 rounded-full bg-theme-muted/50" />
                                                ${asset.price.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-theme-text">
                                            {isBalanceHidden ? '••••' : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                        </p>
                                        <p className="text-xs text-theme-muted">
                                            {isBalanceHidden ? '••••' : `$${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transactions */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
                                History
                            </h3>
                            <Button variant="ghost" size="sm" className="text-xs text-theme-muted hover:text-gold" onClick={() => window.open(activeChain === 'solana' ? `https://solscan.io/account/${activeWallet?.address}` : `https://etherscan.io/address/${activeWallet?.address}`, '_blank')}>
                                View Explorer <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                        <Card variant="elevated" className="overflow-hidden min-h-[150px] border-theme-border/50">
                            {txLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                                    <Loader2 className="w-5 h-5 animate-spin mb-2 opacity-50" />
                                    <span className="text-xs">Syncing history...</span>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-theme-muted/40">
                                    <ArrowRightLeft className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">No recent transactions</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-theme-border/50">
                                    {transactions.map((tx: any) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-theme-elevated/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.tx_type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {tx.tx_type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-theme-text capitalize">{tx.tx_type} {tx.token_symbol}</p>
                                                    <p className="text-[10px] text-theme-muted">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${tx.tx_type === 'deposit' ? 'text-green-400' : 'text-theme-text'}`}>
                                                    {isBalanceHidden ? '••••' : `${tx.tx_type === 'deposit' ? '+' : '-'}${tx.amount} ${tx.token_symbol}`}
                                                </p>
                                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${tx.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                                    tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Right Column: Info & Tips (Mobile: Bottom) */}
                <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-theme-elevated to-theme-bg border border-theme-border/50">
                        <h4 className="text-sm font-bold text-theme-text mb-3">Wallet Features</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-xs text-theme-muted">
                                <Shield className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                                <span>
                                    <strong className="text-theme-text">Non-Custodial:</strong> You own your keys. Encrypted locally on your device properly.
                                </span>
                            </li>
                            <li className="flex items-start gap-3 text-xs text-theme-muted">
                                <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span>
                                    <strong className="text-theme-text">Auto-Sync:</strong> Transactions update in real-time across devices.
                                </span>
                            </li>
                        </ul>
                    </div>

                    <Card variant="default" className="p-4 border-theme-border/30 bg-theme-bg/30">
                        <p className="text-xs text-theme-muted text-center italic">
                            "Secure navigation is our priority. Always check the URL before connecting."
                        </p>
                    </Card>
                </div>
            </div>

            {/* DEPOSIT MODAL */}
            <Modal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                title={`Deposit ${activeChain === 'solana' ? 'Solana' : 'Ethereum'} Assets`}
                description={`Scan to deposit funds into your selected network`}
                size="sm"
            >
                <div className="flex flex-col items-center">
                    <div className="p-4 bg-white rounded-2xl mb-6 shadow-xl shadow-gold/5 border-2 border-gold/10">
                        <QRCode
                            value={activeWallet?.address || 'Loading...'}
                            size={200}
                            level="M"
                            viewBox={`0 0 256 256`}
                        />
                    </div>

                    <div className="w-full bg-theme-elevated p-4 rounded-xl mb-6 text-center border border-theme-border">
                        <p className="text-xs text-theme-muted mb-2 uppercase tracking-wide">Your {activeChain} Address</p>
                        <p className="text-sm font-mono text-theme-text break-all select-all">
                            {activeWallet?.address || 'Generating...'}
                        </p>
                    </div>

                    <div className="flex justify-center gap-2 mb-6">
                        {/* Supported Tokens Icons */}
                        <img src={ICONS[activeChain]} alt="Native" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" title={`Native ${activeChain}`} />
                        <img src={ICONS.usdt} alt="USDT" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" title="USDT" />
                        <img src={ICONS.usdc} alt="USDC" className="w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" title="USDC" />
                    </div>

                    <Button className="w-full" variant="gold" onClick={() => {
                        if (activeWallet?.address) {
                            navigator.clipboard.writeText(activeWallet.address);
                            toast.success('Copied', 'Address copied to clipboard');
                        }
                    }} disabled={!activeWallet}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Address
                    </Button>
                </div>
            </Modal>

            {/* WITHDRAW MODAL */}
            <Modal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                title={`Withdraw ${activeChain === 'solana' ? 'SOL' : 'ETH'}`}
                description="Send funds to another wallet"
                size="sm"
            >
                {activeChain === 'ethereum' ? (
                    <div className="text-center py-8">
                        <p className="text-theme-muted">Ethereum withdrawals are currently disabled for maintenance.</p>
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
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
                                    onClick={() => setShowScanModal(false)}
                                >
                                    Cancel Scan
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Input
                                    label="Recipient Address"
                                    value={sendAddress}
                                    onChange={(e) => setSendAddress(e.target.value)}
                                    placeholder="Enter Solana address..."
                                />

                                <div>
                                    <Input
                                        label="Amount"
                                        type="number"
                                        value={sendAmount}
                                        onChange={(e) => setSendAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                    <div className="flex justify-between items-center mt-2 px-1">
                                        <span className="text-xs text-theme-muted">Available: {(solBalance || 0).toFixed(4)} SOL</span>
                                        <button
                                            onClick={() => setSendAmount(solBalance ? (solBalance - 0.0001).toFixed(4) : '0')}
                                            className="text-xs text-gold hover:underline font-medium"
                                        >
                                            Max
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <Button
                                variant="primary"
                                className="w-full h-12 text-base"
                                onClick={handleSend}
                                disabled={!sendAddress || !sendAmount || isSending}
                                isLoading={isSending}
                            >
                                {isSending ? 'Processing...' : 'Confirm Withdrawal'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </PageContainer>
    );
}

export default WalletPage;
