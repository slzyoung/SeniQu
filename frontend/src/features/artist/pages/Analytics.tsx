/**
 * Analytics Page
 */

import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Eye, Heart, DollarSign, TrendingUp, Download } from 'lucide-react';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Tabs } from '../../../components/ui';

const viewsData = [
    { date: 'Jan', views: 4000, likes: 2400 },
    { date: 'Feb', views: 3000, likes: 1398 },
    { date: 'Mar', views: 2000, likes: 9800 },
    { date: 'Apr', views: 2780, likes: 3908 },
    { date: 'May', views: 1890, likes: 4800 },
    { date: 'Jun', views: 2390, likes: 3800 },
];

const genreData = [
    { name: 'Landscape', value: 35 },
    { name: 'Portrait', value: 25 },
    { name: 'Abstract', value: 20 },
    { name: 'Cultural', value: 15 },
    { name: 'Digital', value: 5 },
];

const COLORS = ['#C9A84C', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'];

const locationData = [
    { country: 'Indonesia', visitors: 4500 },
    { country: 'USA', visitors: 2800 },
    { country: 'UK', visitors: 1200 },
    { country: 'Singapore', visitors: 980 },
    { country: 'Japan', visitors: 750 },
];

function StatCard({
    title,
    value,
    change,
    icon: Icon,
    trend,
    color
}: {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: React.ElementType;
    color: string;
}) {
    return (
        <Card variant="elevated">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-theme-muted">{title}</p>
                    <p className="text-2xl font-bold text-theme-text mt-1">{value}</p>
                    <p className={`text-sm mt-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {change}
                    </p>
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </Card>
    );
}

export function Analytics() {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('30d');

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'audience', label: 'Audience' },
        { id: 'content', label: 'Content' },
        { id: 'revenue', label: 'Revenue' },
    ];

    return (
        <PageContainer
            title="Analytics"
            description="Track your performance and audience insights"
            actions={
                <div className="flex flex-wrap gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 bg-theme-surface border border-theme-border rounded-lg text-sm text-theme-text focus:outline-none focus:border-gold"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                    <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                        Export
                    </Button>
                </div>
            }
        >
            {/* Stats */}
            <StatsGrid>
                <StatCard
                    title="Total Views"
                    value="124.5K"
                    change="+12.5%"
                    trend="up"
                    icon={Eye}
                    color="bg-blue-500/10 text-blue-500"
                />
                <StatCard
                    title="Total Likes"
                    value="8,234"
                    change="+8.2%"
                    trend="up"
                    icon={Heart}
                    color="bg-pink-500/10 text-pink-500"
                />
                <StatCard
                    title="Revenue"
                    value="$12,450"
                    change="+23.1%"
                    trend="up"
                    icon={DollarSign}
                    color="bg-gold/10 text-gold"
                />
                <StatCard
                    title="Engagement Rate"
                    value="6.8%"
                    change="+2.4%"
                    trend="up"
                    icon={TrendingUp}
                    color="bg-green-500/10 text-green-500"
                />
            </StatsGrid>

            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mt-8 mb-6" />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views Over Time */}
                <Card variant="elevated">
                    <CardHeader title="Views & Likes Over Time" />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={viewsData}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="views" stroke="#3B82F6" fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="likes" stroke="#EC4899" fillOpacity={1} fill="url(#colorLikes)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Genre Distribution */}
                <Card variant="elevated">
                    <CardHeader title="Artwork by Genre" />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genreData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genreData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Locations */}
                <Card variant="elevated" className="lg:col-span-2">
                    <CardHeader title="Visitors by Location" />
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={locationData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis type="category" dataKey="country" stroke="var(--text-muted)" fontSize={12} width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="visitors" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}

export default Analytics;
