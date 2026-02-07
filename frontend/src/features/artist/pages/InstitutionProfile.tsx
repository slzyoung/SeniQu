/**
 * Institution Profile Page - Placeholder
 */

import { Building2 } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card } from '../../../components/ui';

export function InstitutionProfile() {
    return (
        <PageContainer
            title="Institution Profile"
            description="Manage your institution's public profile"
        >
            <Card variant="elevated" className="text-center py-16">
                <Building2 className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text mb-2">Institution Settings</h3>
                <p className="text-theme-muted max-w-sm mx-auto">
                    Manage your institution's profile, team members, and organizational settings.
                    This feature is coming soon.
                </p>
            </Card>
        </PageContainer>
    );
}

export default InstitutionProfile;
