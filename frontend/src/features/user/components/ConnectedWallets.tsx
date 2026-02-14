import { useState, useEffect, useCallback } from 'react';
import {
    MoreVertical,
    ArrowRightLeft,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardContent,
    Button,
    Badge,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Modal,
    Input
} from '../../../components/ui';
import { useConnectedWallets, useUnlinkWallet } from '../../../hooks/useUser';
import { useToast } from '../../../stores/useNotificationStore';
import { usePrivyWallet } from '../../../hooks/usePrivyWallet';
import { usePrivy } from '@privy-io/react-auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Transaction, SystemProgram } from '@solana/web3.js';
import { useAuthStore } from '../../../stores/useAuthStore';

// ============================================
// WALLET PROVIDER LOGOS & INFO
// ============================================

const WALLET_LOGOS: Record<string, { name: string; logo: string; color: string }> = {
    phantom: { name: 'Phantom', logo: '/images/wallets/phantom.svg', color: 'text-purple-500' },
    metamask: { name: 'MetaMask', logo: '/images/wallets/metamask.svg', color: 'text-orange-500' },
    solflare: { name: 'Solflare', logo: '/images/wallets/solflare.svg', color: 'text-orange-400' },
    walletconnect: { name: 'WalletConnect', logo: '/images/wallets/walletconnect.svg', color: 'text-blue-500' },
    embedded: { name: 'Seniqu Wallet', logo: '/logo.svg', color: 'text-gold' },
};

function getWalletInfo(provider: string) {
    const p = provider.toLowerCase();
    for (const [key, info] of Object.entries(WALLET_LOGOS)) {
        if (p.includes(key)) return info;
    }
    return { name: 'Wallet', logo: '', color: 'text-theme-text' };
}

// ============================================
// MAIN COMPONENT
// ============================================

