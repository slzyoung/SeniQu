/**
 * Dashboard Layout Component - Shared layout for all dashboards
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar, SidebarSection, Header } from '../ui';
import { MobileBottomNav } from './MobileBottomNav';
import { useUIStore } from '../../stores/useUIStore';
import { ErrorBoundary } from './ErrorBoundary';

interface DashboardLayoutProps {
    sections: SidebarSection[];
    title?: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
    footer?: React.ReactNode;
}

export function DashboardLayout({
    sections,
    title,
    subtitle,
    headerActions,
    footer,
}: DashboardLayoutProps) {
    const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setMobileMenuOpen]);

    return (
        <div className="min-h-screen bg-theme-bg">
            {/* Sidebar - Desktop */}
            <div className="hidden md:block">
                <Sidebar sections={sections} footer={footer} />
            </div>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-theme-surface shadow-2xl md:hidden"
                        >
                            <Sidebar
                                sections={sections}
                                footer={footer}
                                variant="mobile"
                                onClose={() => setMobileMenuOpen(false)}
                            />


                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Bottom Navigation - Configurable: can comment out if not desired, but kept per user "besides" */}
            <MobileBottomNav />

            {/* Main Content */}
            <motion.div
                initial={false}
                animate={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280) }}
                transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                className="flex flex-col min-h-screen"
            >
                {/* Header */}
                <Header
                    title={title}
                    subtitle={subtitle}
                    actions={headerActions}
                />

                {/* Page Content - Add bottom padding for mobile nav */}
                <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </motion.div>
        </div>
    );
}

// Page wrapper with consistent padding and animations
interface PageContainerProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function PageContainer({
    children,
    title,
    subtitle,
    actions,
    className = '',
}: PageContainerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        {title && (
                            <h1 className="text-2xl font-bold text-theme-text">{title}</h1>
                        )}
                        {subtitle && (
                            <p className="text-theme-muted mt-1">{subtitle}</p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </div>
            )}
            {children}
        </motion.div>
    );
}

// Grid layout for stats/cards
interface StatsGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
    const colsClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`grid gap-4 ${colsClass[columns]}`}>
            {children}
        </div>
    );
}

export default DashboardLayout;
