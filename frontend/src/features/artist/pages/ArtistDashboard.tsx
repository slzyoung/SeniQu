/**
 * Artist Dashboard Page
 * Uses real API data with comprehensive hooks
 */

import React from 'react';
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
    FileText
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    useArtistStats,
    useArtistAnalytics,
    useArtistPerformance,
    useMyArtworks
} from '../../../hooks/useArtist';

// Stats Card Component
function StatCard({
    title,
    value,
    change,
    trend,
    icon: Icon,
    color,
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
                        <div className="h-8 w-16 bg-theme-elevated animate-pulse rounded mt-1" />
                    ) : (
                        <p className="text-xl sm:text-2xl font-bold text-theme-text mt-1">{value}</p>
                    )}
                    {change && (
                        <p className={`text-xs sm:text-sm mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {change}
                        </p>
                    )}
                </div>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl ${color} flex-shrink-0 backdrop-blur-sm`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
        </Card>
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
        <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-theme-border last:border-b-0">
            <span className="text-base sm:text-lg font-bold text-theme-muted w-5 sm:w-6">{rank}</span>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-theme-elevated">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-theme-muted" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-theme-text truncate text-sm sm:text-base">{title}</p>
                <div className="flex items-center gap-3 text-xs text-theme-muted">
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {likes.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function ArtistDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // Use new comprehensive hooks
    const { data: stats, isLoading: statsLoading } = useArtistStats();
    const { data: analytics } = useArtistAnalytics('30d');
    const { data: performance } = useArtistPerformance();
    const { data: artworksData } = useMyArtworks(1, 10, { status: 'PUBLISHED' });

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

    return (
        <PageContainer
            title={`Welcome back, ${user?.displayName || 'Artist'}`}
            description="Performance overview"
            actions={
                <Button
                    variant="gold"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/dashboard/artist/upload')}
                    className="w-full sm:w-auto shadow-lg shadow-gold/20"
                >
                    <span>Upload Artwork</span>
                </Button>
            }
        >
            <div className="mb-8">
                <StatsGrid>
                    <StatCard
                        title="Total Views"
                        value={stats?.totalViews?.toLocaleString() || '0'}
                        change={undefined}
                        trend="up"
                        icon={Eye}
                        color="bg-blue-500/10 text-blue-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Total Likes"
                        value={stats?.totalLikes?.toLocaleString() || '0'}
                        change={undefined}
                        trend="up"
                        icon={Heart}
                        color="bg-pink-500/10 text-pink-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Artworks"
                        value={`${stats?.publishedArtworks || 0} / ${stats?.totalArtworks || 0}`}
                        icon={ImageIcon}
                        color="bg-purple-500/10 text-purple-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Followers"
                        value={stats?.totalFollowers?.toLocaleString() || '0'}
                        icon={Users}
                        color="bg-emerald-500/10 text-emerald-500"
                        isLoading={statsLoading}
                    />
                </StatsGrid>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
                    <Card variant="default" className="text-center py-4 sm:py-5 border-theme-border/60">
                        <div className="flex flex-col items-center">
                            <DollarSign className="w-5 h-5 text-gold mb-1.5" />
                            <p className="text-lg sm:text-xl font-bold text-theme-text">{formatCurrency(stats?.totalRevenue || 0)}</p>
                            <p className="text-xs text-theme-muted">Revenue</p>
                        </div>
                    </Card>
                    <Card variant="default" className="text-center py-4 sm:py-5 border-theme-border/60">
                        <div className="flex flex-col items-center">
                            <Star className="w-5 h-5 text-yellow-500 mb-1.5" />
                            <p className="text-lg sm:text-xl font-bold text-theme-text">{stats?.averageRating?.toFixed(1) || '0.0'}</p>
                            <p className="text-xs text-theme-muted">Avg Rating</p>
                        </div>
                    </Card>
                    <Card variant="default" className="text-center py-4 sm:py-5 border-theme-border/60">
                        <div className="flex flex-col items-center">
                            <TrendingUp className="w-5 h-5 text-green-500 mb-1.5" />
                            <p className="text-lg sm:text-xl font-bold text-theme-text">{stats?.totalSales || 0}</p>
                            <p className="text-xs text-theme-muted">Sales</p>
                        </div>
                    </Card>
                    <Card variant="default" className="text-center py-4 sm:py-5 border-theme-border/60">
                        <div className="flex flex-col items-center">
                            <FileText className="w-5 h-5 text-blue-500 mb-1.5" />
                            <p className="text-lg sm:text-xl font-bold text-theme-text">{stats?.draftArtworks || 0}</p>
                            <p className="text-xs text-theme-muted">Drafts</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Charts & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
                {/* Views Chart */}
                <div className="lg:col-span-2">
                    <Card variant="elevated">
                        <CardHeader title="Views Over Time" />
                        <CardContent className="h-64 sm:h-80">
                            {analytics?.views?.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.views.slice(-14)}>
                                        <defs>
                                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="rgba(255,255,255,0.5)"
                                            fontSize={12}
                                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(0,0,0,0.9)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#6366f1"
                                            fill="url(#viewsGradient)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-theme-muted">
                                    <div className="text-center">
                                        <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Analytics data will appear here once you have more activity.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Top Artworks */}
                <Card variant="elevated">
                    <CardHeader
                        title="Top Performing"
                        action={
                            <Button
                                variant="ghost"
                                size="sm"
                                rightIcon={<ArrowUpRight className="w-4 h-4" />}
                                onClick={() => navigate('/dashboard/artist/artworks')}
                            >
                                View All
                            </Button>
                        }
                    />
                    <CardContent>
                        {performance?.topArtworks?.length ? (
                            performance.topArtworks.slice(0, 4).map((art, index) => (
                                <TopArtworkCard
                                    key={art.id}
                                    rank={index + 1}
                                    title={art.title}
                                    views={art.views}
                                    likes={art.likes}
                                    image=""
                                />
                            ))
                        ) : artworksData?.data?.length ? (
                            artworksData.data.slice(0, 4).map((art, index) => (
                                <TopArtworkCard
                                    key={art.id}
                                    rank={index + 1}
                                    title={art.title}
                                    views={art.views || 0}
                                    likes={art.likes || 0}
                                    image={art.imageUrl || ''}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-theme-muted">
                                <p className="text-sm">No artworks published yet</p>
                                <Button
                                    variant="ghost"
                                    className="mt-2 text-gold"
                                    onClick={() => navigate('/dashboard/artist/upload')}
                                >
                                    Upload your first artwork
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Performance Metrics & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
                {/* Performance Metrics */}
                <Card variant="elevated">
                    <CardHeader title="Performance Metrics" />
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-theme-muted">Engagement Rate</span>
                                <span className="font-medium text-theme-text">
                                    {performance?.engagementRate?.toFixed(2) || '0.00'}%
                                </span>
                            </div>
                            <div className="h-2 bg-theme-elevated rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                    style={{ width: `${Math.min(performance?.engagementRate || 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-theme-muted">Conversion Rate</span>
                                <span className="font-medium text-theme-text">
                                    {performance?.conversionRate?.toFixed(2) || '0.00'}%
                                </span>
                            </div>
                            <div className="h-2 bg-theme-elevated rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-gold to-yellow-500 rounded-full"
                                    style={{ width: `${Math.min(performance?.conversionRate || 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-theme-border">
                                <span className="text-sm text-theme-muted">Avg Views/Artwork</span>
                                <span className="font-medium text-theme-text">
                                    {Math.round(performance?.averageViewsPerArtwork || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card variant="elevated">
                    <CardHeader title="Quick Actions" />
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            className="h-16 sm:h-20 flex-col gap-2 touch-manipulation active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/artist/upload')}
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-xs sm:text-sm">Upload Artwork</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-16 sm:h-20 flex-col gap-2 touch-manipulation active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/artist/artworks')}
                        >
                            <Eye className="w-5 h-5" />
                            <span className="text-xs sm:text-sm">My Artworks</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-16 sm:h-20 flex-col gap-2 touch-manipulation active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/artist/analytics')}
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-xs sm:text-sm">Analytics</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-16 sm:h-20 flex-col gap-2 touch-manipulation active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/artist/profile')}
                        >
                            <Users className="w-5 h-5" />
                            <span className="text-xs sm:text-sm">Profile</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </PageContainer >
    );
}

export default ArtistDashboard;
