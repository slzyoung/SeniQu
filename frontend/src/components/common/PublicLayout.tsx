/**
 * Public Layout Component
 * Wraps public pages (Marketplace, AI, etc.) with the standard DashboardLayout
 * to ensure consistent Sidebar and Header behavior.
 */

import {
    LogIn
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ROUTES } from '../../lib/constants';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar } from '../ui';
import { Link, Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import { MobileNav } from '../MobileNav';
import {
    publicSidebarSections,
    adminSidebarSections,
    getArtistSidebarSections,
    userSidebarSections
} from '../../config/sidebar';

function PublicSidebarFooter() {
    const { user, isAuthenticated } = useAuthStore();

    if (isAuthenticated && user) {
        return (
            <Link to={ROUTES.USER_DASHBOARD} className="flex items-center justify-center md:justify-start gap-3 p-2 rounded-xl hover:bg-theme-elevated transition-colors">
                <Avatar
                    src={user.avatar}
                    name={user.displayName || user.username || 'User'}
                    size="sm"
                />
                <div className="flex-1 min-w-0 hidden md:block">
                    <p className="text-sm font-medium text-theme-text truncate">
                        {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-theme-muted truncate">Go to Dashboard</p>
                </div>
            </Link>
        );
    }

    return (
        <Link to={ROUTES.LOGIN} className="flex items-center justify-center md:justify-start gap-3 p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors" title="Log In / Register">
            <LogIn className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:block">Log In / Register</span>
        </Link>
    );
}

export function PublicLayout() {
    const { user, isAuthenticated, isInstitution, isAdmin, isArtist } = useAuthStore();

    let sections = publicSidebarSections;

    if (isAuthenticated && user) {
        if (isAdmin()) {
            sections = adminSidebarSections;
        } else if (isArtist() || isInstitution()) {
            sections = getArtistSidebarSections(isInstitution());
        } else {
            sections = userSidebarSections;
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-theme-bg flex flex-col">
                <Navbar />
                <main className="flex-1 pt-24 md:pt-28 pb-24 md:pb-0">
                    <Outlet />
                </main>
                <div className="hidden md:block">
                    <Footer />
                </div>
                <MobileNav />
            </div>
        );
    }

    return (
        <DashboardLayout
            sections={sections}
            footer={<PublicSidebarFooter />}
        />
    );
}

export default PublicLayout;
