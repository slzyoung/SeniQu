/**
 * Admin Features Index
 * Exports all admin pages with real implementations
 */

export { default as AdminLayout } from './AdminLayout';
export { default as AdminDashboard } from './pages/AdminDashboard';
export { default as InstitutionManagement } from './pages/InstitutionManagement';
export { default as AdminManagement } from './pages/AdminManagement';
export { default as SystemLogs } from './pages/SystemLogs';
export { default as SystemAlerts } from './pages/SystemAlerts';

// Pages still using placeholders (will be implemented)
export {
    SystemAnalytics,
    DatabaseManagement,
    SecurityCenter,
    ArtsOversight,
    PremiumManagement,
    GlobalSettings,
    SystemHealth,
    ReportsIssues,
    PartnershipManagement,
    AdminProfile,
} from './pages/placeholders';
