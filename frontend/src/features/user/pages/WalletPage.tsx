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
    History,
    ArrowUpRight,
    TrendingUp,
    ArrowRightLeft
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { QrReader } from 'react-qr-reader';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge, Input, Modal } from '../../../components/ui';
import { usePrivyWallet } from '../../../hooks/usePrivyWallet';
import { useToast } from '../../../stores/useNotificationStore';
import { useWalletTransactions } from '../../../hooks/useWalletData';
import { useTokenPrices } from '../../../hooks/useTokenPrices';

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

function WalletAddress({ address, label, chain }: { address: string; label?: string; chain: ChainType }) {
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            toast.success('Copied!', 'Address copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Error', 'Failed to copy address');
        }
    };

    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Explorer URL based on chain
    const explorerUrl = chain === 'solana'
        ? `https://solscan.io/account/${address}?cluster=devnet`
        : `https://etherscan.io/address/${address}`;

    return (
        <div className="flex items-center gap-3">
            {label && (
                <span className="text-xs text-theme-muted">{label}</span>
            )}
            <code className="text-sm font-mono text-theme-text bg-theme-elevated px-3 py-1.5 rounded-lg border border-theme-border">
                {shortAddr}
            </code>
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                title="Copy address"
            >
                {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                    <Copy className="w-4 h-4" />
                )}
            </button>
            <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                title={`View on ${chain === 'solana' ? 'Solscan' : 'Etherscan'}`}
            >
                <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    );
}

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

    // Send Form
    const [sendAmount, setSendAmount] = useState('');
    const [sendAddress, setSendAddress] = useState('');
    const [isSending, setIsSending] = useState(false);

    // 3. Derived Helpers
    // If activeChain is Solana, we want the solana wallet. If not available, but generic wallet exists, 
    // we might still be able to use it if Privy allows cross-chain derivation (or it just hasn't loaded securely yet).
    const activeWallet = activeChain === 'solana' ? embeddedSolanaWallet : embeddedEthereumWallet;

    // Fallback: If we don't have the specific chain wallet but have A wallet, we can show that address 
    // (though strictly speaking we should have both).
    // For now, adhere to strict types.


    // 4. Fetch Logic
    const fetchBalances = useCallback(async () => {
        // Fetch Solana
        if (embeddedSolanaWallet?.address) {
            try {
                const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
                const pubKey = new PublicKey(embeddedSolanaWallet.address);
                const bal = await connection.getBalance(pubKey);
                setSolBalance(bal / LAMPORTS_PER_SOL);
            } catch (err) {
                console.error("[WalletPage] Sol balance error", err);
            }
        }

        // Fetch Ethereum
        if (embeddedEthereumWallet?.address) {
            try {
                const provider = await (embeddedEthereumWallet as any).getProvider();
                // EIP-1193 request
                const balHex = await provider.request({
                    method: 'eth_getBalance',
                    params: [embeddedEthereumWallet.address, 'latest']
                });
                const balWei = parseInt(balHex, 16);
                setEthBalance(balWei / 1e18);
            } catch (err) {
                console.error("[WalletPage] Eth balance error", err);
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

        // B. If ANY embedded wallet exists -> Show modal with warning if address missing
        // Prevents loop of trying to create duplicate wallet
        if (embeddedWallet) {
            console.warn("[WalletPage] Embedded wallet exists, but active chain address is missing. Showing modal anyway.");
            setShowReceiveModal(true);
            return;
        }

        // C. No wallet at all -> Create one.
        if (isCreating) return; // Prevent double clicks

        setIsCreating(true);
        let loadingId: string | undefined;

        try {
            // 0. Wait for Privy to be ready
            if (!ready) {
                console.warn("[WalletPage] Privy not ready yet. Ignoring click.");
                return;
            }

            console.log("[WalletPage] handleCreateOrDeposit state:", { ready, authenticated, user: user?.id });

            // 1. Ensure Auth
            // Professional UX:
            // Since we are on Free Plan (Client-Side Auth), we MUST be authenticated with Privy to create a wallet.
            // If the user is logged into Backend but not Privy (desync), we must prompt them to log in to Privy again.
            if (!authenticated) {
                console.warn("[WalletPage] User is not authenticated in Privy. Triggering login.");
                setPendingDeposit(true);
                toast.info("Authentication Required", "Please sign in to create a wallet.");
                await login();
                return;
            }

            // 2. Double-check embeddedWallet didn't appear after login (Race condition check)
            // We re-check the ref/state here right before action
            if (embeddedWallet) {
                setShowReceiveModal(true);
                return;
            }

            // 3. Create
            loadingId = toast.info("Securing Wallet", "Generating your unique on-chain identity...");

            const wallet = await createWallet();

            if (loadingId) toast.dismiss(loadingId);

            if (wallet) {
                toast.success("Success", "Wallet generated successfully!");

                // Force a refresh of wallet list and balances
                // Small delay ensures Privy state updates propagate
                setTimeout(() => {
                    fetchBalances();
                    setShowReceiveModal(true);
                }, 1000);
            }
        } catch (error: any) {
            console.error("Wallet creation error:", error);
            const errMsg = error?.message || error?.toString();

            if (loadingId) toast.dismiss(loadingId);

            // Handle "User already has an embedded wallet" gracefully
            if (errMsg?.toLowerCase().includes('already has') || errMsg?.toLowerCase().includes('exists')) {
                toast.success("Wallet Found", "Opening existing wallet...");
                setShowReceiveModal(true);
            } else if (errMsg?.toLowerCase().includes('allow user to close') || errMsg?.toLowerCase().includes('reject')) {
                // User closed the modal
                toast.error("Cancelled", "Wallet creation was cancelled.");
                setPendingDeposit(false); // Clear pending if user cancelled
            } else {
                toast.error("Creation Failed", "Could not generate wallet. Please try again.");
                setPendingDeposit(false);
            }
        } finally {
            setIsCreating(false);
        }
    }, [activeWallet, embeddedWallet, isCreating, authenticated, login, createWallet, toast, fetchBalances]);

    // Effect: Handle Auto-Deposit after Login
    useEffect(() => {
        // Only proceed if user clicked Deposit (pendingDeposit) AND is now authenticated
        if (authenticated && pendingDeposit && !isCreating) {
            // If wallet already appeared (e.g. from createOnLogin), just show it
            if (activeWallet || embeddedWallet) {
                setPendingDeposit(false);
                setShowReceiveModal(true);
                // toast.success('Welcome back!', 'Wallet ready.');
            } else {
                // If no wallet yet, trigger creation automatically
                // We use a small timeout to let Privy state settle if it just logged in
                const timer = setTimeout(() => {
                    handleCreateOrDeposit();
                }, 500);
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
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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
                    price: prices.solana,
                    value: solBalance * prices.solana,
                    icon: ICONS.solana,
                    isNative: true
                },
                {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: 0, // Mock for now
                    price: prices['usd-coin'],
                    value: 0,
                    icon: ICONS.usdc
                },
                {
                    symbol: 'USDT',
                    name: 'Tether',
                    balance: 0, // Mock for now
                    price: prices.tether,
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
                    price: prices.ethereum,
                    value: ethBalance * prices.ethereum,
                    icon: ICONS.ethereum,
                    isNative: true
                },
                {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: 0,
                    price: prices['usd-coin'],
                    value: 0,
                    icon: ICONS.usdc
                },
                {
                    symbol: 'USDT',
                    name: 'Tether',
                    balance: 0,
                    price: prices.tether,
                    value: 0,
                    icon: ICONS.usdt
                }
            ];
        }
    };

    const assets = getAssets();
    const totalPortfolioValue = assets.reduce((acc, curr) => acc + curr.value, 0);

    // ============================================
    // RENDER
    // ============================================

    return (
        <PageContainer
            title="Seniqu Wallet"
            subtitle="Secure, multi-chain embedded wallet"
        >
            {/* Header / Network Toggle */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex bg-theme-elevated p-1 rounded-xl border border-theme-border">
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

                <Badge variant={activeChain === 'solana' ? 'gold' : 'default'} className="hidden sm:flex">
                    {activeChain === 'solana' ? 'Devnet' : 'Mainnet'}
                </Badge>
            </div>

            {/* Wallet Overview */}
            <StatsGrid>
                {/* Main Balance Card */}
                <Card variant="elevated" className="col-span-full sm:col-span-2 relative overflow-hidden border-gold/20">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl border border-gold/10 shadow-inner">
                                    <Wallet className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-theme-text">Total Balance</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="default" className="text-[10px] uppercase tracking-wider text-theme-muted border-theme-border">
                                            {activeChain}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 rounded-lg hover:bg-theme-bg/50 text-theme-muted hover:text-gold transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-end gap-2">
                                <p className="text-5xl font-bold text-theme-text font-mono tracking-tight">
                                    ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className="text-lg font-medium text-theme-muted mb-2">USD</span>
                            </div>
                        </div>

                        <div className="bg-theme-bg/40 rounded-xl p-4 border border-theme-border/50 backdrop-blur-sm">
                            <p className="text-xs text-theme-muted mb-2 uppercase tracking-wider font-semibold">
                                Your {activeChain === 'solana' ? 'Solana' : 'Ethereum'} Address
                            </p>
                            {activeWallet ? (
                                <WalletAddress address={activeWallet.address} chain={activeChain} />
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-theme-muted italic">
                                    <span>Wallet not created yet.</span>
                                    <button onClick={handleCreateOrDeposit} className="text-gold hover:underline not-italic">Create now</button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Quick Actions */}
                <div className="col-span-full sm:col-span-1 grid grid-rows-3 gap-3">
                    <Button
                        variant="gold"
                        className="h-full w-full justify-start px-6 text-base font-semibold shadow-gold/5"
                        onClick={handleCreateOrDeposit}
                        isLoading={isCreating}
                        leftIcon={<ArrowDownLeft className="w-5 h-5" />}
                    >
                        Deposit
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-full w-full justify-start px-6 text-base font-semibold border-theme-border hover:border-gold/30"
                        onClick={() => setShowSendModal(true)}
                        disabled={!activeWallet}
                        leftIcon={<Send className="w-5 h-5" />}
                    >
                        Withdraw
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-full w-full justify-start px-6 text-base font-semibold border-theme-border hover:border-gold/30"
                        onClick={handleCreateOrDeposit}
                        leftIcon={<QrCode className="w-5 h-5" />}
                    >
                        Show QR
                    </Button>
                </div>
            </StatsGrid>

            {/* Assets & History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Assets */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Assets List */}
                    <div>
                        <h3 className="text-lg font-bold text-theme-text mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-gold" />
                            Your Assets
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {assets.map((asset) => (
                                <Card key={asset.symbol} variant="elevated" className="flex items-center justify-between p-4 hover:border-gold/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-theme-bg p-2 border border-theme-border group-hover:border-gold/20 transition-colors">
                                            <img src={asset.icon} alt={asset.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-theme-text text-lg">{asset.symbol}</p>
                                            <p className="text-xs text-theme-muted flex items-center gap-1">
                                                {asset.name}
                                                <span className="w-1 h-1 rounded-full bg-theme-muted/50" />
                                                ${asset.price.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-theme-text text-lg">{asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                                        <p className="text-sm text-theme-muted">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Transactions */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
                                <History className="w-5 h-5 text-gold" />
                                Activity
                            </h3>
                            <Button variant="ghost" size="sm" className="text-xs text-theme-muted hover:text-gold">View Explorer</Button>
                        </div>
                        <Card variant="elevated" className="overflow-hidden min-h-[200px]">
                            {txLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-50" />
                                    <span className="text-sm">Syncing history...</span>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-theme-muted/50">
                                    <ArrowRightLeft className="w-8 h-8 mb-2" />
                                    <span className="text-sm">No recent transactions</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-theme-border">
                                    {transactions.map((tx: any) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-theme-elevated/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.tx_type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {tx.tx_type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-theme-text capitalize">{tx.tx_type} {tx.token_symbol}</p>
                                                    <p className="text-xs text-theme-muted">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${tx.tx_type === 'deposit' ? 'text-green-400' : 'text-theme-text'}`}>
                                                    {tx.tx_type === 'deposit' ? '+' : '-'}{tx.amount} {tx.token_symbol}
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

                {/* Right Column: Security */}
                <div className="space-y-6">
                    {/* Security Info Card */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-theme-text">Unbreakable Security</h4>
                        </div>
                        <p className="text-xs text-theme-muted leading-relaxed relative z-10 mb-4">
                            Your assets are secured by Privy's embedded wallet technology and the {activeChain === 'solana' ? 'Solana' : 'Ethereum'} blockchain.
                            We never store your private keys. You retain full control.
                        </p>
                        <ul className="space-y-2 relative z-10">
                            <li className="flex items-center gap-2 text-xs text-theme-muted">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Non-custodial Architecture
                            </li>
                            <li className="flex items-center gap-2 text-xs text-theme-muted">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Instant Settlements
                            </li>
                        </ul>
                    </div>

                    {/* Info Card */}
                    <Card variant="default" className="p-5 border-theme-border/50">
                        <h4 className="text-sm font-bold text-theme-text mb-2">Did you know?</h4>
                        <p className="text-xs text-theme-muted">
                            You can deposit USDC or USDT directly to get started with trading Arts instantly.
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
