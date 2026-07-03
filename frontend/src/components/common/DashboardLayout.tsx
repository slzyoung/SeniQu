/**
 * Dashboard Layout Component - Shared layout for all dashboards
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar, Header } from '../ui';
import { MobileSidebar } from '../ui/MobileSidebar';
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

// Re-export for convenience
import type { SidebarSection } from '../ui/Sidebar';

export function DashboardLayout({
    sections,
    title,
    subtitle,
    headerActions,
    footer,
}: DashboardLayoutProps) {
    const { sidebarCollapsed } = useUIStore();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-theme-bg">
            {/* Sidebar - Desktop only */}
            <div className="hidden md:block">
                <Sidebar sections={sections} footer={footer} />
            </div>

            {/* Mobile Sidebar - Completely separate component */}
            <MobileSidebar sections={sections} footer={footer} />

            {/* Mobile Bottom Navigation */}
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
                <main className="relative z-10 flex-1 p-4 sm:p-6 pb-24 md:pb-6">
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
    /** Alias for subtitle — many pages use this prop name */
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function PageContainer({
    children,
    title,
    subtitle,
    description,
    actions,
    className = '',
}: PageContainerProps) {
    // Support both 'subtitle' and 'description' as the same prop
    const displaySubtitle = subtitle || description;
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
                        {displaySubtitle && (
                            <p className="text-theme-muted mt-1">{displaySubtitle}</p>
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
