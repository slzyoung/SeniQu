/**
 * User Dashboard Page
 * Uses real API data with comprehensive hooks
 */

import React from 'react';
import {
    Eye,
    Heart,
    FolderHeart,
    TrendingUp,
    ArrowUpRight,
    Image as ImageIcon,
    Clock,
    Bookmark,
    Grid3X3
} from 'lucide-react';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Badge } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import {
    useCurrentUser,
    useUserStats,
    useBookmarks,
    useCollections,
    useRecentActivity
} from '../../../hooks/useUser';
import { extractArray } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';

// Stats Card Component
function StatCard({
    title,
    value,
    change,
    icon: Icon,
    color,
    isLoading
}: {
    title: string;
    value: string;
    change?: string;
    icon: React.ElementType;
    color: string;
    isLoading?: boolean;
}) {
    return (
        <Card variant="elevated" className="relative overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-theme-muted">{title}</p>
                    {isLoading ? (
                        <div className="h-8 w-16 bg-theme-elevated animate-pulse rounded mt-1" />
                    ) : (
                        <p className="text-xl sm:text-2xl font-bold text-theme-text mt-1">{value}</p>
                    )}
                    {change && (
                        <p className="text-xs sm:text-sm text-green-500 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
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

// Recent Activity Item
function ActivityItem({
    title,
    description,
    time,
    type
}: {
    title: string;
    description: string;
    time: string;
    type: 'bookmark' | 'view' | 'collection' | 'like';
}) {
    const icons = {
        bookmark: <Heart className="w-4 h-4 text-pink-500" />,
        view: <Eye className="w-4 h-4 text-blue-500" />,
        collection: <FolderHeart className="w-4 h-4 text-purple-500" />,
        like: <Heart className="w-4 h-4 text-red-500" />,
    };

    return (
        <div className="flex items-start gap-3 py-3 border-b border-theme-border last:border-b-0">
            <div className="p-2 bg-theme-elevated rounded-lg flex-shrink-0">
                {icons[type] || icons.view}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text truncate">{title}</p>
                <p className="text-xs text-theme-muted truncate">{description}</p>
            </div>
            <span className="text-xs text-theme-muted whitespace-nowrap flex-shrink-0">{time}</span>
        </div>
    );
}

// Artwork Card
function ArtworkCard({
    title,
    artist,
    image,
    isArt,
    onClick
}: {
    title: string;
    artist: string;
    image: string;
    isArt?: boolean;
    onClick?: () => void;
}) {
    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer touch-manipulation active:scale-[0.98] transition-all duration-200" onClick={onClick}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-theme-elevated">
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-theme-muted/40" />
                    </div>
                )}
                {isArt && (
                    <Badge variant="gold" className="absolute top-3 right-3 shadow-lg">PoA</Badge>
                )}
            </div>
            <div className="p-3 sm:p-4">
                <h3 className="font-medium text-theme-text truncate text-sm leading-tight group-hover:text-gold transition-colors">{title}</h3>
                <p className="text-[10px] sm:text-xs text-theme-muted truncate mt-1">{artist}</p>
            </div>
        </Card >
    );
}

export function UserDashboard() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const { data: stats, isLoading: statsLoading } = useUserStats();
    const { data: bookmarksData, isLoading: isBookmarksLoading } = useBookmarks(1, 4);
    const { data: collectionsData, isLoading: isCollectionsLoading } = useCollections(1, 4);
    const { data: activityData, isLoading: isActivityLoading } = useRecentActivity(5);

    // Use extractArray for safe data extraction
    const bookmarks = extractArray(bookmarksData);
    const collections = extractArray(collectionsData);
    const activities = extractArray(activityData);

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <PageContainer
            title={`Welcome back, ${user?.displayName || 'User'}`}
            subtitle="Here's what's happening with your collection today."
            actions={
                <Button
                    variant="gold"
                    onClick={() => navigate(ROUTES.GALLERY)}
                    leftIcon={<Grid3X3 className="w-4 h-4" />}
                    className="w-full sm:w-auto shadow-lg shadow-gold/20"
                >
                    <span>Explore Gallery</span>
                </Button>
            }
        >
            {/* Stats */}
            <div className="mb-8">
                <StatsGrid>
                    <StatCard
                        title="Total Views"
                        value={stats?.viewsCount?.toLocaleString() || '0'}
                        icon={Eye}
                        color="bg-blue-500/10 text-blue-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Bookmarked"
                        value={stats?.bookmarksCount?.toLocaleString() || '0'}
                        icon={Bookmark}
                        color="bg-pink-500/10 text-pink-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Collections"
                        value={stats?.collectionsCount?.toLocaleString() || '0'}
                        icon={FolderHeart}
                        color="bg-purple-500/10 text-purple-500"
                        isLoading={statsLoading}
                    />
                    <StatCard
                        title="Arts Owned"
                        value={stats?.nftCount?.toLocaleString() || '0'}
                        icon={ImageIcon}
                        color="bg-gold/10 text-gold"
                        isLoading={statsLoading}
                    />
                </StatsGrid>
            </div>

            {/* Bookmarks & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
                {/* Recent Bookmarks */}
                <div className="lg:col-span-2">
                    <Card variant="elevated">
                        <CardHeader
                            title="Recent Bookmarks"
                            action={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    rightIcon={<ArrowUpRight className="w-4 h-4" />}
                                    onClick={() => navigate('/dashboard/bookmarks')}
                                >
                                    View All
                                </Button>
                            }
                        />
                        <CardContent>
                            {isBookmarksLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} variant="default" padding="none" className="animate-pulse">
                                            <div className="aspect-[4/3] bg-theme-elevated" />
                                            <div className="p-3 space-y-2">
                                                <div className="h-4 bg-theme-elevated rounded w-3/4" />
                                                <div className="h-3 bg-theme-elevated rounded w-1/2" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : bookmarks.length ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    {bookmarks.slice(0, 4).map((bookmark: any) => (
                                        <ArtworkCard
                                            key={bookmark.id}
                                            title={bookmark.artwork?.title || 'Untitled'}
                                            artist={bookmark.artwork?.artist?.displayName || 'Unknown'}
                                            image={bookmark.artwork?.imageUrl || ''}
                                            isArt={bookmark.artwork?.isArt}
                                            onClick={() => navigate(`/artwork/${bookmark.artworkId}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-theme-muted">
                                    <Heart className="w-10 h-10 opacity-30 mb-3" />
                                    <p className="text-sm">No bookmarks yet</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-gold"
                                        onClick={() => navigate('/gallery')}
                                    >
                                        Start exploring
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card variant="elevated">
                    <CardHeader title="Recent Activity" />
                    <CardContent>
                        {isActivityLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-3 py-3 border-b border-theme-border last:border-0 animate-pulse">
                                        <div className="w-8 h-8 bg-theme-elevated rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-theme-elevated rounded w-3/4" />
                                            <div className="h-3 bg-theme-elevated rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length ? (
                            activities.slice(0, 5).map((activity: any, index: number) => (
                                <ActivityItem
                                    key={activity.id || index}
                                    title={activity.title || 'Activity'}
                                    description={activity.message || activity.description || ''}
                                    time={activity.createdAt ? formatRelativeTime(activity.createdAt) : 'Recently'}
                                    type={activity.type || 'view'}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-theme-muted">
                                <Clock className="w-8 h-8 opacity-30 mb-2" />
                                <p className="text-sm">No recent activity</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Collections & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
                {/* My Collections */}
                <Card variant="elevated">
                    <CardHeader
                        title="My Collections"
                        action={
                            <Button
                                variant="ghost"
                                size="sm"
                                rightIcon={<ArrowUpRight className="w-4 h-4" />}
                                onClick={() => navigate('/dashboard/collections')}
                            >
                                View All
                            </Button>
                        }
                    />
                    <CardContent>
                        {isCollectionsLoading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="p-3 bg-theme-elevated rounded-xl animate-pulse">
                                        <div className="w-full aspect-video bg-theme-border/50 rounded-lg mb-2" />
                                        <div className="h-4 bg-theme-border/50 rounded w-3/4 mb-1" />
                                        <div className="h-3 bg-theme-border/50 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : collections.length ? (
                            <div className="grid grid-cols-2 gap-3">
                                {collections.slice(0, 4).map((collection: any) => (
                                    <div
                                        key={collection.id}
                                        className="p-3 bg-theme-elevated rounded-xl hover:bg-theme-border/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/dashboard/collections/${collection.id}`)}
                                    >
                                        <div className="w-full aspect-video bg-theme-border/50 rounded-lg mb-2 flex items-center justify-center">
                                            <FolderHeart className="w-6 h-6 text-theme-muted" />
                                        </div>
                                        <p className="font-medium text-sm text-theme-text truncate">{collection.name}</p>
                                        <p className="text-xs text-theme-muted">{collection.artworksCount || 0} artworks</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-theme-muted">
                                <FolderHeart className="w-10 h-10 opacity-30 mb-3" />
                                <p className="text-sm">No collections yet</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-gold"
                                    onClick={() => navigate('/dashboard/collections')}
                                >
                                    Create Collection
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card variant="elevated">
                    <CardHeader title="Quick Actions" />
                    <CardContent className="grid grid-cols-2 gap-3 sm:gap-4">
                        <Button
                            variant="secondary"
                            className="h-20 sm:h-24 flex-col gap-2 rounded-xl active:scale-95 transition-transform"
                            onClick={() => navigate('/gallery')}
                        >
                            <Grid3X3 className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                            <span className="text-xs sm:text-sm font-medium">Explore Gallery</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-20 sm:h-24 flex-col gap-2 rounded-xl active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/bookmarks')}
                        >
                            <Bookmark className="w-6 h-6 sm:w-7 sm:h-7 text-pink-500" />
                            <span className="text-xs sm:text-sm font-medium">My Bookmarks</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-20 sm:h-24 flex-col gap-2 rounded-xl active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/collections')}
                        >
                            <FolderHeart className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
                            <span className="text-xs sm:text-sm font-medium">Collections</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-20 sm:h-24 flex-col gap-2 rounded-xl active:scale-95 transition-transform"
                            onClick={() => navigate('/dashboard/profile')}
                        >
                            <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
                            <span className="text-xs sm:text-sm font-medium">Profile</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}

export default UserDashboard;
