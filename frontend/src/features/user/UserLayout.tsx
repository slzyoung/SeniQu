/**
 * User Dashboard Layout
 */

import {
    LogOut,
} from 'lucide-react';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar } from '../../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { userSidebarSections } from '../../config/sidebar';

function SidebarFooter() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        // Implement async logout as requested
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network/process delay for better UX
        logout();
        navigate(ROUTES.LOGIN);
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-3 p-2 rounded-xl md:hover:bg-theme-elevated transition-colors w-full">
            <Link to={ROUTES.USER_PROFILE} className="flex-shrink-0 relative group">
                <Avatar
                    src={user?.avatar}
                    name={user?.displayName || user?.username || 'User'}
                    size="sm"
                />
            </Link>

            <div className="flex-1 min-w-0 hidden md:block">
                <p className="text-sm font-medium text-theme-text truncate">
                    {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-theme-muted truncate">{user?.email}</p>
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

export function UserLayout() {
    return (
        <DashboardLayout
            sections={userSidebarSections}
            footer={<SidebarFooter />}
        />
    );
}

export default UserLayout;
