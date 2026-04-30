import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge, Avatar } from '../../../components/ui';
import { User, Shield, Mail, Calendar, Key, Wallet, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useWalletPortfolio } from '../../../hooks/useWalletData';

export function AdminProfile() {
    const { user } = useAuthStore();
    const { data: portfolio, isLoading: isWalletLoading } = useWalletPortfolio();

    const fields = [
        { label: 'Display Name', value: user?.displayName || user?.username || '—', icon: User },
        { label: 'Email', value: user?.email || '—', icon: Mail },
        { label: 'Role', value: (user?.role || 'admin').toUpperCase(), icon: Shield },
        { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—', icon: Calendar },
        { label: 'User ID', value: user?.id?.slice(0, 16) + '...' || '—', icon: Key },
    ];

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-bold px-3 py-1 mb-3">Account</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Admin Profile</h1>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-8 text-center mb-6">
                    <Avatar name={user?.displayName || 'Admin'} src={user?.avatar} size="lg" className="mx-auto ring-4 ring-indigo-100 shadow-lg mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">{user?.displayName || user?.username}</h2>
                    <p className="text-gray-500 font-medium mt-1">{user?.email}</p>
                    <span className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20">
                        <Shield className="w-4 h-4" /> {(user?.role || 'admin').toUpperCase()}
                    </span>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
                    {fields.map((f, i) => (
                        <div key={f.label} className={`flex items-center gap-4 px-6 py-4 ${i < fields.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <f.icon className="w-5 h-5 text-gray-400 shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{f.label}</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{f.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Seamless Wallet Card */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-8 mb-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Wallet Portfolio</h3>
                                <p className="text-sm font-medium text-gray-500">Super Admin secure balances</p>
                            </div>
                        </div>

                        {isWalletLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
                        ) : (
                            <div className="bg-gray-50/50 rounded-[16px] p-5 border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Balance</p>
                                <div className="flex items-end gap-2 mb-4">
                                    <h3 className="text-3xl font-bold text-gray-900 font-mono">
                                        ${portfolio?.totalBalanceUsd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </h3>
                                    <span className="text-sm font-bold text-gray-500 mb-1">USD</span>
                                </div>
                                
                                <div className="space-y-3 pt-4 border-t border-gray-200/60">
                                    {portfolio?.assets?.map((asset: any) => (
                                        <div key={asset.symbol} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                                                    {asset.symbol === 'SOL' ? (
                                                        <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" className="w-4 h-4 object-contain" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-500">{asset.symbol?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">{asset.symbol}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900 font-mono">{asset.amount?.toFixed(4)}</p>
                                                <p className="text-[10px] font-bold text-gray-500">≈ ${asset.valueUsd?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!portfolio?.assets || portfolio.assets.length === 0) && (
                                        <p className="text-sm font-medium text-gray-500 italic">No assets found in wallet.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default AdminProfile;
