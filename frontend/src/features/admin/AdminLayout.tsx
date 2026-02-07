/**
 * Admin Dashboard Layout
 */

import {
    LayoutDashboard,
    Building2,
    Users,
    BarChart3,
    Database,
    FileText,
    Shield,
    ShoppingBag,
    Crown,
    Settings,
    Activity,
    Flag,
    Handshake,
    Bell,
    User,
    LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { SidebarSection } from '../../components/ui/Sidebar';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar, Badge } from '../../components/ui';
import { ROUTES } from '../../lib/constants';

export const adminSidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard className="w-5 h-5" />,
                path: ROUTES.ADMIN_DASHBOARD,
            },
            {
                id: 'analytics',
                label: 'System Analytics',
                icon: <BarChart3 className="w-5 h-5" />,
                path: ROUTES.ADMIN_ANALYTICS,
            },
        ],
    },
    {
        title: 'Management',
        items: [
            {
                id: 'institutions',
                label: 'Institutions',
                icon: <Building2 className="w-5 h-5" />,
                path: ROUTES.ADMIN_INSTITUTIONS,
                badge: 3,
            },
            {
                id: 'users',
                label: 'Users & Admins',
                icon: <Users className="w-5 h-5" />,
                path: ROUTES.ADMIN_USERS,
            },
            {
                id: 'marketplace',
                label: 'NFT Marketplace',
                icon: <ShoppingBag className="w-5 h-5" />,
                path: ROUTES.ADMIN_MARKETPLACE,
            },
            {
                id: 'premium',
                label: 'Premium',
                icon: <Crown className="w-5 h-5" />,
                path: ROUTES.ADMIN_PREMIUM,
            },
            {
                id: 'partnerships',
                label: 'Partnerships',
                icon: <Handshake className="w-5 h-5" />,
                path: ROUTES.ADMIN_PARTNERSHIPS,
            },
        ],
    },
    {
        title: 'System',
        items: [
            {
                id: 'database',
                label: 'Database',
                icon: <Database className="w-5 h-5" />,
                path: ROUTES.ADMIN_DATABASE,
            },
            {
                id: 'logs',
                label: 'System Logs',
                icon: <FileText className="w-5 h-5" />,
                path: ROUTES.ADMIN_LOGS,
            },
            {
                id: 'health',
                label: 'System Health',
                icon: <Activity className="w-5 h-5" />,
                path: ROUTES.ADMIN_HEALTH,
            },
            {
                id: 'alerts',
                label: 'Alerts',
                icon: <Bell className="w-5 h-5" />,
                path: ROUTES.ADMIN_ALERTS,
                badge: 5,
            },
        ],
    },
    {
        title: 'Security & Reports',
        items: [
            {
                id: 'security',
                label: 'Security Center',
                icon: <Shield className="w-5 h-5" />,
                path: ROUTES.ADMIN_SECURITY,
            },
            {
                id: 'reports',
                label: 'Reports & Issues',
                icon: <Flag className="w-5 h-5" />,
                path: ROUTES.ADMIN_REPORTS,
                badge: 12,
            },
        ],
    },
    {
        title: 'Account',
        items: [
            {
                id: 'settings',
                label: 'Global Settings',
                icon: <Settings className="w-5 h-5" />,
                path: ROUTES.ADMIN_SETTINGS,
            },
            {
                id: 'profile',
                label: 'My Profile',
                icon: <User className="w-5 h-5" />,
                path: ROUTES.ADMIN_PROFILE,
            },
        ],
    },
];

function SidebarFooter() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        logout();
        navigate(ROUTES.LOGIN);
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-3 p-2 rounded-xl md:hover:bg-theme-elevated transition-colors w-full">
            <Link to={ROUTES.ADMIN_PROFILE} className="flex-shrink-0 relative group">
                <Avatar
                    src={user?.avatar}
                    name={user?.displayName || 'Admin'}
                    size="sm"
                    status="online"
                />
            </Link>

            <div className="flex-1 min-w-0 hidden md:block">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-theme-text truncate">
                        {user?.displayName || user?.username}
                    </p>
                    <Badge variant="danger" size="sm">Admin</Badge>
                </div>
                <p className="text-xs text-theme-muted">Super Admin</p>
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
}

export function AdminLayout() {
    return (
        <DashboardLayout
            sections={adminSidebarSections}
            footer={<SidebarFooter />}
        />
    );
}

export default AdminLayout;
