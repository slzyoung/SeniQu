/**
 * Admin Hooks - Enterprise Grade
 * Comprehensive React Query hooks for admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, DashboardStats, Partnership } from '../services/adminService';
import { useToast } from '../stores/useNotificationStore';

// ============================================
// QUERY KEYS
// ============================================

export const adminKeys = {
    all: ['admin'] as const,
    dashboard: () => [...adminKeys.all, 'dashboard'] as const,
    domainDashboard: () => [...adminKeys.all, 'domainDashboard'] as const,
    stats: (period: string) => [...adminKeys.all, 'stats', period] as const,
    users: (page: number, limit: number, filters?: object) => [...adminKeys.all, 'users', page, limit, filters] as const,
    institutions: (page: number, limit: number, filters?: object) => [...adminKeys.all, 'institutions', page, limit, filters] as const,
    pendingInstitutions: () => [...adminKeys.all, 'institutions', 'pending'] as const,
    logs: (page: number, limit: number, filters?: object) => [...adminKeys.all, 'logs', page, limit, filters] as const,
    auditLogs: (page: number, limit: number, filters?: object) => [...adminKeys.all, 'audit-logs', page, limit, filters] as const,
    alerts: (activeOnly: boolean) => [...adminKeys.all, 'alerts', activeOnly] as const,
    reports: (page: number, limit: number, status?: string) => [...adminKeys.all, 'reports', page, limit, status] as const,
    partnerships: (page: number, limit: number) => [...adminKeys.all, 'partnerships', page, limit] as const,
    health: () => [...adminKeys.all, 'health'] as const,
    database: () => [...adminKeys.all, 'database'] as const,
};

// ============================================
// DASHBOARD STATS
// ============================================

export function useDashboardStats() {
    return useQuery({
        queryKey: adminKeys.dashboard(),
        queryFn: () => adminService.getDashboardStats(),
        staleTime: 1000 * 60 * 2, // 2 min
        placeholderData: {
            totalUsers: 0,
            totalArtworks: 0,
            totalInstitutions: 0,
            totalArts: 0,
            totalRevenue: 0,
            activeUsers: 0,
            newUsersToday: 0,
            pendingVerifications: 0,
        } as DashboardStats,
    });
}

export function useDomainDashboardStats() {
    return useQuery({
        queryKey: adminKeys.domainDashboard(),
        queryFn: async () => {
            const { data } = await adminService.api.get('/admin/domain-dashboard');
            return data;
        },
        staleTime: 1000 * 60 * 2, // 2 min
    });
}

export function useSystemStats(period = '30d') {
    return useQuery({
        queryKey: adminKeys.stats(period),
        queryFn: () => adminService.getSystemStats(period),
        staleTime: 1000 * 60 * 5, // 5 min
    });
}

// ============================================
// USER MANAGEMENT
// ============================================

export function useUsers(page = 1, limit = 20, filters?: { role?: string; status?: string }) {
    return useQuery({
        queryKey: adminKeys.users(page, limit, filters),
        queryFn: () => adminService.getUsers(page, limit, filters),
        placeholderData: (previousData) => previousData,
    });
}

export function useSuspendUser() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
            adminService.suspendUser(userId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            toast.success('User Suspended', 'The user has been suspended successfully.');
        },
        onError: () => {
            toast.error('Action Failed', 'Could not suspend the user.');
        },
    });
}

export function useCreateAdminUser() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: { email: string; username: string; displayName: string; role: string; adminRoleTyped?: string; scopeId?: string; institutionName?: string; city?: string; category?: string; }) =>
            adminService.api.post('/admin/users', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            toast.success('Admin Created', 'New admin account has been created successfully.');
        },
        onError: (error: any) => {
            toast.error('Creation Failed', error?.response?.data?.message || 'Could not create admin user.');
        },
    });
}

export function useActivateUser() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (userId: string) => adminService.activateUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            toast.success('User Activated', 'The user has been activated successfully.');
        },
        onError: () => {
            toast.error('Action Failed', 'Could not activate the user.');
        },
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) => adminService.updateUserRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            toast.success('Role Updated', 'User role has been updated successfully.');
        },
        onError: () => {
            toast.error('Action Failed', 'Could not update the user role.');
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (userId: string) => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            toast.success('User Deleted', 'The user account has been permanently removed.');
        },
        onError: () => {
            toast.error('Action Failed', 'Could not delete the user.');
        },
    });
}

// ============================================
// INSTITUTION MANAGEMENT
// ============================================

export function useAllInstitutions(page = 1, limit = 20, filters?: { verified?: boolean; type?: string; city?: string }) {
    return useQuery({
        queryKey: adminKeys.institutions(page, limit, filters),
        queryFn: () => adminService.getAllInstitutions(page, limit, filters),
        placeholderData: (previousData) => previousData,
    });
}

export function usePendingInstitutions() {
    return useQuery({
        queryKey: adminKeys.pendingInstitutions(),
        queryFn: () => adminService.getPendingInstitutions(),
    });
}

export function useVerifyInstitution() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
            adminService.verifyInstitution(id, verified),
        onSuccess: (_, { verified }) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.pendingInstitutions() });
            queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
            toast.success(
                verified ? 'Institution Verified' : 'Institution Unverified',
                'Verification status has been updated.'
            );
        },
        onError: () => {
            toast.error('Action Failed', 'Could not update institution status.');
        },
    });
}

export function useFeatureInstitution() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
            adminService.featureInstitution(id, featured),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'institutions'] });
            toast.success('Updated', 'Featured status has been updated.');
        },
    });
}

// ============================================
// SYSTEM LOGS
// ============================================

export function useSystemLogs(page = 1, limit = 50, filters?: { level?: string; source?: string }) {
    return useQuery({
        queryKey: adminKeys.logs(page, limit, filters),
        queryFn: () => adminService.getSystemLogs(page, limit, filters as any),
        placeholderData: (previousData) => previousData,
    });
}

export function useAuditLogs(page = 1, limit = 50, filters?: { userId?: string; action?: string }) {
    return useQuery({
        queryKey: adminKeys.auditLogs(page, limit, filters),
        queryFn: () => adminService.getAuditLogs(page, limit, filters as any),
        placeholderData: (previousData) => previousData,
    });
}

// ============================================
// SYSTEM ALERTS
// ============================================

export function useSystemAlerts(activeOnly = true) {
    return useQuery({
        queryKey: adminKeys.alerts(activeOnly),
        queryFn: () => adminService.getSystemAlerts(activeOnly),
    });
}

export function useCreateAlert() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: { title: string; message: string; severity: 'info' | 'warning' | 'error' | 'critical'; isGlobal?: boolean; targetRoles?: string[]; expiresAt?: string }) =>
            adminService.createSystemAlert(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
            toast.success('Alert Created', 'System alert has been created.');
        },
    });
}

export function useDeleteAlert() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => adminService.deleteSystemAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
            toast.success('Alert Deleted', 'System alert has been removed.');
        },
    });
}

// ============================================
// REPORTS
// ============================================

export function useReports(page = 1, limit = 20, status?: string) {
    return useQuery({
        queryKey: adminKeys.reports(page, limit, status),
        queryFn: () => adminService.getReports(page, limit, status),
        placeholderData: (previousData) => previousData,
    });
}

export function useUpdateReportStatus() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
            adminService.updateReportStatus(id, status, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
            toast.success('Report Updated', 'Report status has been updated.');
        },
    });
}

// ============================================
// PARTNERSHIPS
// ============================================

export function usePartnerships(page = 1, limit = 20) {
    return useQuery({
        queryKey: adminKeys.partnerships(page, limit),
        queryFn: () => adminService.getPartnerships(page, limit),
        placeholderData: (previousData) => previousData,
    });
}

export function useCreatePartnership() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: Partial<Partnership>) => adminService.createPartnership(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'partnerships'] });
            toast.success('Partnership Created', 'New partnership has been added.');
        },
    });
}

// ============================================
// SYSTEM HEALTH
// ============================================

export function useSystemHealth() {
    return useQuery({
        queryKey: adminKeys.health(),
        queryFn: () => adminService.getSystemHealth(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

export function useDatabaseStats() {
    return useQuery({
        queryKey: adminKeys.database(),
        queryFn: () => adminService.getDatabaseStats(),
        staleTime: 1000 * 60 * 5, // 5 min
    });
}
