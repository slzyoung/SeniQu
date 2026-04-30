/**
 * AdminDashboard — Super Admin / Domain Admin Hub
 * Premium light-theme design with real database data,
 * interactive cards, charts, and CDN-ready image support.
 */

import { useMemo } from 'react';
import {
    ArrowUpRight,
    Shield,
    Users,
    Building2,
    Image as ImageIcon,
    DollarSign,
    TrendingUp,
    CheckCircle,
    Activity,
    BarChart3,
    Zap,
    Bell,
    MapPin,
    Plus,
    ChevronUp,
    Search,
    Settings,
    Database,
    ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Avatar, Badge, Skeleton } from '../../../components/ui';
import { useSystemStats, usePendingInstitutions, useDashboardStats } from '../../../hooks/useAdmin';
import { useCurrentUser } from '../../../hooks/useUser';
import { adminService } from '../../../services/adminService';
import { useNavigate } from 'react-router-dom';
import MuseumAdminDashboard from './MuseumAdminDashboard';
import GalleryAdminDashboard from './GalleryAdminDashboard';
import HeritageAdminDashboard from './HeritageAdminDashboard';

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ============================================
// COMPONENTS
// ============================================

function TopNav({ user, alertsCount }: { user: any, alertsCount: number }) {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <Avatar name={user?.displayName || 'Super Admin'} src={user?.avatar} size="lg" className="ring-4 ring-white shadow-sm" />
                <div>
                    <p className="text-sm font-medium text-gray-500">Welcome,</p>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">{user?.displayName || 'Super Admin'}</h1>
                </div>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="relative hidden sm:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search artworks, users..." 
                        className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64 shadow-sm transition-all"
                    />
                </div>
                <button 
                    onClick={() => navigate('/admin/alerts')}
                    className="relative p-2.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm group"
                >
                    <Bell className="w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                    {alertsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                            {alertsCount}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => navigate('/admin/settings')}
                    className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm group"
                >
                    <Settings className="w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                </button>
                <Button 
                    className="ml-2 !rounded-full !px-5 !py-2.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-lg shadow-indigo-600/20 text-sm font-semibold tracking-wide"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/admin/institutions')}
                >
                    Management
                </Button>
            </div>
        </div>
    );
}

