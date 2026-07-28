/**
 * MobileBottomNav Component
 * Role-based bottom navigation with centered "Analyze" (AI Heritage Analyzer) button
 * Premium design supporting light mode (professional slate/indigo) and dark mode (luxury gold)
 * Refined subtle shadows for optimal visual comfort in both light and dark themes.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    User,
    Palette,
    BarChart3,
    Upload,
    Settings,
    Shield,
    Users,
    Building2,
    Bell,
    ScanLine,
    Play,
    Compass,
    type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuthModalStore } from '../../stores/useAuthModalStore';
import { useUIStore } from '../../stores/useUIStore';
import { ROUTES } from '../../lib/constants';
import { Avatar } from '../ui/Avatar';

interface NavItem {
    path: string;
    icon: LucideIcon;
    label: string;
    requiresAuth?: boolean;
    isCenter?: boolean; // Centered elevated button
}

// ============================================================
// NAV ITEMS PER ROLE
// ============================================================

const guestNavItems: NavItem[] = [
    { path: ROUTES.HOME, icon: Home, label: 'Home' },
    { path: ROUTES.NEARBY_PUBLIC, icon: Compass, label: 'Explore' },
    { path: ROUTES.AI_GENRE, icon: ScanLine, label: 'Analyze', isCenter: true },
    { path: ROUTES.REELS, icon: Play, label: 'Reels' },
    { path: ROUTES.LOGIN, icon: User, label: 'Profile' },
];

const userNavItems: NavItem[] = [
    { path: ROUTES.USER_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.USER_NEARBY, icon: Compass, label: 'Explore' },
    { path: ROUTES.USER_GENRE_IDENTIFIER, icon: ScanLine, label: 'Analyze', isCenter: true },
    { path: ROUTES.REELS, icon: Play, label: 'Reels' },
    { path: ROUTES.USER_PROFILE, icon: User, label: 'Profile' },
];

const artistNavItems: NavItem[] = [
    { path: ROUTES.ARTIST_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.ARTIST_ARTWORKS, icon: Palette, label: 'Artworks' },
    { path: ROUTES.ARTIST_UPLOAD, icon: Upload, label: 'Upload', isCenter: true },
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
        case 'super_admin':
            return adminNavItems;
        case 'artist':
        case 'institution':
            return artistNavItems;
        case 'user':
        case 'collector':
            return userNavItems;
        default:
            return guestNavItems;
    }
}

// ============================================================
// COMPONENT
// ============================================================

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
        // Close sidebar/mobile menu when navigating
        useUIStore.getState().setMobileMenuOpen(false);

        if (item.requiresAuth && !isAuthenticated) {
            openAuthModal();
        } else {
            navigate(item.path);
        }
    };

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
            style={{
                background: 'var(--nav-bg, rgba(255, 255, 255, 0.95))',
                borderTop: '1px solid var(--nav-border, rgba(0, 0, 0, 0.06))',
                boxShadow: '0 -2px 10px var(--nav-shadow, rgba(0,0,0,0.03))',
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            }}
        >
            {/* CSS Variables: Softened shadows & professional high-contrast styling */}
            <style>{`
                :root {
                    --nav-bg: rgba(255, 255, 255, 0.95);
                    --nav-border: rgba(0, 0, 0, 0.06);
                    --nav-shadow: rgba(0, 0, 0, 0.04);
                    --nav-text-active: #0F172A;
                    --nav-text-inactive: #64748B;
                    --nav-indicator-bg: rgba(15, 23, 42, 0.05);
                    --nav-center-gradient-from: #4F46E5;
                    --nav-center-gradient-to: #3730A3;
                    --nav-center-active-from: #0F172A;
                    --nav-center-active-to: #1E293B;
                    --nav-center-shadow: rgba(79, 70, 229, 0.15);
                    --nav-center-active-shadow: rgba(15, 23, 42, 0.18);
                    --nav-dot-color: #0F172A;
                }
                .dark {
                    --nav-bg: rgba(18, 18, 20, 0.94);
                    --nav-border: rgba(255, 255, 255, 0.06);
                    --nav-shadow: rgba(0, 0, 0, 0.25);
                    --nav-text-active: #C9A84C;
                    --nav-text-inactive: #9CA3AF;
                    --nav-indicator-bg: rgba(201, 168, 76, 0.1);
                    --nav-center-gradient-from: #7C6BD4;
                    --nav-center-gradient-to: #5B4CB0;
                    --nav-center-active-from: #C9A84C;
                    --nav-center-active-to: #A68A3A;
                    --nav-center-shadow: rgba(124, 107, 212, 0.2);
                    --nav-center-active-shadow: rgba(201, 168, 76, 0.25);
                    --nav-dot-color: #C9A84C;
                }
            `}</style>
            <div
                className="grid h-16 items-end px-1"
                style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
            >
                {navItems.map((item) => {
                    // Active check logic
                    const isRoot = item.path === ROUTES.USER_DASHBOARD ||
                        item.path === ROUTES.ARTIST_DASHBOARD ||
                        item.path === ROUTES.ADMIN_DASHBOARD ||
                        item.path === ROUTES.HOME;

                    let isActive = isRoot
                        ? currentPath === item.path
                        : currentPath.startsWith(item.path);

                    // Keep Home active on Gallery
                    if (item.label === 'Home' && currentPath === ROUTES.GALLERY) {
                        isActive = true;
                    }

                    const Icon = item.icon;
                    const isProfile = item.label === 'Profile' && isAuthenticated;

                    // ---- CENTER BUTTON (elevated) ----
                    if (item.isCenter) {
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item)}
                                className="relative flex flex-col items-center justify-end h-full w-full touch-manipulation"
                            >
                                {/* Elevated circle */}
                                <motion.div
                                    className="relative -mt-3.5 mb-0.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
                                    style={{
                                        background: isActive
                                            ? `linear-gradient(135deg, var(--nav-center-active-from), var(--nav-center-active-to))`
                                            : `linear-gradient(135deg, var(--nav-center-gradient-from), var(--nav-center-gradient-to))`,
                                        boxShadow: isActive
                                            ? `0 3px 10px var(--nav-center-active-shadow)`
                                            : `0 2px 8px var(--nav-center-shadow)`,
                                    }}
                                    whileTap={{ scale: 0.92 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                    {/* Soft pulse ring */}
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                boxShadow: '0 0 10px var(--nav-center-active-shadow)',
                                            }}
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                        />
                                    )}
                                </motion.div>
                                <span
                                    className="text-[10px] font-semibold mb-1.5 transition-colors duration-300"
                                    style={{
                                        color: isActive
                                            ? 'var(--nav-text-active)'
                                            : 'var(--nav-center-gradient-from)',
                                    }}
                                >
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    // ---- STANDARD BUTTON ----
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item)}
                            className="relative flex flex-col items-center justify-center gap-0.5 h-full w-full touch-manipulation active:scale-95 transition-transform duration-200"
                        >
                            <div className="relative p-1.5 rounded-xl transition-colors duration-300">
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute inset-0 rounded-xl"
                                        style={{ backgroundColor: 'var(--nav-indicator-bg)' }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {isProfile ? (
                                    <div className={`relative transition-all duration-300 ${isActive ? 'ring-2 rounded-full p-0.5' : ''}`}
                                        style={isActive ? { '--tw-ring-color': 'var(--nav-text-active)' } as React.CSSProperties : undefined}
                                    >
                                        <Avatar
                                            src={user?.avatar}
                                            name={user?.displayName || 'User'}
                                            size="xs"
                                            className={isActive ? 'opacity-100' : 'opacity-60'}
                                        />
                                    </div>
                                ) : (
                                    <Icon
                                        className="w-5 h-5 transition-all duration-300"
                                        style={{
                                            color: isActive ? 'var(--nav-text-active)' : 'var(--nav-text-inactive)',
                                            strokeWidth: isActive ? 2.3 : 1.8,
                                            opacity: isActive ? 1 : 0.7,
                                        }}
                                    />
                                )}
                            </div>
                            <span
                                className="text-[10px] font-semibold transition-all duration-300 mb-1"
                                style={{
                                    color: isActive ? 'var(--nav-text-active)' : 'var(--nav-text-inactive)',
                                    opacity: isActive ? 1 : 0.7,
                                }}
                            >
                                {item.label}
                            </span>

                            {/* Active Indicator Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-dot"
                                    className="absolute top-0.5 w-1 h-1 rounded-full"
                                    style={{
                                        backgroundColor: 'var(--nav-dot-color)',
                                    }}
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
