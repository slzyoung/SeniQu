/**
 * Wallet Page for User Dashboard
 * Displays Aggregated Wallet details, balance, and transaction functionality
 */

import { useState } from 'react';
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
    ArrowUpRight
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { QrReader } from 'react-qr-reader';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge, Input, Modal } from '../../../components/ui';
import { usePrivyWallet } from '../../../hooks/usePrivyWallet';
import { useToast } from '../../../stores/useNotificationStore';
import { ConnectedWallets } from '../components/ConnectedWallets';
import { useWalletPortfolio, useWalletTransactions, useWalletWithdraw } from '../../../hooks/useWalletData';

// ============================================
// COMPONENTS
// ============================================

function WalletAddress({ address, label }: { address: string; label?: string }) {
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

    return (
        <div className="flex items-center gap-3">
            {label && (
                <span className="text-xs text-theme-muted">{label}</span>
            )}
            <code className="text-sm font-mono text-theme-text bg-theme-elevated px-3 py-1.5 rounded-lg">
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
                href={`https://solscan.io/account/${address}?cluster=devnet`} // Defaulting to devnet for now
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                title="View on Solscan"
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
    const { embeddedWallet } = usePrivyWallet();
    const toast = useToast();

    const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useWalletPortfolio();
    const { data: transactions = [], isLoading: txLoading, refetch: refetchTransactions } = useWalletTransactions();
    const withdrawMutation = useWalletWithdraw();

    const loading = portfolioLoading || txLoading;
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modals
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);

    // Send Form
    const [sendAmount, setSendAmount] = useState('');
    const [sendAddress, setSendAddress] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([refetchPortfolio(), refetchTransactions()]);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleScan = (result: any) => {
        if (result?.text) {
            setSendAddress(result.text);
            setShowScanModal(false);
            toast.success('Scanned', 'Address captured successfully');
        }
    };

    const handleSend = async () => {
        if (!sendAddress || !sendAmount) return;

        setIsSending(true);
        try {
            await withdrawMutation.mutateAsync({
                amount: parseFloat(sendAmount),
                token: 'SOL',
                destination: sendAddress
            });
            toast.success('Withdrawal Initiated', 'Transaction has been submitted.');
            setShowSendModal(false);
            setSendAddress('');
            setSendAmount('');
        } catch (error: any) {
            console.error('Withdrawal failed:', error);
            toast.error('Withdrawal Failed', error.response?.data?.message || 'Transaction failed');
        } finally {
            setIsSending(false);
        }
    };

    // Loading State
    if (loading && !portfolio) {
        return (
            <PageContainer title="Seniqu Wallet" subtitle="Loading your portfolio...">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
                    <p className="text-theme-muted">Fetching valid assets...</p>
                </div>
            </PageContainer>
        );
    }

    const solBalance = portfolio?.assets?.find((a: any) => a.symbol === 'SOL');

    return (
        <PageContainer
            title="Seniqu Wallet"
            subtitle="Manage your assets with your secure, embedded wallet"
        >
            {/* Wallet Overview */}
            <StatsGrid>
                {/* Main Card */}
                <Card variant="elevated" className="col-span-full sm:col-span-2 relative overflow-hidden border-gold/20">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl border border-gold/10">
                                <Wallet className="w-6 h-6 text-gold" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-theme-text">Total Balance</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="gold" className="text-[10px] px-1.5 py-0">Non-Custodial</Badge>
                                    <span className="text-xs text-theme-muted">Solana</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-end gap-2">
                                <p className="text-4xl font-bold text-theme-text font-mono">
                                    ${portfolio?.totalBalanceUsd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </p>
                                <span className="text-lg font-medium text-theme-muted mb-1.5">USD</span>
                            </div>
                            <p className="text-sm text-theme-muted mt-1 flex items-center gap-2">
                                {solBalance?.amount?.toFixed(4) || '0.0000'} SOL
                                <span className="w-1 h-1 rounded-full bg-theme-muted/50" />
                                1 SOL ≈ ${solBalance?.price || '0.00'}
                            </p>
                        </div>

                        <div className="bg-theme-bg/50 rounded-xl p-4 border border-theme-border backdrop-blur-sm">
                            <p className="text-xs text-theme-muted mb-2 uppercase tracking-wider font-semibold">Your Address</p>
                            <WalletAddress address={embeddedWallet?.address || 'Loading...'} />
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </Card>

                {/* Quick Actions */}
                <div className="col-span-full sm:col-span-1 grid grid-rows-3 gap-3">
                    <Button
                        variant="gold"
                        className="h-full w-full justify-start px-6 text-base font-semibold"
                        onClick={() => setShowReceiveModal(true)}
                        leftIcon={<ArrowDownLeft className="w-5 h-5" />}
                    >
                        Deposit
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-full w-full justify-start px-6 text-base font-semibold border-theme-border hover:border-gold/30"
                        onClick={() => setShowSendModal(true)}
                        leftIcon={<Send className="w-5 h-5" />}
                    >
                        Withdraw
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-full w-full justify-start px-6 text-base font-semibold border-theme-border hover:border-gold/30"
                        onClick={() => setShowReceiveModal(true)}
                        leftIcon={<QrCode className="w-5 h-5" />}
                    >
                        Show QR
                    </Button>
                </div>
            </StatsGrid>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Assets & Wallets */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Assets List */}
                    <div>
                        <h3 className="text-lg font-bold text-theme-text mb-4">Your Assets</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {portfolio?.assets?.map((asset: any) => (
                                <Card key={asset.symbol} variant="elevated" className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.symbol === 'SOL' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {/* Simple Icon Placeholder based on symbol */}
                                            <span className="font-bold text-xs">{asset.symbol.slice(0, 1)}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-theme-text">{asset.symbol}</p>
                                            <p className="text-xs text-theme-muted">${asset.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-theme-text">{asset.amount.toLocaleString()}</p>
                                        <p className="text-xs text-theme-muted">${asset.valueUsd.toLocaleString()}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Transactions */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-theme-text">Transaction History</h3>
                            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                        </div>
                        <Card variant="elevated" className="overflow-hidden">
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-theme-muted">
                                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No transactions yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-theme-border">
                                    {transactions.map((tx) => (
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

                {/* Right Column: Connected Wallets */}
                <div className="space-y-6">
                    <ConnectedWallets />

                    {/* Security Info */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <h4 className="text-sm font-bold text-theme-text">Unbreakable Security</h4>
                        </div>
                        <p className="text-xs text-theme-muted leading-relaxed">
                            Your assets are secured by Privy's embedded wallet technology and Solana's blockchain.
                            We never store your private keys. You retain full control.
                        </p>
                    </div>
                </div>
            </div>

            {/* QR Receive Modal */}
            <Modal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                title="Deposit Assets"
                description="Scan to deposit funds into your Seniqu Wallet"
                size="sm"
            >
                <div className="flex flex-col items-center">
                    <div className="p-4 bg-white rounded-2xl mb-6 shadow-xl shadow-gold/5 border-2 border-gold/10">
                        <QRCode
                            value={embeddedWallet?.address || ''}
                            size={200}
                            level="M"
                            viewBox={`0 0 256 256`}
                        />
                    </div>

                    <div className="w-full bg-theme-elevated p-4 rounded-xl mb-6 text-center border border-theme-border">
                        <p className="text-xs text-theme-muted mb-2 uppercase tracking-wide">Your Address</p>
                        <p className="text-sm font-mono text-theme-text break-all select-all">{embeddedWallet?.address}</p>
                    </div>

                    <Button className="w-full" variant="gold" onClick={() => {
                        if (embeddedWallet?.address) {
                            navigator.clipboard.writeText(embeddedWallet.address);
                            toast.success('Copied', 'Address copied to clipboard');
                        }
                    }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Address
                    </Button>
                </div>
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                title="Withdraw Funds"
                description="Send SOL to another wallet"
                size="sm"
            >
                <div className="space-y-5">
                    {/* Scanner Toggle */}
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
                                onResult={(result, error) => {
                                    if (!!result) {
                                        handleScan(result);
                                    }
                                    if (!!error) {
                                        console.info(error);
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
                                    label="Amount (SOL)"
                                    type="number"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-xs text-theme-muted">Available: {solBalance?.amount?.toFixed(4) || '0.00'} SOL</span>
                                    <button
                                        onClick={() => setSendAmount(solBalance ? (solBalance.amount - 0.0001).toString() : '0')}
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
            </Modal>
        </PageContainer>
    );
}

export default WalletPage;
