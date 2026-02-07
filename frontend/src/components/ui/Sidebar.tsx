/**
 * Dashboard Sidebar Component
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

/**
 * CloseButton - A mobile-optimized close button that prevents double-trigger
 * issues when both touch and click events fire on touch devices.
 */
function CloseButton({ onClose }: { onClose?: () => void }) {
    const touchHandledRef = React.useRef(false);

    const handleClose = React.useCallback(() => {
        if (onClose) {
            onClose();
        }
    }, [onClose]);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        // Mark that touch started - we'll handle this in touchEnd
        touchHandledRef.current = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (touchHandledRef.current) {
            handleClose();
            // Reset after a short delay to allow next interaction
            setTimeout(() => {
                touchHandledRef.current = false;
            }, 300);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Only handle click if it wasn't already handled by touch
        if (!touchHandledRef.current) {
            handleClose();
        } else {
            // Reset the flag for click events that come after touch
            touchHandledRef.current = false;
        }
    };

    return (
        <button
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            type="button"
            className="relative z-[999] flex items-center justify-center min-w-[48px] min-h-[48px] p-3 rounded-full bg-theme-elevated text-theme-muted hover:text-theme-text active:scale-90 active:bg-theme-surface transition-all touch-manipulation select-none cursor-pointer"
            aria-label="Close sidebar"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            <ChevronLeft className="w-6 h-6 pointer-events-none" />
        </button>
    );
}

export interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: number;
    children?: Omit<SidebarItem, 'children'>[];
}

export interface SidebarSection {
    title?: string;
    items: SidebarItem[];
}

interface SidebarProps {
    sections: SidebarSection[];
    logo?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    variant?: 'desktop' | 'mobile';
    onClose?: () => void;
}

