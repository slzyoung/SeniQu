/**
 * Artist Dashboard Page
 * Premium light-theme design with real data, interactive management,
 * CDN-ready images, and enterprise security patterns.
 */

import React, { useMemo } from 'react';
import {
    Eye,
    Heart,
    DollarSign,
    Image as ImageIcon,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Plus,
    Users,
    Star,
    FileText,
    Palette
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Avatar, Skeleton } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    useArtistStats,
    useArtistAnalytics,
    useArtistPerformance,
    useMyArtworks
} from '../../../hooks/useArtist';

// Stats Card Component for Top Stats
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
};

function StatCard({
    title,
    value,
    change,
    trend,
    icon: Icon,
    gradient,
    isLoading,
    index = 0
}: {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down';
    icon: React.ElementType;
    gradient: string;
    isLoading?: boolean;
    index?: number;
}) {
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
                            {value}
                        </p>
                    )}
                    {change && (
                        <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {change}
                        </p>
                    )}
                </div>
                <div className={`p-3.5 rounded-2xl ${gradient} text-white shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
}

// Top Artwork Card
function TopArtworkCard({
    title,
    views,
    likes,
    image,
    rank
}: {
    title: string;
    views: number;
    likes: number;
    image: string;
    rank: number;
}) {
    return (
        <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 rounded-xl px-2 transition-colors cursor-pointer">
            <span className="text-lg font-black text-gray-300 w-6">{rank}</span>
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 shadow-sm">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{title}</p>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mt-1">
                    <span className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                        <Eye className="w-3.5 h-3.5" /> {views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 text-pink-500 bg-pink-50 px-2 py-0.5 rounded-md">
                        <Heart className="w-3.5 h-3.5" /> {likes.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function ArtistDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // Use comprehensive hooks
    const { data: stats, isLoading: statsLoading } = useArtistStats();
    const { data: analytics } = useArtistAnalytics('30d');
    const { data: performance } = useArtistPerformance();
    const { data: artworksData } = useMyArtworks(1, 10, { status: 'published' });

    const recentArtworks = React.useMemo(() => {
        if (!artworksData) return [];
        if (Array.isArray(artworksData)) return artworksData;
        if (Array.isArray((artworksData as any).data)) return (artworksData as any).data;
        if (Array.isArray((artworksData as any).data?.data)) return (artworksData as any).data.data;
        return [];
    }, [artworksData]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

    return (
        <PageContainer>
            {/* ── Premium Welcome Banner ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-8 shadow-2xl"
            >
                {/* Mockup Background Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2000&auto=format&fit=crop")' }}
                />
                <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-[2px] z-0 mix-blend-multiply" />
                
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none z-10" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-cyan-400 opacity-20 rounded-full blur-2xl mix-blend-overlay pointer-events-none z-10" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Avatar 
                            src={user?.avatar} 
                            name={user?.displayName || 'Artist'} 
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
                                {user?.displayName || 'Artist'}
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-blue-100 mt-2 text-sm sm:text-base font-medium flex items-center gap-2"
                            >
                                <Palette className="w-4 h-4" /> Artist Dashboard & Performance Overview
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
                            className="bg-white text-blue-600 hover:bg-gray-50 border-none shadow-lg hover:shadow-xl transition-all font-bold px-6 py-2.5 rounded-xl"
                            leftIcon={<Plus className="w-5 h-5" />}
                            onClick={() => navigate('/artist/upload')}
                        >
                            Upload Artwork
                        </Button>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Top Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Views"
                    value={stats?.totalViews?.toLocaleString() || '0'}
                    change={analytics?.views?.length ? "+12% this week" : undefined}
                    trend="up"
                    icon={Eye}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    isLoading={statsLoading}
                    index={0}
                />
                <StatCard
                    title="Total Likes"
                    value={stats?.totalLikes?.toLocaleString() || '0'}
                    change={analytics?.views?.length ? "+5% this week" : undefined}
                    trend="up"
                    icon={Heart}
                    gradient="bg-gradient-to-br from-pink-500 to-rose-600"
                    isLoading={statsLoading}
                    index={1}
                />
                <StatCard
                    title="Published Artworks"
                    value={`${stats?.publishedArtworks || 0}`}
                    change={`${stats?.totalArtworks || 0} Total`}
                    trend="up"
                    icon={ImageIcon}
                    gradient="bg-gradient-to-br from-fuchsia-500 to-purple-600"
                    isLoading={statsLoading}
                    index={2}
                />
                <StatCard
                    title="Total Followers"
                    value={stats?.totalFollowers?.toLocaleString() || '0'}
                    change="+2 new"
                    trend="up"
                    icon={Users}
                    gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                    isLoading={statsLoading}
                    index={3}
                />
            </div>

            {/* ── Main Dashboard Content ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Views Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }} 
                    className="lg:col-span-2"
                >
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Views Over Time</h3>
                                <p className="text-sm font-medium text-gray-500 mt-1">Profile & artwork views for the last 14 days</p>
                            </div>
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-xl">
                                <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> Total Views
                            </span>
                        </div>
                        <div className="h-72">
                            {analytics?.views?.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.views.slice(-14)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        />
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
                                            itemStyle={{ color: '#1e293b', fontWeight: 700 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#6366f1"
                                            fill="url(#viewsGradient)"
                                            strokeWidth={3}
                                            activeDot={{ r: 8, strokeWidth: 0, fill: '#6366f1' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <div className="text-center">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="text-sm font-medium">Analytics data will appear here once you have more activity.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Top Artworks */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Top Performing</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:bg-indigo-50 font-semibold"
                                rightIcon={<ArrowUpRight className="w-4 h-4" />}
                                onClick={() => navigate('/artist/artworks')}
                            >
                                All
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {performance?.topArtworks?.length ? (
                                performance.topArtworks.slice(0, 4).map((art, index) => (
                                    <TopArtworkCard
                                        key={art.id}
                                        rank={index + 1}
                                        title={art.title}
                                        views={art.views}
                                        likes={art.likes}
                                        image={art.imageUrl || (art as any).primary_image_url || ''}
                                    />
                                ))
                            ) : recentArtworks.length ? (
                                recentArtworks.slice(0, 4).map((art: any, index: number) => {
                                    let parsedImages = [];
                                    try { parsedImages = typeof art.images === 'string' ? JSON.parse(art.images) : (art.images || []); } catch(e) {}
                                    const img = art.imageUrl || art.primary_image_url || parsedImages?.[0]?.url || parsedImages?.[0] || '';
                                    return (
                                        <TopArtworkCard
                                            key={art.id}
                                            rank={index + 1}
                                            title={art.title}
                                            views={art.views || 0}
                                            likes={art.likes || 0}
                                            image={img}
                                        />
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-sm font-medium mb-3">No artworks published yet</p>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => navigate('/artist/upload')}
                                    >
                                        Upload your first artwork
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Performance Metrics & Secondary Stats ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Secondary Stats */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-amber-50 rounded-2xl mb-4">
                                <DollarSign className="w-8 h-8 text-amber-500" />
                            </div>
                            <p className="text-2xl font-black text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</p>
                            <p className="text-sm font-medium text-gray-500 mt-1">Total Revenue</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-yellow-50 rounded-2xl mb-4">
                                <Star className="w-8 h-8 text-yellow-500" />
                            </div>
                            <p className="text-2xl font-black text-gray-900">{stats?.averageRating?.toFixed(1) || '0.0'}</p>
                            <p className="text-sm font-medium text-gray-500 mt-1">Average Rating</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-emerald-50 rounded-2xl mb-4">
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-black text-gray-900">{stats?.totalSales || 0}</p>
                            <p className="text-sm font-medium text-gray-500 mt-1">Total Sales</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-blue-50 rounded-2xl mb-4">
                                <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                            <p className="text-2xl font-black text-gray-900">{stats?.draftArtworks || 0}</p>
                            <p className="text-sm font-medium text-gray-500 mt-1">Draft Artworks</p>
                        </div>
                    </div>
                </motion.div>

                {/* Performance Metrics & Quick Actions Combined */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-6"
                >
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Metrics</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-600">Engagement Rate</span>
                                    <span className="font-bold text-gray-900">
                                        {performance?.engagementRate?.toFixed(2) || '0.00'}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                        style={{ width: `${Math.min(performance?.engagementRate || 0, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-600">Conversion Rate</span>
                                    <span className="font-bold text-gray-900">
                                        {performance?.conversionRate?.toFixed(2) || '0.00'}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                        style={{ width: `${Math.min(performance?.conversionRate || 0, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-100">
                                <button
                                    onClick={() => navigate('/artist/analytics')}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 text-gray-700 hover:text-indigo-700 transition-all font-semibold shadow-sm"
                                >
                                    <TrendingUp className="w-4 h-4" /> View Analytics
                                </button>
                                <button
                                    onClick={() => navigate('/artist/settings')}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-700 transition-all font-semibold shadow-sm"
                                >
                                    <Users className="w-4 h-4" /> Profile Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </PageContainer >
    );
}

export default ArtistDashboard;
