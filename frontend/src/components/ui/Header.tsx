/**
 * Dashboard Header Component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search,
    Bell,
    Settings,
    LogOut,
    Sun,
    Moon,
    ChevronDown,
    LogIn,
    Menu,
    ChevronRight,
} from 'lucide-react';

import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function Header({ title, subtitle, actions, className = '' }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { setSearchOpen, toggleMobileMenu } = useUIStore();
    const { user, isAuthenticated, logout } = useAuthStore();
    const { toggleTheme, isDark } = useTheme();
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menus on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header
            className={`
        sticky top-0 z-30
        h-16 px-6
        bg-theme-surface/80 backdrop-blur-xl
        border-b border-theme-border
        flex items-center justify-between gap-4
        ${className}
      `}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={toggleMobileMenu}
                    className="md:hidden p-2 -ml-2 rounded-full bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors touch-manipulation"
                    aria-label="Open sidebar"
                    type="button"
                >
                    {isAuthenticated ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </button>



                {title && (
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-theme-text truncate">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-theme-muted truncate">{subtitle}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Center - Search */}
            <div className="hidden md:flex flex-1 max-w-md">
                <button
                    onClick={() => setSearchOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-theme-elevated border border-theme-border rounded-xl text-theme-muted hover:border-theme-subtle transition-colors"
                >
                    <Search className="w-4 h-4" />
                    <span className="text-sm">Search artworks, museums...</span>
                    <kbd className="ml-auto hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-theme-surface border border-theme-border rounded">
                        <span>⌘</span>K
                    </kbd>
                </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2" ref={menuRef}>
                {/* Custom Actions */}
                {actions}

                {/* Mobile Search */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className="md:hidden p-2.5 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
                >
                    <Search className="w-5 h-5" />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
                >
                    {isDark ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </button>

                {isAuthenticated ? (
                    <>
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2.5 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                            </button>

                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 mt-2 w-80 bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden"
                                >
                                    <div className="p-4 border-b border-theme-border">
                                        <h3 className="font-semibold text-theme-text">Notifications</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="p-4 border-b border-theme-border last:border-b-0 hover:bg-theme-elevated transition-colors cursor-pointer"
                                            >
                                                <p className="text-sm text-theme-text">New artwork added to your collection</p>
                                                <p className="text-xs text-theme-muted mt-1">2 hours ago</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-theme-border">
                                        <button className="w-full text-center text-sm text-gold hover:underline">
                                            View all notifications
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-theme-elevated transition-colors"
                            >
                                <Avatar
                                    src={user?.avatar}
                                    name={user?.displayName || user?.username || 'User'}
                                    size="sm"
                                />
                                <ChevronDown className={`w-4 h-4 text-theme-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 mt-2 w-56 bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden"
                                >
                                    <div className="p-4 border-b border-theme-border">
                                        <p className="font-medium text-theme-text truncate">
                                            {user?.displayName || user?.username}
                                        </p>
                                        <p className="text-sm text-theme-muted truncate">{user?.email}</p>
                                    </div>

                                    <div className="py-2">
                                        <button
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                const role = user?.role;
                                                if (role === 'admin' || role === 'super_admin') {
                                                    navigate('/admin/settings');
                                                } else if (role === 'artist' || role === 'institution') {
                                                    navigate('/artist/settings');
                                                } else {
                                                    navigate('/dashboard/settings');
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </button>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-theme-elevated transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-theme-text hover:text-gold transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate(location.pathname === '/login' ? '/register' : '/login')} // Simple toggle or direct link
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-charcoal text-sm font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                        >
                            <LogIn className="w-4 h-4" />
                            <span>{'Connect'}</span>
                        </button>
                    </div>
                )}
            </div>
        </header >
    );
}

export default Header;
