/**
 * Admin Dashboard Layout
 */

import {
    LogOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar, Badge } from '../../components/ui';
import { ROUTES } from '../../lib/constants';
import { adminSidebarSections, getInstitutionSidebar } from '../../config/sidebar';
import { useLogout } from '../../hooks/useLogout';

function SidebarFooter() {
    const { user } = useAuthStore();
    const handleLogout = useLogout();

    const adminRole = (user as any)?.adminRole || (user as any)?.admin_role_typed || '';
    const roleLabel = adminRole
        ? adminRole.replace('_', ' ').replace('ADMIN', 'Admin').trim()
        : (user?.role || 'admin').replace('_', ' ');

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
                    <Badge variant={user?.role === 'super_admin' ? 'danger' : 'primary'} size="sm">
                        {user?.role === 'super_admin' ? 'Super' : 'Admin'}
                    </Badge>
                </div>
                <p className="text-xs text-theme-muted capitalize">{roleLabel}</p>
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
    const { user } = useAuthStore();
    const adminRole = (user as any)?.adminRole || (user as any)?.admin_role_typed || '';
    const sections = user?.role === 'super_admin'
        ? adminSidebarSections
        : getInstitutionSidebar(adminRole);

    return (
        <ErrorBoundary>
            <DashboardLayout
                sections={sections}
                footer={<SidebarFooter />}
            />
        </ErrorBoundary>
    );
}

export default AdminLayout;
