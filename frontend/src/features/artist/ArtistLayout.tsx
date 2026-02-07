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
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { SidebarSection } from '../../components/ui/Sidebar';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar, Badge } from '../../components/ui';
import { ROUTES } from '../../lib/constants';

export const getArtistSidebarSections = (isInstitution: boolean): SidebarSection[] => [
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
            ...(isInstitution ? [{
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

export function ArtistLayout() {
    const { user, logout, isInstitution } = useAuthStore();

    const SidebarFooter = () => {
        const navigate = useNavigate();

        const handleLogout = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            logout();
            navigate(ROUTES.LOGIN);
        };

        return (
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-3 p-2 rounded-xl md:hover:bg-theme-elevated transition-colors w-full">
                <Link to={ROUTES.ARTIST_SETTINGS} className="flex-shrink-0 relative group">
                    <Avatar
                        src={user?.avatar}
                        name={user?.displayName || user?.username || 'Artist'}
                        size="sm"
                    />
                </Link>

                <div className="flex-1 min-w-0 hidden md:block">
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
                    onClick={handleLogout}
                    className="p-2 text-theme-muted hover:text-red-500 bg-theme-elevated/50 md:bg-transparent rounded-xl md:rounded-lg transition-colors"
                    title="Sign out"
                >
                    <LogOut className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </div>
        );
    };

    return (
        <DashboardLayout
            sections={getArtistSidebarSections(isInstitution())}
            footer={<SidebarFooter />}
        />
    );
}

export default ArtistLayout;
