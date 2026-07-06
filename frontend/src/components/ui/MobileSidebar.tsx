/**
 * MobileSidebar — Clean expandable drawer sidebar.
 *
 * BEST PRACTICES APPLIED:
 * 1. DEFAULT EXPANDED — When user opens sidebar, labels are immediately visible.
 *    No need to "discover" an expand button. User sees what each menu does instantly.
 * 2. COMPACT HEADER — Logo + close in one row. No wasted vertical space.
 * 3. COLLAPSIBLE — Small toggle at bottom for power users who prefer icon-only.
 * 4. SECTION GROUPS — Visual hierarchy with subtle section labels.
 * 5. TOUCH-OPTIMIZED — 44px+ touch targets, active:scale feedback, smooth springs.
 *
 * TECHNICAL (bulletproof — unchanged):
 * - ALWAYS-MOUNTED DOM pattern (no AnimatePresence stale-closure bugs)
 * - Stable close ref via useRef
 * - Body scroll lock, escape key, auto-close on route change
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import type { SidebarSection, SidebarItem } from './Sidebar';

/**
 * Paths already shown in MobileBottomNav.
 * We hide these from the mobile sidebar to avoid duplication.
 */
const MOBILE_HIDDEN_IDS = new Set([
    'wallet',
    'nearby',
    'genre-identifier',
    'profile',
]);

/* ──────────────────────────────────── Props ──────────────────────────────── */

