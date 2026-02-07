/**
 * MobileBottomNav Component
 * Role-based bottom navigation for mobile devices
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    Search,
    Bookmark,
    User,
    Palette,
    BarChart3,
    Upload,
    Settings,
    Shield,
    Users,
    Building2,
    Bell,
    Grid,
    type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuthModalStore } from '../../stores/useAuthModalStore';
import { ROUTES } from '../../lib/constants';

interface NavItem {
    path: string;
    icon: LucideIcon;
    label: string;
    requiresAuth?: boolean;
}

const guestNavItems: NavItem[] = [
    { path: ROUTES.HOME, icon: Home, label: 'Home' },
    { path: '/collections', icon: Grid, label: 'Collections' },
    { path: ROUTES.ARTIST_UPLOAD, icon: Upload, label: 'Upload', requiresAuth: true },
    { path: ROUTES.USER_PROFILE, icon: User, label: 'Profile', requiresAuth: true },
];

const userNavItems: NavItem[] = [
    { path: ROUTES.USER_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.USER_GALLERY, icon: Search, label: 'Explore' },
    { path: ROUTES.USER_BOOKMARKS, icon: Bookmark, label: 'Bookmarks' },
    { path: ROUTES.USER_PROFILE, icon: User, label: 'Profile' },
];

const artistNavItems: NavItem[] = [
    { path: ROUTES.ARTIST_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.ARTIST_ARTWORKS, icon: Palette, label: 'Artworks' },
    { path: ROUTES.ARTIST_UPLOAD, icon: Upload, label: 'Upload' },
    { path: ROUTES.ARTIST_ANALYTICS, icon: BarChart3, label: 'Analytics' },
    { path: ROUTES.ARTIST_SETTINGS, icon: Settings, label: 'Settings' },
];

const adminNavItems: NavItem[] = [
    { path: ROUTES.ADMIN_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.ADMIN_USERS, icon: Users, label: 'Users' },
    { path: ROUTES.ADMIN_INSTITUTIONS, icon: Building2, label: 'Institutions' },
    { path: ROUTES.ADMIN_ALERTS, icon: Bell, label: 'Alerts' },
    { path: ROUTES.ADMIN_SECURITY, icon: Shield, label: 'Security' },
];

function getNavItems(role: string): NavItem[] {
    switch (role) {
        case 'admin':
            return adminNavItems;
        case 'artist':
        case 'institution':
            return artistNavItems;
        case 'user':
            return userNavItems;
        default:
            return guestNavItems;
    }
}

export function MobileBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const { openAuthModal } = useAuthModalStore();

    const navItems = getNavItems(isAuthenticated ? (user?.role || 'user') : 'guest');
    const currentPath = location.pathname;

    // Don't show on auth pages
    if (currentPath.startsWith('/auth')) {
        return null;
    }

    const handleNavClick = (item: NavItem) => {
        if (item.requiresAuth && !isAuthenticated) {
            openAuthModal();
        } else {
            navigate(item.path);
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-theme-surface/80 backdrop-blur-xl border-t border-theme-border/50 pb-[env(safe-area-inset-bottom)] shadow-lg shadow-theme-bg/20">
            <div className="grid grid-cols-4 sm:grid-cols-5 h-16 items-center px-2">
                {navItems.map((item) => {
                    // Active check logic: Exact match or starts with path (except for root dashboard paths to avoid false positives)
                    const isRoot = item.path === ROUTES.USER_DASHBOARD || item.path === ROUTES.ARTIST_DASHBOARD || item.path === ROUTES.ADMIN_DASHBOARD;
                    const isActive = isRoot
                        ? currentPath === item.path
                        : currentPath.startsWith(item.path);

                    const Icon = item.icon;

                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item)}
                            className="relative flex flex-col items-center justify-center gap-1 h-full w-full touch-manipulation active:scale-95 transition-transform duration-200"
                        >
                            <div className="relative p-1.5 rounded-xl transition-colors duration-300">
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute inset-0 bg-theme-primary/10 rounded-xl"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <Icon
                                    className={`w-5 h-5 transition-all duration-300 ${isActive
                                        ? 'text-seniqu-gold stroke-[2.5px]'
                                        : 'text-theme-muted stroke-[2px] opacity-70'
                                        }`}
                                />
                            </div>
                            <span
                                className={`text-[10px] font-medium transition-all duration-300 ${isActive
                                    ? 'text-seniqu-gold translate-y-0 opacity-100'
                                    : 'text-theme-muted translate-y-0.5 opacity-70'
                                    }`}
                            >
                                {item.label}
                            </span>

                            {/* Active Indicator Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-dot"
                                    className="absolute -top-1 w-1 h-1 rounded-full bg-seniqu-gold shadow-[0_0_8px_rgba(201,168,76,0.6)]"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default MobileBottomNav;
