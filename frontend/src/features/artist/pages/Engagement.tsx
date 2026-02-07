/**
 * Engagement Page - Placeholder
 */

import { Users } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card } from '../../../components/ui';

export function Engagement() {
    return (
        <PageContainer
            title="Engagement"
            description="Track audience engagement and follower insights"
        >
            <Card variant="elevated" className="text-center py-16">
                <Users className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text mb-2">Audience Engagement</h3>
                <p className="text-theme-muted max-w-sm mx-auto">
                    Follower growth, engagement rates, and audience demographics will be displayed here.
                    This feature is coming soon.
                </p>
            </Card>
        </PageContainer>
    );
}

export default Engagement;
