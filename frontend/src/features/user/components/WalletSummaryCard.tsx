import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge } from '../../../components/ui';
import { useWalletPortfolio } from '../../../hooks/useWalletData';

export function WalletSummaryCard() {
    const navigate = useNavigate();
    const { data: portfolio, isLoading } = useWalletPortfolio();

    if (isLoading) {
        return (
            <Card variant="elevated" className="border-gold/20">
                <CardHeader title="Wallet Portfolio" />
                <CardContent className="py-6 flex justify-center">
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                </CardContent>
            </Card>
        );
    }

    const solBalance = portfolio?.assets?.find((a: any) => a.symbol === 'SOL');

    return (
        <Card variant="elevated" className="border-gold/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-gold/10 transition-colors duration-500" />

            <CardHeader
                title="Wallet Portfolio"
                action={
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/wallet')} className="text-gold hover:text-gold-light p-0 h-auto">
                        Manage <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                }
            />

            <CardContent>
                <div className="flex flex-col gap-4">
                    {/* Total Balance */}
                    <div>
                        <p className="text-sm text-theme-muted font-medium mb-1">Total Balance</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-theme-text font-mono">
                                ${portfolio?.totalBalanceUsd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </h3>
                            <span className="text-sm text-theme-muted mb-1.5">USD</span>
                        </div>
                    </div>

                    {/* Asset Breakdown (Simplified) */}
                    {solBalance && (
                        <div className="ml-1 pl-3 border-l-2 border-gold/30">
                            <div className="flex items-center gap-2">
                                <img
                                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                    alt="SOL"
                                    className="w-4 h-4 object-contain"
                                />
                                <span className="text-sm font-medium text-theme-text font-mono">
                                    {solBalance.amount?.toFixed(4)} SOL
                                </span>
                                <Badge variant="gold" className="text-[10px] px-1.5 py-0 h-4">Native</Badge>
                            </div>
                            <p className="text-xs text-theme-muted mt-0.5">
                                ≈ ${solBalance.valueUsd?.toFixed(2)}
                            </p>
                        </div>
                    )}

                    {(!portfolio?.assets || portfolio.assets.length === 0) && (
                        <p className="text-sm text-theme-muted italic">No assets found.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
