/**
 * MobileSidebar — Bulletproof mobile sidebar using an ALWAYS-MOUNTED DOM pattern.
 *
 * WHY THIS APPROACH:
 * AnimatePresence conditionally mounts/unmounts the sidebar. When a route change
 * triggers the exit animation, the component's React tree is in "exit" phase.
 * If the user reopens the sidebar before the exit completes, AnimatePresence
 * can reuse the exiting tree with stale event-handler closures — the close
 * button then calls a dead reference.
 *
 * The fix: NEVER unmount the sidebar. Instead:
 *  - Always render both backdrop + drawer in the DOM
 *  - Control visibility with CSS transforms, opacity, and pointer-events
 *  - The close handler is ALWAYS the same stable ref — never goes stale
 *
 * Additional best practices:
 *  - useRef for close function to guarantee freshness
 *  - Escape key support
 *  - Body scroll lock
 *  - Auto-close on route change
 *  - Theme-aware colors for light/dark mode
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import type { SidebarSection, SidebarItem } from './Sidebar';

/**
 * Paths already shown in MobileBottomNav.
 * We hide these from the mobile sidebar to avoid duplication.
 */
const MOBILE_HIDDEN_IDS = new Set([
    'wallet',       // Already in bottom nav
    'nearby',       // Already in bottom nav as "Explore"
    'genre-identifier', // Already in bottom nav as "Analyze"
    'profile',      // Already in bottom nav
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

    // Filter out items already in MobileBottomNav
    const filteredItems = sections
        .flatMap(s => s.items)
        .filter(item => !MOBILE_HIDDEN_IDS.has(item.id));

    // ─── Stable close ref — NEVER stale ───
    const closeRef = useRef(() => setMobileMenuOpen(false));
    closeRef.current = () => setMobileMenuOpen(false);

    const close = useCallback(() => {
        closeRef.current();
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
            // Prevent bounce scroll on iOS body
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

    /*
     * ALWAYS RENDERED — no AnimatePresence, no conditional mount.
     * Visibility is controlled entirely by CSS classes.
     */
    return (
        <div className="md:hidden">
            {/* ──── Backdrop ──── */}
            <div
                onClick={close}
                aria-hidden={!mobileMenuOpen}
                className={`
                    fixed inset-0 z-[60]
                    bg-theme-overlay backdrop-blur-sm
                    transition-all duration-300 ease-out
                    ${mobileMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                    }
                `}
                // Prevent touch scroll on backdrop
                style={{ touchAction: 'none' }}
            />

            {/* ──── Drawer ──── */}
            <aside
                aria-hidden={!mobileMenuOpen}
                className={`
                    fixed inset-y-0 left-0 z-[65] w-[88px]
                    bg-theme-surface/95 backdrop-blur-2xl
                    shadow-2xl
                    flex flex-col items-center
                    border-r border-theme-border/50
                    transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    will-change-transform
                    ${mobileMenuOpen
                        ? 'translate-x-0'
                        : '-translate-x-full'
                    }
                `}
                style={{ boxShadow: 'var(--shadow-color) 0px 25px 50px -12px' }}
            >
                {/* ── Close Button (ChevronLeft arrow) ── */}
                <div className="flex flex-col items-center justify-center pt-6 pb-4 w-full shrink-0">
                    <button
                        onClick={close}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            close();
                        }}
                        type="button"
                        className="
                            flex items-center justify-center w-12 h-12 rounded-2xl
                            bg-theme-elevated border border-theme-border
                            text-theme-muted hover:text-theme-text
                            active:scale-95 active:bg-theme-elevated
                            transition-all duration-200
                            touch-manipulation select-none
                            shadow-sm
                        "
                        aria-label="Close sidebar"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <ChevronLeft className="w-6 h-6 pointer-events-none" />
                    </button>

                    {/* Brand Mark with Solana */}
                    <div className="mt-6 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => window.location.href = '/'}>
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
                                e.stopPropagation(); window.open('https://solana.com', '_blank');
                            }}
                        >
                            <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_50%,#9945FF_70%,#14F195_100%)] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10 flex h-full w-full items-center justify-center rounded-[3px] bg-theme-surface overflow-hidden px-1 py-0.5">
                                <img src="/images/logo/poweredbysol.svg" alt="Powered by Solana" className="h-3.5 rounded-[3px]" />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ── Separator ── */}
                <div className="w-10 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent mb-2 shrink-0" />

                {/* ── Nav Items ── */}
                <nav
                    className="
                        flex-1 w-full flex flex-col items-center gap-10
                        px-3 py-10
                        overflow-y-auto overflow-x-hidden
                        overscroll-contain
                        scrollbar-none
                        pb-[env(safe-area-inset-bottom)]
                    "
                    // Better scroll physics for iOS
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {filteredItems.map((item) => (
                        <MobileNavItem
                            key={item.id}
                            item={item}
                            onNavigate={close}
                        />
                    ))}

                    {/* Extra padding at bottom to ensure content isn't cut off */}
                    <div className="h-4 shrink-0" />
                </nav>

                {/* ── FooterContainer (Fixed at bottom if needed, or adjust as part of scroll) ── */}
                {/* 
                    Note: If you want the footer to be fixed at the bottom, keep it outside nav.
                    If you want it to scroll with content, move it inside nav.
                    Here we keep it fixed but with a blur background if content scrolls under.
                */}
                {footer && (
                    <div className="
                        w-full flex justify-center shrink-0 
                        p-4 pb-8 
                        bg-gradient-to-t from-white via-white/90 to-transparent dark:from-theme-surface dark:via-theme-surface/90
                        z-10
                    ">
                        {footer}
                    </div>
                )}
            </aside>
        </div>
    );
}

