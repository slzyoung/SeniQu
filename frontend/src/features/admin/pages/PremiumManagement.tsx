import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { Crown, Users, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_SUBS = [
    { id: '1', user: 'Masgalih', plan: 'Pro', amount: '$9.99/mo', started: '2026-03-15', status: 'active' },
    { id: '2', user: 'galon223', plan: 'Enterprise', amount: '$29.99/mo', started: '2026-02-10', status: 'active' },
    { id: '3', user: 'Foxy', plan: 'Pro', amount: '$9.99/mo', started: '2026-01-20', status: 'cancelled' },
    { id: '4', user: 'Dimas', plan: 'Pro', amount: '$9.99/mo', started: '2026-04-01', status: 'active' },
    { id: '5', user: 'Bubbles Biru', plan: 'Enterprise', amount: '$29.99/mo', started: '2026-04-10', status: 'active' },
];

export function PremiumManagement() {
    const stats = [
        { label: 'Total Subscribers', value: '89', icon: Users, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50' },
        { label: 'Monthly Revenue', value: '$1,890', icon: DollarSign, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50' },
        { label: 'Growth Rate', value: '+15.2%', icon: TrendingUp, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50' },
        { label: 'Churn Rate', value: '2.3%', icon: Crown, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
    ];

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold px-3 py-1 mb-3">Premium</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Premium Management</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage subscriptions, plans, and premium features.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((c, i) => (
                        <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div className={`${c.bg} rounded-[20px] border border-gray-100 p-5`}>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow mb-3`}><c.icon className="w-5 h-5" /></div>
                                <h3 className="text-2xl font-bold text-gray-900">{c.value}</h3>
                                <p className="text-sm font-semibold text-gray-500 mt-1">{c.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-900">Active Subscriptions</h3></div>
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/60 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-3">User</div><div className="col-span-2">Plan</div><div className="col-span-2">Amount</div><div className="col-span-3">Started</div><div className="col-span-2">Status</div>
                    </div>
                    {MOCK_SUBS.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                            className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-purple-50/20 transition-colors">
                            <div className="col-span-1 md:col-span-3 font-bold text-gray-900">{s.user}</div>
                            <div className="col-span-1 md:col-span-2"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.plan === 'Enterprise' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{s.plan}</span></div>
                            <div className="col-span-1 md:col-span-2 font-semibold text-gray-700">{s.amount}</div>
                            <div className="col-span-1 md:col-span-3 text-sm text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{s.started}</div>
                            <div className="col-span-1 md:col-span-2">
                                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                <span className="text-sm font-semibold capitalize">{s.status}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
}

export default PremiumManagement;
