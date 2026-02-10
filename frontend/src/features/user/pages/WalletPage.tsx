/**
 * Wallet Page for User Dashboard
 * Displays wallet details, balance, and transaction functionality
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
    ArrowUpRight,
    Shield,
    CheckCircle,
    Unplug
} from 'lucide-react';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Badge } from '../../../components/ui';
import { useWalletStore } from '../../../stores/useWalletStore';
import { useToast } from '../../../stores/useNotificationStore';

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
                href={`https://solscan.io/account/${address}`}
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

function _TransactionItem({
    type,
    amount,
    address,
    time,
    status,
}: {
    type: 'send' | 'receive';
    amount: string;
    address: string;
    time: string;
    status: 'confirmed' | 'pending';
}) {
    return (
        <div className="flex items-center gap-4 py-3 border-b border-theme-border last:border-0">
            <div className={`p-2.5 rounded-xl ${type === 'receive' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                {type === 'receive' ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-500" />
                ) : (
                    <ArrowUpRight className="w-5 h-5 text-blue-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-theme-text text-sm">
                        {type === 'receive' ? 'Received' : 'Sent'}
                    </p>
                    <Badge
                        variant={status === 'confirmed' ? 'success' : 'default'}
                        className="text-[10px] scale-90 origin-left"
                    >
                        {status}
                    </Badge>
                </div>
                <p className="text-xs text-theme-muted truncate">
                    {type === 'receive' ? 'From' : 'To'}: {address.slice(0, 8)}...{address.slice(-4)}
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className={`font-mono font-semibold text-sm ${type === 'receive' ? 'text-green-400' : 'text-theme-text'}`}>
                    {type === 'receive' ? '+' : '-'}{amount} SOL
                </p>
                <p className="text-xs text-theme-muted">{time}</p>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WalletPage() {
    const { isConnected, address, balance, walletType, chain, disconnectWallet } = useWalletStore();
    const toast = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefreshBalance = async () => {
        setIsRefreshing(true);
        // In production, fetch real balance from Solana RPC
        setTimeout(() => {
            toast.info('Balance Updated', 'Your wallet balance has been refreshed.');
            setIsRefreshing(false);
        }, 1500);
    };

    const handleDisconnect = () => {
        disconnectWallet();
        toast.success('Disconnected', 'Your wallet has been disconnected.');
    };

    // Not connected state
    if (!isConnected || !address) {
        return (
            <PageContainer title="Wallet" subtitle="Connect your wallet to manage your digital assets">
                <Card variant="elevated" className="text-center py-16 max-w-lg mx-auto">
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto bg-gold/10 rounded-2xl flex items-center justify-center mb-4">
                            <Wallet className="w-10 h-10 text-gold" />
                        </div>
                        <h3 className="text-xl font-semibold text-theme-text mb-2">
                            No Wallet Connected
                        </h3>
                        <p className="text-theme-muted text-sm max-w-sm mx-auto">
                            Connect a Solana wallet to view your balance, send SOL, and manage your artworks on-chain.
                        </p>
                    </div>

                    <div className="space-y-3 max-w-xs mx-auto">
                        <Button variant="gold" className="w-full" leftIcon={<Wallet className="w-4 h-4" />}>
                            Connect Wallet
                        </Button>
                        <p className="text-xs text-theme-muted">
                            Supports Phantom, Solflare, MetaMask & WalletConnect
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-theme-border">
                        <div className="flex items-center justify-center gap-2 text-sm text-theme-muted">
                            <Shield className="w-4 h-4" />
                            <span>Secured by Privy.io</span>
                        </div>
                    </div>
                </Card>
            </PageContainer>
        );
    }

    // Connected state
    return (
        <PageContainer
            title="Wallet"
            subtitle="Manage your Solana wallet and transactions"
            actions={
                <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Unplug className="w-4 h-4" />}
                    onClick={handleDisconnect}
                    className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                >
                    Disconnect
                </Button>
            }
        >
            {/* Wallet Overview */}
            <StatsGrid>
                <Card variant="elevated" className="col-span-full sm:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-gold/10 rounded-xl">
                                <Wallet className="w-6 h-6 text-gold" />
                            </div>
                            <div>
                                <p className="text-sm text-theme-muted">Connected Wallet</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="gold" className="capitalize">{walletType}</Badge>
                                    <Badge variant="default">{chain === 'solana' ? 'Solana' : 'Ethereum'}</Badge>
                                </div>
                            </div>
                        </div>
                        <WalletAddress address={address} />
                    </div>
                </Card>

                <Card variant="elevated" className="relative overflow-hidden">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-theme-muted">SOL Balance</p>
                            <p className="text-3xl font-bold text-gold mt-1">
                                {balance !== null ? balance.toFixed(4) : '0.0000'}
                            </p>
                            <p className="text-xs text-theme-muted mt-1">
                                ≈ ${balance !== null ? (balance * 180).toFixed(2) : '0.00'} USD
                            </p>
                        </div>
                        <button
                            onClick={handleRefreshBalance}
                            disabled={isRefreshing}
                            className="p-2 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-gold transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </Card>
            </StatsGrid>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <Button
                    variant="secondary"
                    className="h-20 flex-col gap-2 rounded-xl"
                >
                    <Send className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-medium">Send</span>
                </Button>
                <Button
                    variant="secondary"
                    className="h-20 flex-col gap-2 rounded-xl"
                >
                    <ArrowDownLeft className="w-5 h-5 text-green-500" />
                    <span className="text-xs font-medium">Receive</span>
                </Button>
                <Button
                    variant="secondary"
                    className="h-20 flex-col gap-2 rounded-xl"
                >
                    <QrCode className="w-5 h-5 text-purple-500" />
                    <span className="text-xs font-medium">QR Code</span>
                </Button>
                <Button
                    variant="secondary"
                    className="h-20 flex-col gap-2 rounded-xl"
                >
                    <ExternalLink className="w-5 h-5 text-gold" />
                    <span className="text-xs font-medium">Explorer</span>
                </Button>
            </div>

            {/* Recent Transactions */}
            <Card variant="elevated" className="mt-6">
                <CardHeader title="Recent Transactions" />
                <CardContent>
                    {/* Placeholder transactions - will be replaced with real data */}
                    <div className="text-center py-10">
                        <RefreshCw className="w-10 h-10 text-theme-muted/30 mx-auto mb-3" />
                        <p className="text-theme-muted text-sm">No transactions yet</p>
                        <p className="text-theme-muted/60 text-xs mt-1">
                            Your Solana transactions will appear here
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Security Info */}
            <Card variant="elevated" className="mt-6 bg-gold/5 border-gold/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-theme-text">Wallet Security</h4>
                            <p className="text-sm text-theme-muted mt-1">
                                Your wallet is securely connected via Privy. Never share your private keys or seed phrase
                                with anyone. Seniqu will never ask for your private keys.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}

export default WalletPage;