/* ──────────────────────────── Individual Nav Item ────────────────────────── */

function MobileNavItem({
    item,
    onNavigate,
}: {
    item: SidebarItem;
    onNavigate: () => void;
}) {
    return (
        <NavLink
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
                `relative flex items-center justify-center w-14 h-14 rounded-[20px]
                 transition-all duration-300 ease-out
                 group
                 ${isActive
                    ? 'bg-gold/15 dark:bg-gold/10 text-gold shadow-[0_0_20px_-5px_var(--gold)]/30'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated/80 active:scale-95'
                }`
            }
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {({ isActive }) => (
                <>
                    {/* Active indicator pill - improved visibility */}
                    {isActive && (
                        <div className="
                            absolute -left-[2px] top-1/2 -translate-y-1/2 
                            w-[4px] h-8 rounded-full bg-gold 
                            shadow-[0_0_10px_var(--gold)]
                        " />
                    )}

                    <span className={`
                        relative z-10 transition-transform duration-300
                        ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                    `}>
                        {/* Clone icon to increase size slightly if needed */}
                        {React.cloneElement(item.icon as React.ReactElement, {
                            size: 24,
                            strokeWidth: isActive ? 2.5 : 2
                        })}
                    </span>

                    {/* Optional: subtle specific badging if item has badge */}
                    {item.badge && item.badge > 0 && (
                        <span className="
                            absolute top-2 right-2 
                            w-2.5 h-2.5 rounded-full bg-red-500 border border-theme-surface
                        " />
                    )}

                    {/* Tooltip on hover (only for devices with hover support) */}
                    <span className="
                        absolute left-20 top-1/2 -translate-y-1/2 z-50
                        pointer-events-none opacity-0 translate-x-2
                        group-hover:opacity-100 group-hover:translate-x-0
                        transition-all duration-200 ease-out
                        bg-theme-elevated border border-theme-border text-theme-text
                        text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl
                        whitespace-nowrap
                        hidden [@media(hover:hover)]:block
                    ">
                        {item.label}
                    </span>
                </>
            )}
        </NavLink>
    );
}

export default MobileSidebar;