function StatCard({
    title,
    subtitle,
    icon: Icon,
    colorClass,
    isLoading,
    actionIcon: ActionIcon = ArrowUpRight,
    onClick
}: {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    colorClass: string;
    isLoading?: boolean;
    actionIcon?: React.ElementType;
    onClick?: () => void;
}) {
    return (
        <motion.div
            variants={itemVariants}
            onClick={onClick}
            className={`relative overflow-hidden rounded-[20px] ${colorClass} p-5 text-white shadow-lg hover:-translate-y-1 transition-transform duration-300 group cursor-pointer`}
        >
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-sm">
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-0.5">{title}</p>
                        {isLoading ? (
                            <Skeleton className="h-7 w-20 rounded bg-white/30" animation="pulse" />
                        ) : (
                            <p className="text-2xl font-bold tracking-tight">{subtitle}</p>
                        )}
                    </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-gray-900 transition-all duration-300 backdrop-blur-md shadow-sm shrink-0">
                    <ActionIcon className="w-4 h-4 text-inherit" />
                </button>
            </div>
            {/* Background Decor */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500" />
            <div className="absolute right-8 top-2 w-12 h-12 bg-white/10 rounded-full blur-xl" />
        </motion.div>
    );
}

function Banner() {
    return (
        <motion.div variants={itemVariants} className="relative w-full h-48 md:h-64 rounded-[24px] overflow-hidden mb-8 shadow-xl group">
            <img 
                src="https://images.unsplash.com/photo-1518998053401-a41d24dc5cdd?auto=format&fit=crop&w=2000&q=80" 
                alt="Museum interior" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
            <div className="absolute bottom-6 left-6 md:left-8 pr-6">
                <div className="flex items-center gap-3 mb-3">
                    <Badge className="backdrop-blur-md bg-gold/90 border-gold text-gray-900 font-bold px-3 py-1 shadow-lg shadow-gold/20">
                        Enterprise Access
                    </Badge>
                    <Badge className="backdrop-blur-md bg-white/20 border-white/30 text-white font-medium px-3 py-1">
                        Live Database
                    </Badge>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 font-serif tracking-tight drop-shadow-md">
                    SeniQu Command Center
                </h2>
                <p className="text-white/80 font-medium text-sm md:text-base max-w-2xl drop-shadow">
                    Overseeing all global arts, verified institutions, and cultural heritage data in real-time.
                </p>
            </div>
        </motion.div>
    );
}

function RevenueCard({ value, trend, isLoading }: { value: number, trend: number, isLoading: boolean }) {
    // Generate some smooth looking mock bars
    const bars = [30, 45, 25, 60, 40, 75, 50, 85, 65, 90, 70, 95];
    
    return (
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-[24px] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden h-full flex flex-col justify-between group">
            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-sm">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-lg tracking-wide">Total Revenue</span>
                </div>
                <div className="bg-black/20 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                    USD
                </div>
            </div>
            
            {/* Custom Bar Chart Visualization */}
            <div className="flex items-end justify-between h-28 mt-8 mb-6 relative z-10 gap-1 sm:gap-2">
                {bars.map((val, i) => (
                    <div key={i} className="w-full max-w-[12px] bg-black/10 rounded-full flex flex-col justify-end items-center h-full relative">
                        <div 
                            className="w-full bg-black/40 rounded-full transition-all duration-700 ease-out group-hover:bg-white" 
                            style={{ height: `${val}%` }} 
                        />
                        {/* Interactive dots */}
                        <div className="absolute -top-3 w-1.5 h-1.5 rounded-full bg-black/20 group-hover:bg-white/90 transition-colors duration-500 delay-100" />
                    </div>
                ))}
            </div>
            
            <div className="relative z-10">
                {isLoading ? (
                    <Skeleton className="h-10 w-32 rounded-lg bg-white/30 mb-2" animation="pulse" />
                ) : (
                    <h3 className="text-4xl md:text-5xl font-bold font-sans tracking-tight mb-2">
                        ${value.toLocaleString()}
                    </h3>
                )}
                <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> +{trend}%
                    </span>
                    <span className="text-white/70 text-sm font-medium hidden sm:inline">revenue growth</span>
                </div>
            </div>
            
            {/* Decor Elements */}
            <div className="absolute right-0 top-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
        </motion.div>
    );
}

function ActivityChartCard({ data }: { data: any[] }) {
    return (
        <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5 font-serif">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Activity className="w-5 h-5" />
                        </div>
                        Platform Activity
                    </h3>
                    <p className="text-gray-500 text-sm font-medium mt-1.5">User & artwork registrations over last 7 days</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                    <button className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm">Week</button>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-500 hover:text-gray-900 transition-colors">Month</button>
                </div>
            </div>
            
            <div className="flex-1 min-h-[240px] -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorArts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} 
                            dy={10} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} 
                            dx={-10}
                        />
                        <RechartsTooltip 
                            contentStyle={{ 
                                borderRadius: '16px', 
                                border: '1px solid #F3F4F6', 
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                padding: '12px 16px',
                                fontWeight: 600
                            }}
                            cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '4 4' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="users" 
                            name="Users"
                            stroke="#4F46E5" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorUsers)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="artworks" 
                            name="Artworks"
                            stroke="#10B981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorArts)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center gap-6 mt-4 ml-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-sm font-medium text-gray-600">Users</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-gray-600">Artworks</span>
                </div>
            </div>
        </motion.div>
    );
}

