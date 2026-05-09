import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Badge, Button } from '../../../components/ui';
import { extractArray } from '../../../lib/utils';
import { BarChart3, Users, Building2, Image, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const MOCK_MONTHLY = [
    { month: 'Nov', users: 42, artworks: 18, institutions: 2 },
    { month: 'Dec', users: 68, artworks: 34, institutions: 3 },
    { month: 'Jan', users: 95, artworks: 52, institutions: 4 },
    { month: 'Feb', users: 130, artworks: 78, institutions: 5 },
    { month: 'Mar', users: 180, artworks: 110, institutions: 7 },
    { month: 'Apr', users: 245, artworks: 156, institutions: 9 },
];

export function SystemAnalytics() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin', 'dashboard'],
        queryFn: () => adminService.getDashboardStats(),
    });

    const s = stats || { totalUsers: 0, totalArtworks: 0, totalInstitutions: 0, totalArts: 0, totalRevenue: 0, activeUsers: 0, newUsersToday: 0, pendingVerifications: 0 };

    const cards = [
        { label: 'Total Users', value: s.totalUsers, change: '+12%', up: true, icon: Users, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50' },
        { label: 'Total Artworks', value: s.totalArtworks, change: '+24%', up: true, icon: Image, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
        { label: 'Institutions', value: s.totalInstitutions, change: '+8%', up: true, icon: Building2, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
        { label: 'Active Users', value: s.activeUsers, change: '-3%', up: false, icon: Activity, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50' },
    ];

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold px-3 py-1 mb-3">Analytics</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">System Analytics</h1>
                    <p className="text-gray-500 mt-2 font-medium">Platform-wide performance metrics and growth trends.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {cards.map((c, i) => (
                        <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div className={`${c.bg} rounded-[20px] border border-gray-100 p-5`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow`}><c.icon className="w-5 h-5" /></div>
                                    <span className={`text-xs font-bold flex items-center gap-1 ${c.up ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{c.change}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : (c.value || 0).toLocaleString()}</h3>
                                <p className="text-sm font-semibold text-gray-500 mt-1">{c.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[24px] border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">User Growth</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={MOCK_MONTHLY}>
                                <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366F1" stopOpacity={0} /></linearGradient></defs>
                                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }} />
                                <Area type="monotone" dataKey="users" stroke="#6366F1" strokeWidth={2.5} fill="url(#ug)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-[24px] border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Artworks Created</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={MOCK_MONTHLY}>
                                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }} />
                                <Bar dataKey="artworks" fill="#10B981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default SystemAnalytics;
