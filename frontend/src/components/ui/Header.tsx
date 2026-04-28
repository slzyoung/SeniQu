/**
 * Dashboard Header Component
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    History as HistoryIcon,
} from 'lucide-react';

import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';
import { useNotifications } from '../../hooks/useNotifications';
import axios from 'axios';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

type MenuView = 'main' | 'chain-select' | 'qr' | 'history';
type ChainType = 'solana' | 'ethereum';

interface MarketplaceTransaction {
    id: string;
    artwork_title: string;
    artwork_image?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    tx_hash?: string;
}

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

    // History State
    const [history, setHistory] = React.useState<MarketplaceTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);

    const [showNotifications, setShowNotifications] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const fetchHistory = React.useCallback(async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('auth-token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/me/marketplace-history?limit=5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    // Fetch history when view changes to 'history'
    React.useEffect(() => {
        if (menuView === 'history' && showUserMenu) {
            fetchHistory();
        }
    }, [menuView, showUserMenu, fetchHistory]);

    // Close menus on outside click — use pointerdown + touchstart for reliable mobile support
    React.useEffect(() => {
        const handleClickOutside = (e: PointerEvent | TouchEvent | MouseEvent) => {
            const target = (e as TouchEvent).touches?.[0]
                ? document.elementFromPoint(
                      (e as TouchEvent).touches[0].clientX,
                      (e as TouchEvent).touches[0].clientY
                  )
                : (e.target as Node);
            if (menuRef.current && target && !menuRef.current.contains(target as Node)) {
                setShowUserMenu(false);
                setMenuView('main');
                setShowNotifications(false);
            }
        };
        // pointerdown covers mouse + touch + pen on modern browsers
        document.addEventListener('pointerdown', handleClickOutside as EventListener);
        // touchstart fallback for older mobile browsers that lack Pointer Events
        document.addEventListener('touchstart', handleClickOutside as EventListener, { passive: true });
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside as EventListener);
            document.removeEventListener('touchstart', handleClickOutside as EventListener);
        };
    }, []);

    // Auto-close dropdown on route change (e.g., navigating to Settings)
    React.useEffect(() => {
        setShowUserMenu(false);
        setMenuView('main');
        setShowNotifications(false);
    }, [location.pathname]);

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

                            <AnimatePresence>
                                {showUserMenu && (
                                    <>
                                        {/* Mobile Backdrop — use onPointerDown + onTouchEnd for reliable mobile closing */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setShowUserMenu(false);
                                                setMenuView('main');
                                            }}
                                            onPointerDown={(e: React.PointerEvent) => {
                                                e.stopPropagation();
                                                setShowUserMenu(false);
                                                setMenuView('main');
                                            }}
                                            onTouchEnd={(e: React.TouchEvent) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowUserMenu(false);
                                                setMenuView('main');
                                            }}
                                            className="md:hidden fixed inset-0 bg-neutral-950/60 z-[60] backdrop-blur-md"
                                            style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                                        />

                                        {/* Menu Content */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className={`
                                                z-[70] bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-3xl
                                                border border-black/5 dark:border-white/10 
                                                shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]
                                                overflow-hidden
                                                
                                                fixed right-4 top-[76px] w-[260px]
                                                md:absolute md:top-full md:right-0 md:mt-3 md:w-[280px]
                                                rounded-[24px] ring-1 ring-black/5 dark:ring-white/5
                                            `}
                                        >

                                            {/* VIEW: MAIN MENU */}
                                            {menuView === 'main' && (
                                                <div className="flex flex-col max-h-[80vh] overflow-y-auto">
                                                    <div className="p-5 border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-black/5 to-transparent dark:from-white/[0.02]">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative shrink-0">
                                                                <Avatar
                                                                    src={user?.avatar}
                                                                    name={user?.displayName || user?.username || 'User'}
                                                                    size="md"
                                                                />
                                                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1a1a1a]"></div>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-theme-text truncate text-[16px]">
                                                                    {user?.displayName || user?.username}
                                                                </p>
                                                                <p className="text-[13px] text-theme-muted truncate">{user?.email}</p>
                                                            </div>
                                                        </div>

                                                        {/* Compact Quick Actions Row */}
                                                        <div className="flex items-center gap-1 mt-5">
                                                            <motion.button
                                                                whileTap={{ scale: 0.92 }}
                                                                onClick={() => setMenuView('chain-select')}
                                                                className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-[14px] hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                                            >
                                                                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                                                                    bg-gradient-to-b from-[#FFD700] to-[#F59E0B] 
                                                                    text-white
                                                                    shadow-[0_6px_12px_rgba(245,158,11,0.25),inset_0_3px_4px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    group-hover:-translate-y-1 group-hover:shadow-[0_10px_16px_rgba(245,158,11,0.35),inset_0_3px_4px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    ring-1 ring-yellow-400/50
                                                                ">
                                                                    <Wallet className="w-4 h-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                                                                </div>
                                                                <span className="text-[11px] font-bold text-theme-text opacity-80 group-hover:opacity-100 transition-opacity">Deposit</span>
                                                            </motion.button>

                                                            <motion.button
                                                                whileTap={{ scale: 0.92 }}
                                                                onClick={() => setMenuView('history')}
                                                                className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-[14px] hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                                            >
                                                                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                                                                    bg-gradient-to-b from-[#60A5FA] to-[#3B82F6] 
                                                                    text-white
                                                                    shadow-[0_6px_12px_rgba(59,130,246,0.25),inset_0_3px_4px_rgba(255,255,255,0.5),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    group-hover:-translate-y-1 group-hover:shadow-[0_10px_16px_rgba(59,130,246,0.35),inset_0_3px_4px_rgba(255,255,255,0.5),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    ring-1 ring-blue-400/50
                                                                ">
                                                                    <HistoryIcon className="w-4 h-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                                                                </div>
                                                                <span className="text-[11px] font-bold text-theme-text opacity-80 group-hover:opacity-100 transition-opacity">History</span>
                                                            </motion.button>

                                                            <motion.button
                                                                whileTap={{ scale: 0.92 }}
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
                                                                className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-[14px] hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                                            >
                                                                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                                                                    bg-gradient-to-b from-[#9CA3AF] to-[#6B7280] dark:from-[#4B5563] dark:to-[#374151]
                                                                    text-white
                                                                    shadow-[0_6px_12px_rgba(0,0,0,0.12),inset_0_3px_4px_rgba(255,255,255,0.4),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    group-hover:-translate-y-1 group-hover:shadow-[0_10px_16px_rgba(0,0,0,0.18),inset_0_3px_4px_rgba(255,255,255,0.4),inset_0_-3px_4px_rgba(0,0,0,0.2)]
                                                                    ring-1 ring-gray-400/30
                                                                ">
                                                                    <Settings className="w-4 h-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                                                                </div>
                                                                <span className="text-[11px] font-bold text-theme-text opacity-80 group-hover:opacity-100 transition-opacity">Settings</span>
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* VIEW: CHAIN SELECT */}
                                            {menuView === 'chain-select' && (
                                                <div className="flex flex-col h-full md:h-auto">
                                                    <div className="flex items-center gap-3 p-4 border-b border-theme-border/50">
                                                        <button
                                                            onClick={() => setMenuView('main')}
                                                            className="p-2 -ml-2 rounded-full hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                                        >
                                                            <ChevronLeft className="w-6 h-6 md:w-5 md:h-5" />
                                                        </button>
                                                        <span className="text-lg md:text-base font-bold text-theme-text">Deposit Crypto</span>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        {[
                                                            { id: 'solana', label: 'Solana', icon: '/images/crypto/solana.svg', name: 'SOL' },
                                                            { id: 'ethereum', label: 'Ethereum', icon: '/images/crypto/ethereum.svg', name: 'ETH' }
                                                        ].map((chain) => (
                                                            <button
                                                                key={chain.id}
                                                                onClick={() => {
                                                                    setSelectedChain(chain.id as ChainType);
                                                                    setMenuView('qr');
                                                                }}
                                                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-theme-elevated/30 hover:bg-theme-elevated border border-transparent hover:border-theme-border transition-all group"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-theme-bg flex items-center justify-center p-2 md:p-1.5 border border-theme-border">
                                                                        <img src={chain.icon} alt={chain.label} className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="font-bold text-theme-text">{chain.label}</p>
                                                                        <p className="text-xs text-theme-muted">{chain.name}</p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-5 h-5 text-theme-muted group-hover:translate-x-0.5 transition-transform" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* VIEW: QR CODE */}
                                            {menuView === 'qr' && (
                                                <div className="flex flex-col h-full md:h-auto">
                                                    <div className="flex items-center gap-3 p-4 border-b border-theme-border/50">
                                                        <button
                                                            onClick={() => setMenuView('chain-select')}
                                                            className="p-2 -ml-2 rounded-full hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                                        >
                                                            <ChevronLeft className="w-6 h-6 md:w-5 md:h-5" />
                                                        </button>
                                                        <span className="text-lg md:text-base font-bold text-theme-text">
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
                                                            // 2. Generic fallback - REMOVED to prevent cross-chain confusion
                                                            // We strictly rely on the wallets array to ensure we show the correct chain address.

                                                            if (!displayAddress) {
                                                                return (
                                                                    <div className="text-center py-10 text-theme-muted">
                                                                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                                        <p className="text-base font-medium text-theme-text">No wallet found</p>
                                                                        <p className="text-sm mt-1">Please connect your wallet in Settings</p>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="w-full max-w-sm mx-auto">
                                                                    <div className="p-4 bg-white rounded-2xl mb-6 border-2 border-theme-border shadow-sm mx-auto w-fit">
                                                                        <QRCode
                                                                            value={displayAddress}
                                                                            size={160}
                                                                            level="M"
                                                                            viewBox={`0 0 256 256`}
                                                                        />
                                                                    </div>

                                                                    <div className="w-full space-y-4">
                                                                        <div className="text-center">
                                                                            <p className="text-xs text-theme-muted uppercase tracking-wider font-bold mb-2">
                                                                                Your {selectedChain} Address
                                                                            </p>
                                                                            <code className="block w-full p-4 bg-theme-elevated/50 rounded-xl text-xs md:text-xs font-mono text-theme-text break-all border border-theme-border/50 text-center">
                                                                                {displayAddress}
                                                                            </code>
                                                                        </div>

                                                                        <button
                                                                            onClick={() => {
                                                                                if (displayAddress) {
                                                                                    navigator.clipboard.writeText(displayAddress);
                                                                                    setCopied(true);
                                                                                    setTimeout(() => setCopied(false), 2000);
                                                                                }
                                                                            }}
                                                                            className={`
                                                                                w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base md:text-sm font-bold transition-all
                                                                                ${copied
                                                                                    ? 'bg-green-500/10 text-green-500'
                                                                                    : 'bg-gold text-black hover:bg-gold/90 shadow-lg shadow-gold/20'
                                                                                }
                                                                            `}
                                                                        >
                                                                            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                                                            {copied ? 'Copied to clipboard' : 'Copy Address'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* VIEW: HISTORY */}
                                            {menuView === 'history' && (
                                                <div className="flex flex-col h-full md:h-auto">
                                                    <div className="flex items-center gap-3 p-4 border-b border-theme-border/50">
                                                        <button
                                                            onClick={() => setMenuView('main')}
                                                            className="p-2 -ml-2 rounded-full hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                                        >
                                                            <ChevronLeft className="w-6 h-6 md:w-5 md:h-5" />
                                                        </button>
                                                        <span className="text-lg md:text-base font-bold text-theme-text">Recent History</span>
                                                    </div>
                                                    <div className="p-0 min-h-[200px] relative">
                                                        {loadingHistory ? (
                                                            <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                                                                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
                                                                <span className="text-sm">Loading transactions...</span>
                                                            </div>
                                                        ) : history.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                                                                <HistoryIcon className="w-10 h-10 opacity-10 mb-3" />
                                                                <span className="text-sm">No recent marketplace activity</span>
                                                            </div>
                                                        ) : (
                                                            <div className="divide-y divide-theme-border/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                                {history.map((tx) => (
                                                                    <div key={tx.id} className="p-4 hover:bg-theme-elevated/50 transition-colors flex items-center justify-between gap-4 group">
                                                                        <div className="flex items-center gap-4 overflow-hidden">
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                                                tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                                                                                }`}>
                                                                                {tx.artwork_image ? (
                                                                                    <img src={tx.artwork_image} alt="" className="w-full h-full object-cover rounded-xl" />
                                                                                ) : (
                                                                                    <HistoryIcon className="w-5 h-5" />
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="font-semibold text-theme-text truncate">{tx.artwork_title || 'Untitled Artwork'}</p>
                                                                                <p className="text-xs text-theme-muted truncate">
                                                                                    {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="font-bold text-theme-text">
                                                                                {tx.amount} {tx.currency}
                                                                            </p>
                                                                            <p className={`text-[10px] font-bold uppercase tracking-wide ${tx.status === 'completed' ? 'text-green-500' :
                                                                                tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                                                                                }`}>
                                                                                {tx.status}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {/* View All Actions */}
                                                                <button className="w-full p-3 text-sm text-theme-muted hover:text-gold transition-colors font-medium">
                                                                    View all transactions
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
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
