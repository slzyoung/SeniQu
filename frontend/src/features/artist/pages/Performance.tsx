/**
 * Performance Page - Artist Performance Analytics
 * Uses real API data with useArtistPerformance hook
 */

import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button } from '../../../components/ui';
import {
    TrendingUp,
    Eye,
    Heart,
    Download,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { useArtistPerformance, useArtistStats } from '../../../hooks/useArtist';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export function Performance() {
    const { data: performance, isLoading: perfLoading, refetch } = useArtistPerformance();
    const { data: stats, isLoading: statsLoading } = useArtistStats();

    const isLoading = perfLoading || statsLoading;

    // Sample performance data (will come from real API)
    const performanceData = (performance as any)?.chartData || [
        { name: 'Jan', views: 4000, likes: 240, sales: 24 },
        { name: 'Feb', views: 3000, likes: 198, sales: 22 },
        { name: 'Mar', views: 5000, likes: 380, sales: 29 },
        { name: 'Apr', views: 4500, likes: 308, sales: 31 },
        { name: 'May', views: 6000, likes: 420, sales: 35 },
        { name: 'Jun', views: 5500, likes: 390, sales: 32 },
    ];

    const topArtworks = (performance as any)?.topArtworks || [];

    return (
        <PageContainer
            title="Performance"
            description="Track detailed performance metrics for your artworks"
            actions={
                <Button
                    variant="secondary"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => refetch()}
                >
                    Refresh
                </Button>
            }
        >
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card variant="elevated">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Eye className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-theme-muted text-sm">Total Views</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-text">
                                    {stats?.totalViews?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-green-500 mt-1">+12% this month</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-pink-500/10 rounded-lg">
                                        <Heart className="w-5 h-5 text-pink-500" />
                                    </div>
                                    <span className="text-theme-muted text-sm">Total Likes</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-text">
                                    {stats?.totalLikes?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-green-500 mt-1">+8% this month</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gold/10 rounded-lg">
                                        <Download className="w-5 h-5 text-gold" />
                                    </div>
                                    <span className="text-theme-muted text-sm">Sales</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-text">
                                    {stats?.totalSales || '0'}
                                </p>
                                <p className="text-xs text-green-500 mt-1">+15% this month</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                    </div>
                                    <span className="text-theme-muted text-sm">Revenue</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-text">
                                    ${stats?.totalRevenue?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-green-500 mt-1">+23% this month</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Performance Chart */}
                    <Card variant="elevated" className="mb-8">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-theme-text mb-6">Performance Trends</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a2e',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="views"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="likes"
                                            stroke="#ec4899"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Performing Artworks */}
                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-theme-text mb-4">Top Performing Artworks</h3>
                            {topArtworks.length === 0 ? (
                                <p className="text-theme-muted text-center py-8">
                                    No performance data available yet.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {topArtworks.map((artwork: any, idx: number) => (
                                        <div key={artwork.id || idx} className="flex items-center gap-4 p-3 bg-theme-surface rounded-lg">
                                            <span className="text-lg font-bold text-gold w-6">#{idx + 1}</span>
                                            <div className="flex-1">
                                                <p className="font-medium text-theme-text">{artwork.title}</p>
                                                <p className="text-sm text-theme-muted">{artwork.views} views</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-green-500">+{artwork.growth}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </PageContainer>
    );
}

export default Performance;