export function Sidebar({
    sections,
    logo,
    footer,
    className = '',
    variant = 'desktop',
    onClose
}: SidebarProps) {
    const { sidebarCollapsed: storeCollapsed, toggleSidebarCollapse } = useUIStore();
    const location = useLocation();
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

    // Force expanded in mobile mode
    const sidebarCollapsed = variant === 'mobile' ? false : storeCollapsed;

    const toggleExpand = (id: string) => {
        setExpandedItems((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const isActive = (path: string) => location.pathname === path;
    const isParentActive = (item: SidebarItem) =>
        item.children?.some((child) => location.pathname === child.path);

    const handleClose = async (e?: React.MouseEvent | React.PointerEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        // Small delay to ensure event propagation completes and UI is stable
        // This 'async' behavior prevents ghost clicks and ensures reliable closing
        await new Promise(resolve => setTimeout(resolve, 50));

        if (onClose) {
            onClose();
        }
    };

    const handleItemClick = async () => {
        if (variant === 'mobile') {
            // Allow navigation to initiate before closing
            await new Promise(resolve => setTimeout(resolve, 100));
            await handleClose();
        }
    };

    const handleFooterClick = async (e: React.MouseEvent) => {
        // Allow footer interactions (like logout) to close the sidebar on mobile
        if (variant === 'mobile') {
            await handleClose(e);
        }
    };

    const isMobile = variant === 'mobile';

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isMobile ? '100%' : (sidebarCollapsed ? 80 : 280)
            }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
            className={`
        ${variant === 'desktop' ? 'fixed left-0 top-0 h-screen z-40 border-r border-theme-border' : 'h-full w-full'}
        bg-theme-surface
        flex flex-col
        ${isMobile ? 'items-center bg-[#FBF9F5]' : ''}
        ${className}
      `}
        >
            {/* Logo / Header */}
            <div className={`
                flex items-center 
                ${isMobile ? 'justify-center py-6 h-auto min-h-[64px] pointer-events-auto relative z-[1000]' : 'justify-between p-4 h-16 border-b border-theme-border'}
            `}>
                {!sidebarCollapsed && !isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {logo || (
                            <span className="text-xl font-serif font-bold text-gold">Seniqu</span>
                        )}
                    </motion.div>
                )}

                {isMobile && (
                    <CloseButton onClose={onClose} />
                )}

                {variant === 'desktop' && (
                    <button
                        onClick={toggleSidebarCollapse}
                        className="p-2 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="w-5 h-5" />
                        ) : (
                            <ChevronLeft className="w-5 h-5" />
                        )}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto ${isMobile ? 'px-2 py-4 w-full flex flex-col items-center gap-6' : 'py-4 px-3 space-y-6'}`}>
                {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className={isMobile ? 'w-full flex flex-col items-center' : ''}>
                        {section.title && !sidebarCollapsed && !isMobile && (
                            <h3 className="px-3 mb-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                                {section.title}
                            </h3>
                        )}

                        <ul className={`space-y-1 ${isMobile ? 'w-full flex flex-col items-center gap-2' : ''}`}>
                            {section.items.map((item) => (
                                <li key={item.id} className={isMobile ? 'w-full flex justify-center' : ''}>
                                    {item.children && !isMobile ? (
                                        // Parent item with children (Desktop only logic for now, simplify for mobile if needed)
                                        <>
                                            <button
                                                onClick={() => toggleExpand(item.id)}
                                                className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${isParentActive(item)
                                                        ? 'bg-gold/10 text-gold'
                                                        : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated'
                                                    }
                        `}
                                            >
                                                {item.icon}
                                                {!sidebarCollapsed && (
                                                    <>
                                                        <span className="flex-1 text-left text-sm font-medium">
                                                            {item.label}
                                                        </span>
                                                        <ChevronRight
                                                            className={`w-4 h-4 transition-transform ${expandedItems.includes(item.id) ? 'rotate-90' : ''
                                                                }`}
                                                        />
                                                    </>
                                                )}
                                            </button>

                                            <AnimatePresence>
                                                {!sidebarCollapsed && expandedItems.includes(item.id) && (
                                                    <motion.ul
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="pl-9 mt-1 space-y-1 overflow-hidden"
                                                    >
                                                        {item.children.map((child) => (
                                                            <li key={child.id}>
                                                                <NavLink
                                                                    to={child.path}
                                                                    onClick={handleItemClick}
                                                                    className={`
                                    block px-3 py-2 rounded-lg text-sm
                                    transition-colors
                                    ${isActive(child.path)
                                                                            ? 'text-gold bg-gold/5'
                                                                            : 'text-theme-muted hover:text-theme-text'
                                                                        }
                                  `}
                                                                >
                                                                    {child.label}
                                                                </NavLink>
                                                            </li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        // Regular item (and mobile items treated as flat list for now or simplified)
                                        <NavLink
                                            to={item.path}
                                            onClick={handleItemClick}
                                            className={({ isActive }) => `
                                                flex items-center 
                                                transition-all duration-200 group relative
                                                ${isMobile
                                                    ? `justify-center w-12 h-12 rounded-2xl ${isActive ? 'bg-[#EAE0D5] text-gold' : 'text-theme-muted hover:bg-theme-elevated hover:text-theme-text'}`
                                                    : `gap-3 px-3 py-2.5 rounded-xl ${isActive ? 'bg-gold/10 text-gold shadow-lg shadow-gold/5' : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated'}`
                                                }
                                            `}
                                        >
                                            <span className={isMobile ? 'w-6 h-6' : ''}>
                                                {item.icon}
                                            </span>

                                            {!sidebarCollapsed && !isMobile && (
                                                <>
                                                    <span className="flex-1 text-sm font-medium">
                                                        {item.label}
                                                    </span>
                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <span className="px-2 py-0.5 text-xs font-bold bg-gold text-charcoal rounded-full">
                                                            {item.badge > 99 ? '99+' : item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}

                                            {/* Mobile Tooltip/Label fallback could go here if needed, but per request implies just icons */}
                                        </NavLink>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            {footer && (
                <div
                    onClick={handleFooterClick}
                    className={`
                    border-t border-theme-border
                    ${isMobile ? 'p-4 w-full flex justify-center cursor-pointer' : 'p-3'}
                `}>
                    {footer}
                </div>
            )}
        </motion.aside>
    );
}

export default Sidebar;
