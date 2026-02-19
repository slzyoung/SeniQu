/**
 * Dashboard Header Component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
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
    Wallet,
    ChevronLeft,
    Copy,
    CheckCircle,
} from 'lucide-react';

import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';
import { useNotifications } from '../../hooks/useNotifications';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

type MenuView = 'main' | 'chain-select' | 'qr';
type ChainType = 'solana' | 'ethereum';

export function Header({ title, subtitle, actions, className = '' }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { setSearchOpen, setMobileMenuOpen, mobileMenuOpen } = useUIStore();
    const { user, isAuthenticated, logout } = useAuthStore();
    const { toggleTheme, isDark } = useTheme();

    // Dropdown State
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [menuView, setMenuView] = React.useState<MenuView>('main');
    const [selectedChain, setSelectedChain] = React.useState<ChainType>('solana');
    const [copied, setCopied] = React.useState(false);

    const [showNotifications, setShowNotifications] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    // Close menus on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
                setMenuView('main');
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMobileMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMobileMenuOpen(true);
    };

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
                    onClick={handleMobileMenuClick}
                    className={`md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 -ml-2 rounded-full bg-theme-elevated text-theme-muted hover:text-theme-text active:scale-95 transition-all touch-manipulation select-none ${mobileMenuOpen ? 'opacity-0 pointer-events-none' : ''}`}
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
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`
                                        fixed inset-x-4 top-[70px] z-50 
                                        md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-80 
                                        bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden
                                    `}
                                >
                                    <div className="p-4 border-b border-theme-border flex justify-between items-center">
                                        <h3 className="font-semibold text-theme-text">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => markAllAsRead()}
                                                className="text-xs text-gold hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[60vh] md:max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-theme-muted text-sm">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => !n.isRead && markAsRead(n.id)}
                                                    className={`
                                                        p-4 border-b border-theme-border last:border-b-0 
                                                        hover:bg-theme-elevated transition-colors cursor-pointer
                                                        ${!n.isRead ? 'bg-theme-elevated/50 border-l-2 border-l-gold' : ''}
                                                    `}
                                                >
                                                    <p className={`text-sm ${!n.isRead ? 'text-theme-text font-medium' : 'text-theme-muted'}`}>
                                                        {n.title}
                                                    </p>
                                                    {n.message && (
                                                        <p className="text-xs text-theme-muted mt-1 line-clamp-2">{n.message}</p>
                                                    )}
                                                    <p className="text-[10px] text-theme-subtle mt-2">
                                                        {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            ))
                                        )}
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
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute right-0 mt-2 w-72 md:w-80 max-w-[calc(100vw-2rem)] bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 z-50 origin-top-right"
                                >
                                    {/* VIEW: MAIN MENU */}
                                    {menuView === 'main' && (
                                        <>
                                            <div className="p-4 border-b border-theme-border mb-1">
                                                <p className="font-semibold text-theme-text truncate text-sm">
                                                    {user?.displayName || user?.username}
                                                </p>
                                                <p className="text-xs text-theme-muted truncate">{user?.email}</p>
                                            </div>

                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={() => setMenuView('chain-select')}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-theme-text hover:bg-theme-elevated rounded-xl transition-all group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-gold/10 text-gold group-hover:bg-gold/20 transition-colors">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    Deposit Funds
                                                </button>

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
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-theme-text hover:bg-theme-elevated rounded-xl transition-all"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-theme-border/50 text-theme-muted">
                                                        <Settings className="w-4 h-4" />
                                                    </div>
                                                    Settings
                                                </button>
                                            </div>

                                            <div className="p-2 border-t border-theme-border mt-1">
                                                <button
                                                    onClick={logout}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-red-500/10">
                                                        <LogOut className="w-4 h-4" />
                                                    </div>
                                                    Sign out
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* VIEW: CHAIN SELECT */}
                                    {menuView === 'chain-select' && (
                                        <>
                                            <div className="flex items-center gap-2 p-3 border-b border-theme-border">
                                                <button
                                                    onClick={() => setMenuView('main')}
                                                    className="p-1 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-sm font-semibold text-theme-text">Deposit Crypto</span>
                                            </div>
                                            <div className="p-2 space-y-2">
                                                {[
                                                    { id: 'solana', label: 'Solana', icon: '/images/crypto/solana.svg' },
                                                    { id: 'ethereum', label: 'Ethereum', icon: '/images/crypto/ethereum.svg' }
                                                ].map((chain) => (
                                                    <button
                                                        key={chain.id}
                                                        onClick={() => {
                                                            setSelectedChain(chain.id as ChainType);
                                                            setMenuView('qr');
                                                        }}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-theme-elevated border border-transparent hover:border-theme-border transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center p-1.5 border border-theme-border">
                                                                <img src={chain.icon} alt={chain.label} className="w-full h-full object-contain" />
                                                            </div>
                                                            <span className="text-sm font-medium text-theme-text">{chain.label}</span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-theme-muted group-hover:translate-x-0.5 transition-transform" />
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* VIEW: QR CODE */}
                                    {menuView === 'qr' && (
                                        <>
                                            <div className="flex items-center gap-2 p-3 border-b border-theme-border">
                                                <button
                                                    onClick={() => setMenuView('chain-select')}
                                                    className="p-1 rounded-lg hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-sm font-semibold text-theme-text">
                                                    Deposit {selectedChain === 'solana' ? 'SOL' : 'ETH'}
                                                </span>
                                            </div>

                                            <div className="p-6 flex flex-col items-center">
                                                {(() => {
                                                    // Resolve Address Logic
                                                    let displayAddress: string | undefined;
                                                    // 1. Backend check
                                                    if (user && (user as any).wallets && Array.isArray((user as any).wallets)) {
                                                        const exactMatch = (user as any).wallets.find((w: any) => {
                                                            const wChain = (w.chainType || w.chain_type || '').toLowerCase();
                                                            return wChain === selectedChain.toLowerCase();
                                                        });
                                                        if (exactMatch) displayAddress = exactMatch.address || (exactMatch as any).wallet_address;
                                                    }
                                                    // 2. Generic fallback
                                                    if (!displayAddress && (user as any).wallet_address) {
                                                        // Only use generic if we really have to, but usually wallet_address is Solana main
                                                        displayAddress = (user as any).wallet_address;
                                                    }

                                                    if (!displayAddress) {
                                                        return (
                                                            <div className="text-center py-6 text-theme-muted text-sm">
                                                                No wallet found.<br />Please connect wallet in Settings.
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <>
                                                            <div className="p-3 bg-white rounded-xl mb-4 border-2 border-theme-border shadow-sm">
                                                                <QRCode
                                                                    value={displayAddress}
                                                                    size={140}
                                                                    level="M"
                                                                    viewBox={`0 0 256 256`}
                                                                />
                                                            </div>

                                                            <div className="w-full text-center space-y-3">
                                                                <p className="text-xs text-theme-muted uppercase tracking-wider font-medium">
                                                                    Your Address
                                                                </p>
                                                                <code className="block w-full p-2 bg-theme-elevated rounded-lg text-xs font-mono text-theme-text break-all border border-theme-border/50">
                                                                    {displayAddress}
                                                                </code>

                                                                <button
                                                                    onClick={() => {
                                                                        if (displayAddress) {
                                                                            navigator.clipboard.writeText(displayAddress);
                                                                            setCopied(true);
                                                                            setTimeout(() => setCopied(false), 2000);
                                                                        }
                                                                    }}
                                                                    className={`
                                                                        w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
                                                                        ${copied
                                                                            ? 'bg-green-500/10 text-green-500'
                                                                            : 'bg-gold text-black hover:bg-gold/90 shadow-lg shadow-gold/20'
                                                                        }
                                                                    `}
                                                                >
                                                                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                    {copied ? 'Copied!' : 'Copy Address'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    )}
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
