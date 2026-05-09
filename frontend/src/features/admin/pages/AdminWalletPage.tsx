import { useState } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Badge } from '../../../components/ui';
import { 
    DollarSign, ArrowUpRight, ArrowDownRight, Activity, TrendingUp, 
    Users, Eye, EyeOff, Download, Filter, Search, Wallet,
    CreditCard, BarChart3, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock transaction data for the admin wallet overview
const MOCK_TRANSACTIONS = [
    { id: '1', type: 'sale', user: 'galon223', amount: 2.5, token: 'SOL', usd: 412.50, date: '2026-04-30T10:15:00Z', status: 'completed' },
    { id: '2', type: 'deposit', user: 'bebek445', amount: 0.8, token: 'ETH', usd: 2560.00, date: '2026-04-29T14:22:00Z', status: 'completed' },
    { id: '3', type: 'withdrawal', user: 'Foxy', amount: 1.2, token: 'SOL', usd: 198.00, date: '2026-04-29T09:45:00Z', status: 'completed' },
    { id: '4', type: 'sale', user: 'Masgalih', amount: 5.0, token: 'SOL', usd: 825.00, date: '2026-04-28T16:30:00Z', status: 'pending' },
    { id: '5', type: 'deposit', user: 'Dimas', amount: 0.5, token: 'ETH', usd: 1600.00, date: '2026-04-28T11:00:00Z', status: 'completed' },
    { id: '6', type: 'sale', user: 'Bubbles Biru', amount: 3.0, token: 'SOL', usd: 495.00, date: '2026-04-27T08:20:00Z', status: 'completed' },
];

const STAT_CARDS = [
    { label: 'Total Volume (30d)', value: '$124,850', change: '+12.4%', up: true, icon: DollarSign, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700' },
    { label: 'Active Wallets', value: '342', change: '+8.2%', up: true, icon: Wallet, gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    { label: 'Premium Subscribers', value: '89', change: '+3.1%', up: true, icon: CreditCard, gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-700' },
    { label: 'Avg Transaction', value: '$365', change: '-2.3%', up: false, icon: BarChart3, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700' },
];

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AdminWalletPage() {
    const [activeFilter, setActiveFilter] = useState<'all' | 'sale' | 'deposit' | 'withdrawal'>('all');
    const [isBalanceHidden, setIsBalanceHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = MOCK_TRANSACTIONS.filter(tx => {
        if (activeFilter !== 'all' && tx.type !== activeFilter) return false;
        if (searchQuery && !tx.user.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'sale': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700"><ArrowUpRight className="w-3 h-3" />Sale</span>;
            case 'deposit': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700"><ArrowDownRight className="w-3 h-3" />Deposit</span>;
            case 'withdrawal': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700"><ArrowUpRight className="w-3 h-3" />Withdrawal</span>;
            default: return null;
        }
    };

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <Badge className="backdrop-blur-md bg-green-100 text-green-700 border-green-200 font-bold px-3 py-1 mb-3">
                            Finance Overview
                        </Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Wallet & Finance</h1>
                        <p className="text-gray-500 mt-2 font-medium">Platform-wide transaction monitoring and financial analytics.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="!rounded-xl !px-4 !py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold" leftIcon={<Download className="w-4 h-4" />}>
                            Export CSV
                        </Button>
                        <button onClick={() => setIsBalanceHidden(!isBalanceHidden)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 transition-colors" title={isBalanceHidden ? 'Show values' : 'Hide values'}>
                            {isBalanceHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {STAT_CARDS.map((card, i) => (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <div className={`${card.bg} rounded-[20px] border border-gray-100 p-5 relative overflow-hidden group hover:shadow-lg transition-shadow`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg`}>
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-bold flex items-center gap-1 ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {card.up ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {card.change}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{isBalanceHidden ? '••••' : card.value}</h3>
                                <p className={`text-sm font-medium ${card.text} mt-1`}>{card.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Transaction Table */}
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{filtered.length}</span>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-52">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search user..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" />
                            </div>
                            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                {(['all', 'sale', 'deposit', 'withdrawal'] as const).map(f => (
                                    <button key={f} onClick={() => setActiveFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${activeFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-3">User</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Amount</div>
                        <div className="col-span-2">USD Value</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-1">Status</div>
                    </div>

                    {/* Rows */}
                    <AnimatePresence>
                        {filtered.map((tx, idx) => (
                            <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-green-50/30 transition-colors border-b border-gray-50 last:border-0">
                                <div className="col-span-1 md:col-span-3 font-bold text-gray-900">{tx.user}</div>
                                <div className="col-span-1 md:col-span-2">{getTypeBadge(tx.type)}</div>
                                <div className="col-span-1 md:col-span-2 font-mono font-bold text-gray-800">{isBalanceHidden ? '••••' : `${tx.amount} ${tx.token}`}</div>
                                <div className="col-span-1 md:col-span-2 font-semibold text-gray-600">{isBalanceHidden ? '••••' : `$${tx.usd.toLocaleString()}`}</div>
                                <div className="col-span-1 md:col-span-2 text-sm text-gray-500 font-medium">{formatDate(tx.date)}</div>
                                <div className="col-span-1 md:col-span-1">
                                    <span className={`inline-block w-2 h-2 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'}`} title={tx.status} />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filtered.length === 0 && (
                        <div className="py-16 text-center text-gray-400">
                            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                            <p className="font-bold text-gray-500">No transactions found</p>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default AdminWalletPage;
