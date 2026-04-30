/**
 * HeritageAdminDashboard — Domain-specific heritage management hub
 * Premium design for managing cultural sites and digital artifacts.
 */

import React, { useMemo } from 'react';
import { useDomainDashboardStats } from '../../../hooks/useAdmin';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Avatar, Skeleton } from '../../../components/ui';
import { Landmark, Eye, MapPin, Flag, Globe2, BookOpen, Clock, ArrowUpRight, Plus } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
};

function StatCard({ title, value, subtitle, icon: Icon, gradient, index = 0, isLoading }: any) {
    return (
        <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible"
            className="relative overflow-hidden rounded-3xl bg-white border border-gray-100/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
        >
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20 rounded-lg" />
                    ) : (
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                    )}
                    {subtitle && <p className="text-xs font-medium text-gray-400 mt-2">{subtitle}</p>}
                </div>
                <div className={`p-3.5 rounded-2xl ${gradient} text-white shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
}

export function HeritageAdminDashboard() {
    const { user } = useAuthStore();
    const { data: stats, isLoading } = useDomainDashboardStats();
    const navigate = useNavigate();

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // Simulated chart data
    const chartData = useMemo(() => {
        const base = stats?.total_views || 300;
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - i));
            return {
                date: day.toLocaleDateString('en-US', { weekday: 'short' }),
                visitors: Math.round(base / 7 * (0.8 + Math.random() * 0.4)),
                virtualTours: Math.round(base / 14 * (0.5 + Math.random() * 0.5)),
            };
        });
    }, [stats]);

    return (
        <PageContainer>
            {/* ── Premium Welcome Banner ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 p-8 sm:p-10 mb-8 shadow-2xl shadow-orange-500/20"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-yellow-300 opacity-20 rounded-full blur-2xl mix-blend-overlay pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Avatar 
                            src={user?.avatar} 
                            name={user?.displayName || 'Heritage Admin'} 
                            size="xl" 
                            className="border-4 border-white/20 shadow-xl"
                        />
                        <div>
                            <motion.span 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white/90 text-xs font-bold tracking-wider uppercase mb-2"
                            >
                                {greeting}
                            </motion.span>
                            <motion.h1 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl sm:text-4xl font-black text-white tracking-tight"
                            >
                                {user?.displayName || 'Heritage Admin'}
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-orange-100 mt-2 text-sm sm:text-base font-medium flex items-center gap-2"
                            >
                                <Landmark className="w-4 h-4" /> Preserving Culture & Digital Artifacts
                            </motion.p>
                        </div>
                    </div>
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <Button
                            variant="primary"
                            className="bg-white text-orange-600 hover:bg-gray-50 border-none shadow-lg hover:shadow-xl transition-all font-bold px-6 py-2.5 rounded-xl"
                            leftIcon={<Plus className="w-5 h-5" />}
                            onClick={() => navigate('/admin/institutions')}
                        >
                            Add Site
                        </Button>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Heritage Sites" 
                    value={stats?.total_heritage_sites || 0} 
                    subtitle="Managed locations"
                    icon={Landmark}
                    gradient="bg-gradient-to-br from-orange-500 to-red-600" 
                    index={0} 
                    isLoading={isLoading} 
                />
                <StatCard 
                    title="Digital Artifacts" 
                    value={stats?.total_artifacts || 0} 
                    subtitle="Preserved items"
                    icon={Flag}
                    gradient="bg-gradient-to-br from-amber-500 to-yellow-500" 
                    index={1} 
                    isLoading={isLoading} 
                />
                <StatCard 
                    title="Virtual Tour Views" 
                    value={stats?.total_views || 0} 
                    subtitle="Global reach"
                    icon={Globe2}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500" 
                    index={2} 
                    isLoading={isLoading} 
                />
                <StatCard 
                    title="Active Regions" 
                    value={stats?.active_locations || 0} 
                    subtitle="Geographic spread"
                    icon={MapPin}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600" 
                    index={3} 
                    isLoading={isLoading} 
                />
            </div>

            {/* ── Main Dashboard Content ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Engagement Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }} 
                    className="xl:col-span-2"
                >
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Digital Engagement</h3>
                                <p className="text-sm font-medium text-gray-500 mt-1">Physical vs Virtual Tour Visitors</p>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl">
                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" /> Physical
                                </span>
                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" /> Virtual
                                </span>
                            </div>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="physG" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="virtG" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                            backdropFilter: 'blur(10px)',
                                            border: 'none', 
                                            borderRadius: '16px', 
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                            padding: '12px 20px',
                                            fontWeight: 600
                                        }} 
                                    />
                                    <Area type="monotone" dataKey="visitors" stroke="#f97316" fill="url(#physG)" strokeWidth={3} activeDot={{ r: 8, strokeWidth: 0, fill: '#f97316' }} />
                                    <Area type="monotone" dataKey="virtualTours" stroke="#fbbf24" fill="url(#virtG)" strokeWidth={3} activeDot={{ r: 8, strokeWidth: 0, fill: '#fbbf24' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>

                {/* Archival Actions */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-6"
                >
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Management Tools</h3>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'Upload Artifact Record', icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100 border-orange-100' },
                                { label: 'Configure Virtual Tour', icon: Globe2, color: 'text-amber-600', bg: 'bg-amber-50', hover: 'hover:bg-amber-100 border-amber-100' },
                                { label: 'Review Site Analytics', icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100 border-emerald-100' },
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 ${action.hover} transition-all duration-300 group/btn`}
                                >
                                    <div className={`p-3 rounded-xl ${action.bg} ${action.color} group-hover/btn:scale-110 transition-transform`}>
                                        <action.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-gray-700 group-hover/btn:text-gray-900 transition-colors">{action.label}</span>
                                    <ArrowUpRight className="w-4 h-4 ml-auto text-gray-400 group-hover/btn:text-gray-600 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </PageContainer>
    );
}

export default HeritageAdminDashboard;
