/**
 * Desktop Sidebar Component
 *
 * This is the DESKTOP-ONLY sidebar. For mobile, see MobileSidebar.tsx.
 * Keeping them separate prevents stale-closure and AnimatePresence bugs.
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

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
}

export function Sidebar({
    sections,
    logo,
    footer,
    className = '',
}: SidebarProps) {
    const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
    const location = useLocation();
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

    const toggleExpand = (id: string) => {
        setExpandedItems((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const isActive = (path: string) => location.pathname === path;
    const isParentActive = (item: SidebarItem) =>
        item.children?.some((child) => location.pathname === child.path);

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarCollapsed ? 80 : 280 }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
            className={`
                fixed left-0 top-0 h-screen z-40 border-r border-theme-border
                bg-theme-surface flex flex-col
                ${className}
            `}
        >
            {/* Logo / Collapse Toggle */}
            <div className="flex items-center justify-between p-4 h-16 border-b border-theme-border">
                {!sidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {logo || (
                            <div 
                                className="flex items-center gap-1.5 group cursor-pointer"
                                onClick={() => window.location.href = '/'}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gold blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse rounded-full" />
                                    <img
                                        src="/images/logo/seniqu.png"
                                        alt="SeniQu Logo"
                                        className="w-10 h-10 object-contain relative z-10 logo-hologram transform transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                                <span className="font-serif text-2xl font-bold italic tracking-wide text-gold-hologram -ml-1">
                                    SeniQu
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}

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
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                        {section.title && !sidebarCollapsed && (
                            <h3 className="px-3 mb-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                                {section.title}
                            </h3>
                        )}

                        <ul className="space-y-1">
                            {section.items.map((item) => (
                                <li key={item.id}>
                                    {item.children ? (
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
                                                                    className={`
                                                                        block px-3 py-2 rounded-lg text-sm transition-colors
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
                                        <NavLink
                                            to={item.path}
                                            className={({ isActive }) => `
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl
                                                transition-all duration-200 group relative
                                                ${isActive
                                                    ? 'bg-gold/10 text-gold shadow-lg shadow-gold/5'
                                                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-elevated'
                                                }
                                            `}
                                        >
                                            {item.icon}

                                            {!sidebarCollapsed && (
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
                <div className="border-t border-theme-border p-3">
                    {footer}
                </div>
            )}
        </motion.aside>
    );
}

export default Sidebar;
