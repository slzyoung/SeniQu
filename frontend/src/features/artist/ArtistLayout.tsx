/**
 * Artist Dashboard Layout
 */

import {
    LayoutDashboard,
    Image as ImageIcon,
    Upload,
    BarChart3,
    TrendingUp,
    Users,
    Building2,
    Settings,
    LogOut,
    Wallet
} from 'lucide-react';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { SidebarSection } from '../../components/ui/Sidebar';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar, Badge } from '../../components/ui';
import { ROUTES } from '../../lib/constants';

export function ArtistLayout() {
    const { user, logout, isInstitution } = useAuthStore();

    const sidebarSections: SidebarSection[] = [
        {
            title: 'Overview',
            items: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: <LayoutDashboard className="w-5 h-5" />,
                    path: ROUTES.ARTIST_DASHBOARD,
                },
            ],
        },
        {
            title: 'Content',
            items: [
                {
                    id: 'artworks',
                    label: 'My Artworks',
                    icon: <ImageIcon className="w-5 h-5" />,
                    path: ROUTES.ARTIST_ARTWORKS,
                },
                {
                    id: 'upload',
                    label: 'Upload Artwork',
                    icon: <Upload className="w-5 h-5" />,
                    path: ROUTES.ARTIST_UPLOAD,
                },
                {
                    id: 'marketplace',
                    label: 'NFT Marketplace',
                    icon: <Wallet className="w-5 h-5" />,
                    path: ROUTES.MARKETPLACE,
                },
            ],
        },
        {
            title: 'Analytics',
            items: [
                {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: <BarChart3 className="w-5 h-5" />,
                    path: ROUTES.ARTIST_ANALYTICS,
                },
                {
                    id: 'performance',
                    label: 'Performance',
                    icon: <TrendingUp className="w-5 h-5" />,
                    path: ROUTES.ARTIST_PERFORMANCE,
                },
                {
                    id: 'engagement',
                    label: 'Engagement',
                    icon: <Users className="w-5 h-5" />,
                    path: ROUTES.ARTIST_ENGAGEMENT,
                },
            ],
        },
        {
            title: 'Account',
            items: [
                ...(isInstitution() ? [{
                    id: 'institution',
                    label: 'Institution Profile',
                    icon: <Building2 className="w-5 h-5" />,
                    path: ROUTES.ARTIST_INSTITUTION,
                }] : []),
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: <Settings className="w-5 h-5" />,
                    path: ROUTES.ARTIST_SETTINGS,
                },
            ],
        },
    ];

    const SidebarFooter = () => (
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-theme-elevated transition-colors">
            <Avatar
                src={user?.avatar}
                name={user?.displayName || user?.username || 'Artist'}
                size="sm"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-theme-text truncate">
                        {user?.displayName || user?.username}
                    </p>
                    {user?.isVerified && (
                        <Badge variant="primary" size="sm">✓</Badge>
                    )}
                </div>
                <p className="text-xs text-theme-muted capitalize">{user?.role}</p>
            </div>
            <button
                onClick={logout}
                className="p-2 text-theme-muted hover:text-red-500 transition-colors"
                title="Sign out"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <DashboardLayout
            sections={sidebarSections}
            footer={<SidebarFooter />}
        />
    );
}

export default ArtistLayout;