// 52: export function ConnectedWallets({ user }: { user?: any }) {
export function ConnectedWallets({ user }: { user?: any }) {
    const { data: wallets, isLoading } = useConnectedWallets();
    const unlinkWallet = useUnlinkWallet();
    const toast = useToast();
    const { embeddedWallet, externalWallets } = usePrivyWallet();
    const { connectWallet } = usePrivy();
    const { user: authUser } = useAuthStore();

    // Use passed user (fresh) or store user (fallback)
    const backendUser = user || authUser;

    // FILTER: Only show wallets that are known to the backend (Anti-Hacking)
    // We trust 'wallets' from 'useConnectedWallets' (Privy SDK) but we mark them as verified/unverified
    // or strictly filter them.
    // Let's filter to ensure we only display what the backend knows about, 
    // OR display all but add a verification badge.

    // For now, let's map the backend verification status to the privy wallets.
    // STRICT REQUIREMENT: Only show the ONE wallet used for login (from wallet_logins) if it's external.
    // If user logged in with Email/Google, this list should be EMPTY.
    // STRICT REQUIREMENT: Only show wallets from 'wallet_logins' (external wallets)
    // We filter backendUser.wallets for !isEmbedded
    const displayWallets = (() => {
        if (!backendUser?.wallets || !Array.isArray(backendUser.wallets)) return [];

        // 1. Filter for external wallets (from wallet_logins)
        const externalWallets = backendUser.wallets.filter((w: any) => {
            const isEmbedded = w.isEmbedded || w.is_embedded || w.privy_wallet_id || w.walletClientType === 'privy';
            return !isEmbedded;
        });

        // 2. Map to display format
        return externalWallets.map((w: any) => {
            const address = w.address || w.wallet_address;

            // Check connection status loosely
            const privyConnection = (wallets || []).find((pw: any) =>
                pw.walletAddress?.toLowerCase() === address?.toLowerCase()
            );

            return {
                id: w.id || `login-wallet-${address}`,
                walletAddress: address,
                chain: w.chainType || w.chain_type || 'solana',
                provider: w.provider || 'external',
                isEmbedded: false,
                isPrimary: true, // All login wallets are considered verified/primary in this view
                isVerified: true,
                label: null,
                ...privyConnection // Merge connection status if available
            };
        });
    })();

    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [selectedSourceWallet, setSelectedSourceWallet] = useState<any>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [selectedWithdrawDestination, setSelectedWithdrawDestination] = useState<any>(null);

    // Per-wallet SOL balances
    const [balances, setBalances] = useState<Record<string, number | null>>({});
    const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

    // Fetch SOL balance for a single address
    const fetchBalance = useCallback(async (address: string): Promise<number | null> => {
        try {
            const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');
            const publicKey = new PublicKey(address);
            const balanceInLamports = await connection.getBalance(publicKey);
            return balanceInLamports / LAMPORTS_PER_SOL;
        } catch {
            return null;
        }
    }, []);

    // Fetch balances for all wallets
    const refreshBalances = useCallback(async () => {
        if (!wallets || wallets.length === 0) return;
        setIsRefreshingBalances(true);
        try {
            const results: Record<string, number | null> = {};
            await Promise.all(
                wallets.map(async (w: any) => {
                    if (w.chain === 'solana') {
                        results[w.walletAddress] = await fetchBalance(w.walletAddress);
                    }
                })
            );
            setBalances(results);
        } finally {
            setIsRefreshingBalances(false);
        }
    }, [wallets, fetchBalance]);

    // Auto-fetch on mount and when wallets change
    useEffect(() => {
        if (wallets && wallets.length > 0) {
            refreshBalances();
        }
    }, [wallets?.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate total balance (null-safe)
    const totalBalance = Object.values(balances).reduce<number>(
        (sum, b) => sum + (b ?? 0), 0
    );

    const handleUnlink = async (walletId: string) => {
        if (confirm('Are you sure you want to unlink this wallet?')) {
            try {
                await unlinkWallet.mutateAsync(walletId);
                toast.success('Wallet Unlinked', 'The wallet has been removed from your account.');
            } catch {
                toast.error('Error', 'Failed to unlink wallet.');
            }
        }
    };

    const initiateTransfer = async (walletData: any) => {
        if (!embeddedWallet) {
            toast.error('No App Wallet', 'You do not have a Seniqu App Wallet setup yet.');
            return;
        }

        const activeSourceWallet = externalWallets.find(w =>
            w.address.toLowerCase() === walletData.walletAddress.toLowerCase()
        );

        if (!activeSourceWallet) {
            toast.info('Connect Wallet', `Please connect your ${walletData.provider} wallet to transfer funds.`);
            connectWallet();
            return;
        }

        setSelectedSourceWallet(activeSourceWallet);
        setTransferModalOpen(true);
    };

    const handleTransfer = async () => {
        if (!selectedSourceWallet || !embeddedWallet || !transferAmount) return;

        setIsTransferring(true);
        try {
            const amount = parseFloat(transferAmount);
            if (isNaN(amount) || amount <= 0) {
                toast.error('Invalid Amount', 'Please enter a valid amount.');
                setIsTransferring(false);
                return;
            }

            const provider = await selectedSourceWallet.getProvider();
            const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(selectedSourceWallet.address),
                    toPubkey: new PublicKey(embeddedWallet.address),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            transaction.feePayer = new PublicKey(selectedSourceWallet.address);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            try {
                const signedTx = await provider.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction(signature);

                toast.success('Transfer Successful', `Transferred ${amount} SOL to your App Wallet.`);
                setTransferModalOpen(false);
                setTransferAmount('');
                refreshBalances();
            } catch (txError: any) {
                console.error("Tx Error", txError);
                if (txError.message?.includes("User rejected")) {
                    toast.info("Cancelled", "Transaction cancelled by user.");
                } else {
                    toast.error('Transfer Failed', 'Could not complete the transaction. Ensure you have enough SOL.');
                }
            }

        } catch (error) {
            console.error('Transfer error:', error);
            toast.error('Error', 'An error occurred during transfer.');
        } finally {
            setIsTransferring(false);
        }
    };

    const initiateWithdraw = async () => {
        if (!embeddedWallet) {
            toast.error('No App Wallet', 'You do not have a Seniqu App Wallet setup yet.');
            return;
        }

        // Filter valid destinations (external wallets)
        const validDestinations = wallets.filter((w: any) => !w.isEmbedded && w.chain === 'solana');

        if (validDestinations.length === 0) {
            toast.error('No Linked Wallets', 'Please connect an external wallet (like Phantom) to withdraw funds to.');
            return;
        }

        // Default to first available or primary
        const primary = validDestinations.find((w: any) => w.isPrimary) || validDestinations[0];
        setSelectedWithdrawDestination(primary);
        setWithdrawModalOpen(true);
    };

    const handleWithdraw = async () => {
        if (!selectedWithdrawDestination || !embeddedWallet || !transferAmount) return;

        setIsTransferring(true);
        try {
            const amount = parseFloat(transferAmount);
            if (isNaN(amount) || amount <= 0) {
                toast.error('Invalid Amount', 'Please enter a valid amount.');
                setIsTransferring(false);
                return;
            }

            // Withdraw from Embedded Wallet -> External Wallet
            // ROBUST PROVIDER: Get the actual signer wallet from the list
            // 'embeddedWallet' from usePrivyWallet might be the fallback object without getProvider
            const signerWallet = wallets.find((w: any) =>
                w.walletClientType === 'privy' &&
                (w.chainType === 'solana')
            );

            if (!signerWallet || typeof (signerWallet as any).getProvider !== 'function') {
                toast.error("Wallet Error", "Signer not available. Please refresh.");
                setIsTransferring(false);
                return;
            }

            const provider = await (signerWallet as any).getProvider();
            const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(signerWallet.address),
                    toPubkey: new PublicKey(selectedWithdrawDestination.walletAddress),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            transaction.feePayer = new PublicKey(signerWallet.address);
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            try {
                const signedTx = await provider.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction(signature);

                toast.success('Withdrawal Successful', `Sent ${amount} SOL to ${selectedWithdrawDestination.label || 'your wallet'}.`);
                setWithdrawModalOpen(false);
                setTransferAmount('');
                refreshBalances();
            } catch (txError: any) {
                console.error("Tx Error", txError);
                toast.error('Withdrawal Failed', 'Could not complete the transaction. Ensure you have enough SOL for fees.');
            }

        } catch (error) {
            console.error('Withdraw error:', error);
            toast.error('Error', 'An error occurred during withdrawal.');
        } finally {
            setIsTransferring(false);
        }
    };

    if (isLoading) {
        return (
            <Card variant="elevated">
                <CardHeader title="Connected Wallets" />
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-16 bg-theme-bg rounded-xl" />
                        <div className="h-16 bg-theme-bg rounded-xl" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="elevated">
            <CardHeader
                title="Connected Wallets"
                action={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshBalances}
                            disabled={isRefreshingBalances}
                            className="p-2 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                            title="Refresh balances"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
                        </button>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                            Manage
                        </Button>
                    </div>
                }
            />
            <CardContent className="space-y-3">
                {/* Total Balance Summary */}
                {wallets && wallets.length > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gold/5 to-transparent border border-gold/10 mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-theme-muted">Total Balance</span>
                            <Badge variant="gold" className="text-[10px] px-1.5 py-0">SOL</Badge>
                        </div>
                        <div className="flex items-end gap-1.5">
                            {isRefreshingBalances ? (
                                <Loader2 className="w-4 h-4 text-gold animate-spin" />
                            ) : (
                                <>
                                    <span className="text-lg font-bold text-theme-text font-mono">
                                        {totalBalance.toFixed(4)}
                                    </span>
                                    <span className="text-xs text-gold mb-0.5">SOL</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Wallet List */}
                {displayWallets.map((wallet: any) => {
                    const info = getWalletInfo(wallet.provider || 'external');
                    const walletBalance = balances[wallet.walletAddress];
                    return (
                        <div
                            key={wallet.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-theme-bg border border-theme-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-theme-elevated flex items-center justify-center flex-shrink-0">
                                    {info.logo ? (
                                        <img
                                            src={info.logo}
                                            alt={info.name}
                                            className="w-6 h-6"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className={`w-6 h-6 rounded-full bg-theme-border ${info.color}`} />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-theme-text text-sm">
                                            {wallet.label || info.name}
                                        </p>
                                        {wallet.isPrimary && (
                                            <Badge variant="gold" className="text-[10px] py-0 h-4">Primary</Badge>
                                        )}
                                        {wallet.isEmbedded && (
                                            <Badge variant="default" className="text-[10px] py-0 h-4">Embedded</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-theme-muted font-mono">
                                            {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                                        </p>
                                        <span className="text-theme-border">|</span>
                                        <p className="text-xs text-theme-muted capitalize">{wallet.chain}</p>
                                        {wallet.isVerified && (
                                            <>
                                                <span className="text-theme-border">|</span>
                                                <Badge variant="success" className="text-[8px] h-3 px-1 py-0">Verified</Badge>
                                            </>
                                        )}
                                        {wallet.chain === 'solana' && walletBalance !== undefined && walletBalance !== null && (
                                            <>
                                                <span className="text-theme-border">|</span>
                                                <p className="text-xs font-mono text-gold">
                                                    {walletBalance.toFixed(4)} SOL
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4 text-theme-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(wallet.walletAddress)}>
                                        Copy Address
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.open(`https://solscan.io/account/${wallet.walletAddress}?cluster=devnet`, '_blank')}>
                                        View on Explorer
                                    </DropdownMenuItem>

                                    {!wallet.isEmbedded && embeddedWallet && (
                                        <DropdownMenuItem onClick={() => initiateTransfer(wallet)} className="text-gold focus:text-gold">
                                            <ArrowRightLeft className="w-3 h-3 mr-2" />
                                            Transfer to App Wallet
                                        </DropdownMenuItem>
                                    )}

                                    {wallet.isEmbedded && (
                                        <DropdownMenuItem onClick={initiateWithdraw} className="text-gold focus:text-gold mt-1 border-t border-theme-border">
                                            <ArrowRightLeft className="w-3 h-3 mr-2" />
                                            Withdraw to Wallet
                                        </DropdownMenuItem>
                                    )}

                                    {!wallet.isEmbedded && (
                                        <DropdownMenuItem
                                            className="text-red-500 focus:text-red-500 mt-1 border-t border-theme-border"
                                            onClick={() => handleUnlink(wallet.id)}
                                        >
                                            Disconnect Wallet
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}

                {(!displayWallets || displayWallets.length === 0) && (
                    <div className="text-center py-6">
                        <p className="text-theme-muted text-sm">No wallets connected</p>
                    </div>
                )}
            </CardContent>

            {/* Transfer Modal */}
            <Modal
                isOpen={transferModalOpen}
                onClose={() => setTransferModalOpen(false)}
                title="Transfer to App Wallet"
                description="Move funds from your external wallet to your secure Seniqu App Wallet."
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-theme-elevated p-3 rounded-xl text-xs text-theme-muted mb-2">
                        <div className="flex justify-between mb-1">
                            <span>From:</span>
                            <span className="font-mono text-theme-text">{selectedSourceWallet?.address.slice(0, 6)}...</span>
                        </div>
                        <div className="flex justify-between">
                            <span>To (App Wallet):</span>
                            <span className="font-mono text-gold">{embeddedWallet?.address.slice(0, 6)}...</span>
                        </div>
                    </div>

                    <Input
                        label="Amount (SOL)"
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.00"
                    />

                    <Button
                        variant="primary"
                        className="w-full mt-2"
                        onClick={handleTransfer}
                        isLoading={isTransferring}
                        disabled={!transferAmount || isTransferring}
                    >
                        {isTransferring ? 'Processing...' : 'Confirm Transfer'}
                    </Button>
                </div>
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                isOpen={withdrawModalOpen}
                onClose={() => setWithdrawModalOpen(false)}
                title="Withdraw from App Wallet"
                description="Securely withdraw funds to one of your connected wallets."
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-theme-elevated p-3 rounded-xl text-xs text-theme-muted mb-2">
                        <div className="flex justify-between mb-1">
                            <span>From (App Wallet):</span>
                            <span className="font-mono text-gold">{embeddedWallet?.address.slice(0, 6)}...</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>To:</span>
                            <select
                                className="bg-theme-bg border border-theme-border text-theme-text rounded px-2 py-1 text-xs"
                                value={selectedWithdrawDestination?.id || ''}
                                onChange={(e) => {
                                    const w = wallets.find((wal: any) => wal.id === e.target.value);
                                    if (w) setSelectedWithdrawDestination(w);
                                }}
                            >
                                {wallets?.filter((w: any) => !w.isEmbedded && w.chain === 'solana').map((w: any) => (
                                    <option key={w.id} value={w.id}>
                                        {w.label || w.walletAddress.slice(0, 6) + '...'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Input
                        label="Amount (SOL)"
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.00"
                    />

                    <Button
                        variant="primary"
                        className="w-full mt-2"
                        onClick={handleWithdraw}
                        isLoading={isTransferring}
                        disabled={!transferAmount || isTransferring}
                    >
                        {isTransferring ? 'Processing...' : 'Confirm Withdrawal'}
                    </Button>
                </div>
            </Modal>
        </Card>
    );
}
