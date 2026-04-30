/**
 * Engagement Page
 * Premium light-theme design for artists tracking audience engagement.
 */

import { Users, Heart, MessageSquare, Share2, TrendingUp, TrendingDown } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card } from '../../../components/ui';

const stats = [
    { label: 'Total Followers', value: '12,450', trend: '+5.2%', icon: Users, isPositive: true },
    { label: 'Artwork Likes', value: '45.2K', trend: '+12.4%', icon: Heart, isPositive: true },
    { label: 'Comments', value: '1,240', trend: '-2.1%', icon: MessageSquare, isPositive: false },
    { label: 'Shares', value: '8,400', trend: '+15.3%', icon: Share2, isPositive: true },
];

export function Engagement() {
    return (
        <PageContainer
            title="Engagement"
            description="Track audience engagement and follower insights"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <Card key={i} variant="elevated" className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stat.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {stat.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">{stat.label}</p>
                            <h4 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h4>
                        </div>
                    </Card>
                ))}
            </div>
            
            <Card variant="elevated" className="p-8 text-center bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                <Users className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-indigo-900 mb-2">Deep Audience Analytics Coming Soon</h3>
                <p className="text-indigo-600/80 max-w-sm mx-auto font-medium">
                    We're building advanced demographic insights and engagement heatmaps to help you understand your collectors better.
                </p>
            </Card>
        </PageContainer>
    );
}

export default Engagement;
