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
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import type { SidebarSection, SidebarItem } from './Sidebar';

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
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
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
                    bg-black/40 backdrop-blur-sm
                    transition-all duration-300 ease-out
                    ${mobileMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                    }
                `}
            />

            {/* ──── Drawer ──── */}
            <aside
                aria-hidden={!mobileMenuOpen}
                className={`
                    fixed inset-y-0 left-0 z-[65] w-[76px]
                    bg-theme-surface
                    shadow-xl
                    flex flex-col items-center
                    border-r border-theme-border
                    transition-transform duration-300 ease-out
                    ${mobileMenuOpen
                        ? 'translate-x-0'
                        : '-translate-x-full'
                    }
                `}
                style={{ willChange: 'transform' }}
            >
                {/* ── Close Button (ChevronLeft arrow) ── */}
                <div className="flex items-center justify-center pt-4 pb-2 w-full">
                    <button
                        onClick={close}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            close();
                        }}
                        type="button"
                        className="
                            flex items-center justify-center w-10 h-10 rounded-xl
                            bg-theme-elevated border border-theme-border
                            text-theme-muted hover:text-theme-text
                            active:scale-90
                            transition-all duration-150
                            touch-manipulation select-none
                        "
                        aria-label="Close sidebar"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <ChevronLeft className="w-5 h-5 pointer-events-none" />
                    </button>
                </div>

                {/* ── Separator ── */}
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent mb-1" />

                {/* ── Nav Items ── */}
                <nav className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-0.5 px-2 py-2 scrollbar-none">
                    {sections.map((section, si) => (
                        <React.Fragment key={si}>
                            {section.items.map((item) => (
                                <MobileNavItem
                                    key={item.id}
                                    item={item}
                                    onNavigate={close}
                                />
                            ))}
                            {/* Section divider */}
                            {si < sections.length - 1 && (
                                <div className="w-6 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent my-1.5" />
                            )}
                        </React.Fragment>
                    ))}
                </nav>

                {/* ── Separator ── */}
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent mt-1" />

                {/* ── Footer ── */}
                {footer && (
                    <div
                        onClick={close}
                        className="p-3 w-full flex justify-center"
                    >
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
                `relative flex items-center justify-center w-12 h-12 rounded-2xl
                 transition-all duration-200
                 ${isActive
                    ? 'bg-gold/15 text-gold'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated active:scale-90'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active indicator pill */}
                    {isActive && (
                        <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gold" />
                    )}

                    <span className="w-5 h-5 relative z-10">
                        {item.icon}
                    </span>
                </>
            )}
        </NavLink>
    );
}

export default MobileSidebar;
