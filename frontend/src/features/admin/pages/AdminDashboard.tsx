/**
 * AdminDashboard Imports and Component
 */
import React from 'react';
import {
    ArrowUpRight,
    Shield,
    Users,
    Building2,
    Image as ImageIcon,
    DollarSign,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Avatar } from '../../../components/ui';
import { useSystemStats, usePendingInstitutions } from '../../../hooks/useAdmin';
import { useCurrentUser } from '../../../hooks/useUser';
import { adminService } from '../../../services/adminService';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { SystemAlert } from '../../../lib/types';

function StatCard({
    title,
    value,
    change,
    icon: Icon,
    color,
    trend,
    isLoading
}: {
    title: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down';
    icon: React.ElementType;
    color: string;
    isLoading?: boolean;
}) {
    return (
        <Card variant="elevated">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-theme-muted">{title}</p>
                    {isLoading ? (
                        <div className="h-8 w-20 bg-theme-elevated animate-pulse rounded mt-1" />
                    ) : (
                        <p className="text-xl sm:text-2xl font-bold text-theme-text mt-1">{value}</p>
                    )}
                    {change && (
                        <p className={`text-xs sm:text-sm mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                            <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                            {change}
                        </p>
                    )}
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl ${color} flex-shrink-0 backdrop-blur-sm`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            </div>
        </Card>
    );
}

function RecentAlert({
    type,
    message,
    time
}: {
    type: SystemAlert['type'];
    message: string;
    time: string;
}) {
    const colors: Record<string, string> = {
        warning: 'bg-yellow-500/10 text-yellow-500',
        error: 'bg-red-500/10 text-red-500',
        critical: 'bg-red-500/20 text-red-600',
        info: 'bg-blue-500/10 text-blue-500',
    };

    return (
        <div className="flex items-start gap-3 py-3 border-b border-theme-border last:border-b-0">
            <div className={`p-2 rounded-lg ${colors[type] || colors.info}`}>
                <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-theme-text">{message}</p>
                <p className="text-xs text-theme-muted">{time}</p>
            </div>
        </div>
    );
}

export function AdminDashboard() {
    const { data: user } = useCurrentUser();
    const { data: stats } = useSystemStats();
    const { data: pendingInstitutions } = usePendingInstitutions();

    const { data: alerts, isLoading: alertsisLoading } = useQuery({
        queryKey: ['admin', 'alerts'],
        queryFn: () => adminService.getSystemAlerts(),
    });

    return (
        <PageContainer
            title={`Welcome back, ${user?.displayName || 'Admin'}`}
            description="System overview and management"
            actions={
                <Button variant="gold" leftIcon={<Shield className="w-full sm:w-auto w-4 h-4" />} className="shadow-lg shadow-gold/20">
                    <span>Security Check</span>
                </Button>
            }
        >
            {/* Stats */}
            <div className="mb-8">
                <StatsGrid>
                    <StatCard
                        title="Total Users"
                        value={stats?.totalUsers?.toLocaleString() || '0'}
                        change={stats ? "+12% this month" : undefined}
                        trend="up"
                        icon={Users}
                        color="bg-blue-500/10 text-blue-500"
                    />
                    <StatCard
                        title="Institutions"
                        value={stats?.totalInstitutions?.toLocaleString() || '0'}
                        change={pendingInstitutions?.length ? `+${pendingInstitutions.length} pending` : undefined}
                        trend="up"
                        icon={Building2}
                        color="bg-purple-500/10 text-purple-500"
                    />
                    <StatCard
                        title="Total Artworks"
                        value={stats?.totalArtworks?.toLocaleString() || '0'}
                        change="+5% this week"
                        trend="up"
                        icon={ImageIcon}
                        color="bg-pink-500/10 text-pink-500"
                    />
                    <StatCard
                        title="Revenue (MTD)"
                        value={formatCurrency(stats?.totalRevenue || 0)}
                        change="+8.5%"
                        trend="up"
                        icon={DollarSign}
                        color="bg-gold/10 text-gold"
                    />
                </StatsGrid>
            </div>

            {/* Pending Approvals Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card variant="elevated">
                    <CardHeader
                        title="Pending Approvals"
                        action={
                            <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                                View All
                            </Button>
                        }
                    />
                    <CardContent>
                        {pendingInstitutions?.length === 0 ? (
                            <p className="text-sm text-theme-muted py-4 text-center">No pending approvals</p>
                        ) : (
                            pendingInstitutions?.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-3 border-b border-theme-border last:border-b-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Avatar name={item.name} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-theme-text truncate">{item.name}</p>
                                            <p className="text-xs text-theme-muted truncate">Institution</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="primary" size="sm">Review</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Recent Alerts */}
                <Card variant="elevated">
                    <CardHeader title="Recent Alerts" />
                    <CardContent>
                        {alertsisLoading ? (
                            <p className="text-sm text-theme-muted py-4 text-center">Loading alerts...</p>
                        ) : alerts?.length === 0 ? (
                            <p className="text-sm text-theme-muted py-4 text-center">No active alerts</p>
                        ) : (
                            alerts?.slice(0, 5).map((alert) => (
                                <RecentAlert
                                    key={alert.id}
                                    type={alert.type}
                                    message={alert.message}
                                    time={formatDate(alert.createdAt || new Date().toISOString())}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}

export default AdminDashboard;
