/**
 * MobileBottomNav Component
 * Role-based bottom navigation with centered "Analyze" (AI Heritage Analyzer) button
 * Inspired by Google Arts & Culture mobile nav
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    Search,
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
    MapPin,
    ScanLine,
    Bookmark,
    Wallet,
    Play,
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
    { path: ROUTES.GALLERY, icon: Grid, label: 'Gallery' },
    { path: ROUTES.AI_GENRE, icon: ScanLine, label: 'Analyze', isCenter: true },
    { path: ROUTES.REELS, icon: Play, label: 'Reels' },
    { path: ROUTES.LOGIN, icon: Search, label: 'Explore' },
];

const userNavItems: NavItem[] = [
    { path: ROUTES.USER_DASHBOARD, icon: Home, label: 'Home' },
    { path: ROUTES.USER_NEARBY, icon: Search, label: 'Explore' },
    { path: ROUTES.USER_GENRE_IDENTIFIER, icon: ScanLine, label: 'Analyze', isCenter: true },
    { path: ROUTES.USER_WALLET, icon: Wallet, label: 'Wallet' },
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-theme-surface/90 backdrop-blur-xl border-t border-theme-border/50 pb-[env(safe-area-inset-bottom)] shadow-lg shadow-theme-bg/20">
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
                                    className={`relative -mt-4 mb-0.5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                                        isActive
                                            ? 'bg-gradient-to-br from-[#C9A84C] to-[#A68A3A] shadow-[0_4px_20px_rgba(201,168,76,0.45)]'
                                            : 'bg-gradient-to-br from-[#7C6BD4] to-[#5B4CB0] shadow-[0_4px_16px_rgba(124,107,212,0.35)]'
                                    }`}
                                    whileTap={{ scale: 0.9 }}
                                    whileHover={{ scale: 1.08 }}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                    {/* Glow ring */}
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                boxShadow: '0 0 18px rgba(201,168,76,0.5)',
                                            }}
                                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </motion.div>
                                <span
                                    className={`text-[10px] font-semibold mb-1.5 transition-colors duration-300 ${
                                        isActive ? 'text-seniqu-gold' : 'text-[#7C6BD4]'
                                    }`}
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
                                        className="absolute inset-0 bg-theme-primary/10 rounded-xl"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {isProfile ? (
                                    <div className={`relative transition-all duration-300 ${isActive ? 'ring-2 ring-seniqu-gold rounded-full p-0.5' : ''}`}>
                                        <Avatar
                                            src={user?.avatar}
                                            name={user?.displayName || 'User'}
                                            size="xs"
                                            className={isActive ? 'opacity-100' : 'opacity-70'}
                                        />
                                    </div>
                                ) : (
                                    <Icon
                                        className={`w-5 h-5 transition-all duration-300 ${isActive
                                            ? 'text-seniqu-gold stroke-[2.5px]'
                                            : 'text-theme-muted stroke-[2px] opacity-70'
                                            }`}
                                    />
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-medium transition-all duration-300 mb-1 ${isActive
                                    ? 'text-seniqu-gold'
                                    : 'text-theme-muted opacity-70'
                                    }`}
                            >
                                {item.label}
                            </span>

                            {/* Active Indicator Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-dot"
                                    className="absolute top-0.5 w-1 h-1 rounded-full bg-seniqu-gold shadow-[0_0_8px_rgba(201,168,76,0.6)]"
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