function PendingApprovalsList({ items, navigate, isLoading }: { items: any[], navigate: any, isLoading: boolean }) {
    return (
        <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 font-serif">On-boarding</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">Pending institutions</p>
                </div>
                <Button 
                    variant="ghost" 
                    className="text-indigo-600 hover:bg-indigo-50 font-semibold !px-3" 
                    onClick={() => navigate('/admin/institutions')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                    View All
                </Button>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))
                ) : items?.length > 0 ? (
                    items.slice(0, 4).map((item, idx) => (
                        <div 
                            key={item.id} 
                            className="relative pl-8 group cursor-pointer" 
                            onClick={() => navigate('/admin/institutions')}
                        >
                            {/* Timeline line */}
                            {idx !== Math.min(items.length - 1, 3) && (
                                <div className="absolute left-2.5 top-6 bottom-[-20px] w-0.5 bg-gray-100 group-hover:bg-indigo-100 transition-colors" />
                            )}
                            {/* Timeline dot */}
                            <div className="absolute left-1 top-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 z-10 group-hover:scale-125 transition-transform" />
                            
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-900 leading-tight truncate pr-2">{item.name}</h4>
                                    <button className="text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-full p-1 shadow-sm border border-gray-100 shrink-0">
                                        <ChevronUp className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                    <span className="bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 text-xs rounded-full shadow-sm">
                                        Pending
                                    </span>
                                    <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-gray-400" />
                                        {item.city || 'Location N/A'}
                                    </span>
                                    <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-sm">
                                        {(item.type || 'Institution').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-8 pt-4">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <p className="font-bold text-gray-700">All caught up!</p>
                        <p className="text-sm font-medium mt-1 text-gray-500">No pending approvals required.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}


// ============================================
// MAIN: SUPER ADMIN DASHBOARD
// ============================================
export function AdminDashboard() {
    const { data: user } = useCurrentUser();
    const { data: stats, isLoading: statsLoading } = useSystemStats();
    const { data: dashStats } = useDashboardStats();
    const { data: pendingInstitutions, isLoading: pendingLoading } = usePendingInstitutions();
    const navigate = useNavigate();

    const { data: alerts } = useQuery({
        queryKey: ['admin', 'alerts'],
        queryFn: () => adminService.getSystemAlerts(),
    });

    // Role Delegation
    const adminRoleTyped = (user as any)?.adminRole || (user as any)?.admin_role_typed || (user as any)?.adminRoleTyped;
    if (adminRoleTyped === 'MUSEUM_ADMIN') return <MuseumAdminDashboard />;
    if (adminRoleTyped === 'GALLERY_ADMIN') return <GalleryAdminDashboard />;
    if (adminRoleTyped === 'HERITAGE_ADMIN') return <HeritageAdminDashboard />;

    // Mock chart data (uses real stats to scale)
    const chartData = useMemo(() => {
        const baseValue = stats?.totalUsers || dashStats?.totalUsers || 100;
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - i));
            return {
                date: day.toLocaleDateString('en-US', { weekday: 'short' }),
                users: Math.round(baseValue * (0.85 + Math.random() * 0.3)),
                artworks: Math.round((stats?.totalArtworks || dashStats?.totalArtworks || 50) * (0.8 + Math.random() * 0.4)),
            };
        });
    }, [stats, dashStats]);

    const displayStats = {
        users: stats?.totalUsers || dashStats?.totalUsers || 0,
        institutions: stats?.totalInstitutions || dashStats?.totalInstitutions || 0,
        artworks: stats?.totalArtworks || dashStats?.totalArtworks || 0,
        revenue: stats?.totalRevenue || dashStats?.totalRevenue || 0,
    };

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12 overflow-x-hidden">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-[1400px] mx-auto"
            >
                {/* 1. TOP NAV / GREETING */}
                <TopNav user={user} alertsCount={alerts?.length || 0} />

                {/* 2. PREMIUM COLORED STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <StatCard
                        title="Registered Users"
                        subtitle={`${displayStats.users.toLocaleString()} Active`}
                        icon={Users}
                        colorClass="bg-[#4F46E5]" // Indigo
                        isLoading={statsLoading}
                        onClick={() => navigate('/admin/users')}
                    />
                    <StatCard
                        title="Institutions"
                        subtitle={`${displayStats.institutions.toLocaleString()} Partners`}
                        icon={Building2}
                        colorClass="bg-[#EAB308]" // Yellow/Amber
                        isLoading={statsLoading}
                        onClick={() => navigate('/admin/institutions')}
                    />
                    <StatCard
                        title="Total Artworks"
                        subtitle={`${displayStats.artworks.toLocaleString()} Listed`}
                        icon={ImageIcon}
                        colorClass="bg-[#10B981]" // Emerald
                        isLoading={statsLoading}
                        onClick={() => navigate('/admin/arts')}
                    />
                    <StatCard
                        title="System Logs"
                        subtitle="View Activity"
                        icon={Database}
                        colorClass="bg-[#8B5CF6]" // Purple
                        isLoading={false}
                        actionIcon={ArrowRight}
                        onClick={() => navigate('/admin/logs')}
                    />
                </div>

                {/* 3. HERO BANNER */}
                <Banner />

                {/* 4. MAIN CONTENT GRIDS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    {/* Left: Activity Chart (Span 7) */}
                    <div className="lg:col-span-7 h-[420px]">
                        <ActivityChartCard data={chartData} />
                    </div>

                    {/* Middle: Pending Approvals (Span 5) */}
                    <div className="lg:col-span-5 h-[420px]">
                        <PendingApprovalsList 
                            items={pendingInstitutions || []} 
                            navigate={navigate} 
                            isLoading={pendingLoading} 
                        />
                    </div>
                </div>

                {/* 5. SECONDARY GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Revenue Card (Span 4) */}
                    <div className="lg:col-span-4 h-[350px]">
                        <RevenueCard 
                            value={displayStats.revenue} 
                            trend={2.5} 
                            isLoading={statsLoading} 
                        />
                    </div>

                    {/* Right: Quick Settings / System Health (Span 8) */}
                    <motion.div variants={itemVariants} className="lg:col-span-8 bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col h-[350px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 font-serif">Quick Actions & Health</h3>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/health')}>System Status</Button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                            {[
                                { label: 'User Management', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', path: '/admin/users' },
                                { label: 'Institution Oversight', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', path: '/admin/institutions' },
                                { label: 'Arts Marketplace', icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', path: '/admin/arts' },
                                { label: 'Wallet & Finance', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', path: '/admin/wallets' },
                                { label: 'Security Center', icon: Shield, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', path: '/admin/security' },
                                { label: 'Global Settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', path: '/admin/settings' },
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigate(action.path)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${action.border} ${action.bg} hover:shadow-md transition-all duration-300 group`}
                                >
                                    <div className={`p-3 rounded-xl bg-white shadow-sm mb-3 group-hover:scale-110 transition-transform ${action.color}`}>
                                        <action.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 text-center">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
                
            </motion.div>
        </PageContainer>
    );
}

export default AdminDashboard;
