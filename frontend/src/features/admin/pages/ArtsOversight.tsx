import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { ShoppingBag, Image, TrendingUp, DollarSign, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MOCK_ART_DATA = [
    { month: 'Nov', listed: 12, sold: 3 },
    { month: 'Dec', listed: 24, sold: 8 },
    { month: 'Jan', listed: 38, sold: 14 },
    { month: 'Feb', listed: 56, sold: 22 },
    { month: 'Mar', listed: 72, sold: 31 },
    { month: 'Apr', listed: 95, sold: 45 },
];

const MOCK_ARTWORKS = [
    { id: '1', title: 'Sunset Over Borobudur', artist: 'Masgalih', price: 2.5, views: 342, likes: 89, status: 'listed' },
    { id: '2', title: 'Abstract Nusantara', artist: 'Foxy', price: 1.8, views: 214, likes: 56, status: 'sold' },
    { id: '3', title: 'Digital Batik #12', artist: 'Dimas', price: 3.2, views: 567, likes: 134, status: 'listed' },
    { id: '4', title: 'Wayang Genesis', artist: 'Bubbles Biru', price: 5.0, views: 890, likes: 245, status: 'listed' },
    { id: '5', title: 'Komodo Dreams', artist: 'galon223', price: 0.8, views: 123, likes: 34, status: 'sold' },
];

export function ArtsOversight() {
    const stats = [
        { label: 'Total Artworks', value: '156', icon: Image, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
        { label: 'Listed on Market', value: '89', icon: ShoppingBag, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50' },
        { label: 'Total Sold', value: '45', icon: TrendingUp, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50' },
        { label: 'Volume (SOL)', value: '124.5', icon: DollarSign, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
    ];

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1 mb-3">Marketplace</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Arts Marketplace</h1>
                    <p className="text-gray-500 mt-2 font-medium">Oversee artwork listings, sales, and marketplace activity.</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Listing vs Sales</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={MOCK_ART_DATA}>
                                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }} />
                                <Bar dataKey="listed" fill="#6366F1" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="sold" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-3 bg-white rounded-[24px] border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Recent Artworks</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {MOCK_ARTWORKS.map((a) => (
                                <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{a.title}</p>
                                        <p className="text-xs text-gray-500">by {a.artist}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views}</span>
                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{a.likes}</span>
                                        <span className="font-bold text-gray-900">{a.price} SOL</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.status === 'sold' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default ArtsOversight;