interface MobileSidebarProps {
    sections: SidebarSection[];
    footer?: React.ReactNode;
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export function MobileSidebar({ sections, footer }: MobileSidebarProps) {
    const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
    const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
    const location = useLocation();

    // Persist expanded/collapsed preference in localStorage
    const [expanded, setExpanded] = useState(() => {
        const saved = localStorage.getItem('seniqu-sidebar-expanded');
        if (saved !== null) return saved === 'true';
        return true; // Default expanded for first-time users
    });

    // Filter out items already in MobileBottomNav
    const filteredSections = sections.map(s => ({
        ...s,
        items: s.items.filter(item => !MOBILE_HIDDEN_IDS.has(item.id))
    })).filter(s => s.items.length > 0);

    // ─── Stable close ref — NEVER stale ───
    const closeRef = useRef(() => setMobileMenuOpen(false));
    closeRef.current = () => setMobileMenuOpen(false);

    const close = useCallback(() => {
        closeRef.current();
        // DON'T reset expanded — respect user's preference
    }, []);

    const toggleExpand = useCallback(() => {
        setExpanded(prev => {
            const next = !prev;
            localStorage.setItem('seniqu-sidebar-expanded', String(next));
            return next;
        });
    }, []);

    // ─── Auto-close on route change ───
    const prevPathRef = useRef(location.pathname);
    useEffect(() => {
        if (location.pathname !== prevPathRef.current) {
            prevPathRef.current = location.pathname;
            closeRef.current();
        }
    }, [location.pathname]);

    // ─── Body scroll lock ───
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehaviorY = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.overscrollBehaviorY = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.overscrollBehaviorY = '';
        };
    }, [mobileMenuOpen]);

    // ─── Escape key ───
    useEffect(() => {
        if (!mobileMenuOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeRef.current();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [mobileMenuOpen]);

    // ─── Close on resize to desktop ───
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) closeRef.current();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const sidebarWidth = expanded ? 260 : 76;

    return (
        <div className="md:hidden">
            {/* ──── Backdrop ──── */}
            <div
                onClick={close}
                aria-hidden={!mobileMenuOpen}
                className={`
                    fixed inset-0 z-[60]
                    bg-black/30 backdrop-blur-[2px]
                    transition-all duration-300 ease-out
                    ${mobileMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                    }
                `}
                style={{ touchAction: 'none' }}
            />

            {/* ──── Drawer ──── */}
            <motion.aside
                aria-hidden={!mobileMenuOpen}
                {...(!mobileMenuOpen ? { inert: '' } : {})}
                animate={{ width: sidebarWidth }}
                transition={{ type: 'spring', bounce: 0.08, duration: 0.35 }}
                className={`
                    fixed inset-y-0 left-0 z-[65]
                    bg-theme-surface
                    shadow-[4px_0_24px_-4px_rgba(0,0,0,0.12)]
                    flex flex-col
                    border-r border-theme-border/40
                    transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    will-change-transform
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* ═══ HEADER ═══ */}
                {expanded ? (
                    /* ── EXPANDED: Horizontal row — Logo + SeniQu + Solana | X ── */
                    <div className="flex items-center h-14 shrink-0 border-b border-theme-border/40 px-4 justify-between">
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => { close(); window.location.href = '/'; }}
                        >
                            <img
                                src="/images/logo/seniqu.png"
                                alt="SeniQu"
                                className="w-8 h-8 object-contain drop-shadow-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2"
                            >
                                <span className="font-serif text-lg font-bold italic tracking-wide text-gold-hologram leading-none">
                                    SeniQu
                                </span>
                                {/* Solana badge inline */}
                                <motion.div
                                    className="relative cursor-pointer overflow-hidden rounded-[3px] p-[1px] group"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        window.open('https://solana.com', '_blank');
                                    }}
                                >
                                    <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_50%,#9945FF_70%,#14F195_100%)] opacity-60" />
                                    <div className="relative z-10 flex items-center rounded-[2px] bg-theme-surface overflow-hidden px-1 py-0.5">
                                        <img src="/images/logo/poweredbysol.svg" alt="Solana" className="h-3" />
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>

                        <button
                            onClick={close}
                            onTouchEnd={(e) => { e.preventDefault(); close(); }}
                            type="button"
                            className="
                                flex items-center justify-center w-8 h-8 rounded-lg
                                text-theme-muted hover:text-theme-text hover:bg-theme-elevated
                                active:scale-90 transition-all duration-150
                                touch-manipulation select-none
                            "
                            aria-label="Close sidebar"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <X className="w-4 h-4 pointer-events-none" />
                        </button>
                    </div>
                ) : (
                    /* ── COMPACT: Vertical stack — Close → Logo → Solana (original look) ── */
                    <div className="flex flex-col items-center pt-5 pb-3 w-full shrink-0 border-b border-theme-border/40">
                        {/* Close button */}
                        <button
                            onClick={close}
                            onTouchEnd={(e) => { e.preventDefault(); close(); }}
                            type="button"
                            className="
                                flex items-center justify-center w-11 h-11 rounded-2xl
                                bg-theme-elevated border border-theme-border
                                text-theme-muted hover:text-theme-text
                                active:scale-95
                                transition-all duration-200
                                touch-manipulation select-none shadow-sm
                            "
                            aria-label="Close sidebar"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <ChevronLeft className="w-5 h-5 pointer-events-none" />
                        </button>

                        {/* Logo + Solana badge */}
                        <div
                            className="mt-4 flex flex-col items-center gap-1.5 cursor-pointer"
                            onClick={() => { close(); window.location.href = '/'; }}
                        >
                            <img src="/images/logo/seniqu.png" alt="SeniQu" className="w-9 h-9 object-contain drop-shadow-md" />
                            <motion.div
                                className="relative cursor-pointer overflow-hidden rounded-[4px] p-[1px] group"
                                initial={{ opacity: 0.85 }}
                                whileHover={{
                                    opacity: 1, y: -2, scale: 1.05,
                                    filter: "drop-shadow(0 4px 12px rgba(20, 241, 149, 0.3))"
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    window.open('https://solana.com', '_blank');
                                }}
                            >
                                <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_50%,#9945FF_70%,#14F195_100%)] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative z-10 flex h-full w-full items-center justify-center rounded-[3px] bg-theme-surface overflow-hidden px-1 py-0.5">
                                    <img src="/images/logo/poweredbysol.svg" alt="Powered by Solana" className="h-3.5 rounded-[3px]" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* ═══ NAV SECTIONS ═══ */}
                <nav
                    className="
                        flex-1 w-full
                        overflow-y-auto overflow-x-hidden
                        overscroll-contain scrollbar-none
                        py-2
                    "
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {filteredSections.map((section, si) => (
                        <div key={si} className={si > 0 ? 'mt-1' : ''}>
                            {/* Section title */}
                            {expanded && section.title && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="px-5 pt-3 pb-1"
                                >
                                    <span className="text-[10px] font-semibold text-theme-muted/50 uppercase tracking-[0.1em]">
                                        {section.title}
                                    </span>
                                </motion.div>
                            )}

                            {/* Collapsed: small dot separator between groups */}
                            {!expanded && si > 0 && (
                                <div className="flex justify-center py-1.5">
                                    <div className="w-1 h-1 rounded-full bg-theme-border" />
                                </div>
                            )}

                            <ul className={`
                                ${expanded ? 'px-2.5 space-y-0.5' : 'flex flex-col items-center gap-1 px-1.5'}
                            `}>
                                {section.items.map((item) => (
                                    <MobileNavItem
                                        key={item.id}
                                        item={item}
                                        expanded={expanded}
                                        onNavigate={close}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div className="h-2 shrink-0" />
                </nav>

                {/* ═══ FOOTER: Expand toggle + user footer ═══ */}
                <div className="shrink-0 border-t border-theme-border/40">
                    {/* Expand/Collapse toggle — subtle, at very bottom */}
                    <button
                        onClick={toggleExpand}
                        onTouchEnd={(e) => { e.preventDefault(); toggleExpand(); }}
                        type="button"
                        className={`
                            flex items-center w-full
                            text-theme-muted/60 hover:text-theme-muted
                            transition-all duration-200
                            touch-manipulation select-none
                            active:bg-theme-elevated/50
                            ${expanded
                                ? 'gap-2 px-5 py-2.5 justify-start'
                                : 'justify-center py-2.5'
                            }
                        `}
                        aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {expanded ? (
                            <>
                                <ChevronsLeft className="w-4 h-4" />
                                <span className="text-[11px] font-medium">Compact view</span>
                            </>
                        ) : (
                            <ChevronsRight className="w-4 h-4" />
                        )}
                    </button>

                    {/* User footer */}
                    {footer && (
                        <div className={`
                            px-3 pb-5 pt-1
                            ${expanded ? '' : 'flex justify-center'}
                        `}>
                            {footer}
                        </div>
                    )}
                </div>
            </motion.aside>
        </div>
    );
}

/* ──────────────────────────── Individual Nav Item ────────────────────────── */

function MobileNavItem({
    item,
    expanded,
    onNavigate,
}: {
    item: SidebarItem;
    expanded: boolean;
    onNavigate: () => void;
}) {
    if (expanded) {
        // ── EXPANDED: icon + label row ──
        return (
            <li>
                <NavLink
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-150 ease-out
                        touch-manipulation relative
                        ${isActive
                            ? 'sidebar-active shadow-sm'
                            : 'text-theme-text/75 hover:bg-theme-elevated/40 active:bg-theme-elevated/60 active:scale-[0.98]'
                        }
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    {({ isActive }) => (
                        <>
                            {/* Active pill */}
                            {isActive && (
                                <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                    style={{ backgroundColor: 'var(--active-indicator)' }}
                                />
                            )}

                            {/* Icon container */}
                            <span
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
                                style={isActive ? {
                                    backgroundColor: 'var(--active-bg)',
                                    color: 'var(--active-text)'
                                } : undefined}
                            >
                                {React.cloneElement(item.icon as React.ReactElement, {
                                    className: 'w-[18px] h-[18px]',
                                    strokeWidth: isActive ? 2.4 : 1.8
                                })}
                            </span>

                            {/* Label */}
                            <span
                                className={`flex-1 text-[13.5px] leading-none truncate ${isActive ? 'font-semibold' : 'font-medium'}`}
                                style={isActive ? { color: 'var(--active-text)' } : undefined}
                            >
                                {item.label}
                            </span>

                            {/* Badge */}
                            {item.badge !== undefined && item.badge > 0 && (
                                <span
                                    className="px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[20px] text-center leading-none text-white animate-pulse"
                                    style={{ backgroundColor: 'var(--active-text)' }}
                                >
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </>
                    )}
                </NavLink>
            </li>
        );
    }

    // ── COLLAPSED: icon only, centered ──
    return (
        <li>
            <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) => `
                    relative flex items-center justify-center w-12 h-12 rounded-2xl
                    transition-all duration-200 ease-out group
                    touch-manipulation
                    ${isActive
                        ? 'sidebar-active shadow-sm'
                        : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated/50 active:scale-95'
                    }
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {({ isActive }) => (
                    <>
                        {/* Active indicator */}
                        {isActive && (
                            <div
                                className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-full"
                                style={{
                                    backgroundColor: 'var(--active-indicator)',
                                    boxShadow: '0 0 6px var(--active-indicator)'
                                }}
                            />
                        )}

                        {/* Icon */}
                        <span
                            className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                            style={isActive ? { color: 'var(--active-text)' } : undefined}
                        >
                            {React.cloneElement(item.icon as React.ReactElement, {
                                className: 'w-[22px] h-[22px]',
                                strokeWidth: isActive ? 2.4 : 1.8
                            })}
                        </span>

                        {/* Badge dot */}
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-theme-surface" />
                        )}

                        {/* Hover tooltip (devices with hover only) */}
                        <span className="
                            absolute left-[60px] top-1/2 -translate-y-1/2 z-50
                            pointer-events-none opacity-0 translate-x-2
                            group-hover:opacity-100 group-hover:translate-x-0
                            transition-all duration-200 ease-out
                            bg-theme-elevated border border-theme-border text-theme-text
                            text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl
                            whitespace-nowrap
                            hidden [@media(hover:hover)]:block
                        ">
                            {item.label}
                        </span>
                    </>
                )}
            </NavLink>
        </li>
    );
}

export default MobileSidebar;

