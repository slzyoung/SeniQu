/**
 * Admin Service - Enterprise Grade
 * Comprehensive admin data operations with OWASP security compliance
 */

import api, { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/api';
import { PaginatedResponse, SystemAlert, SystemHealth, SystemLog, User } from '../lib/types';

// ============================================
// TYPES
// ============================================

export interface DashboardStats {
    totalUsers: number;
    totalArtworks: number;
    totalInstitutions: number;
    totalArts: number;
    totalRevenue: number;
    activeUsers: number;
    newUsersToday: number;
    pendingVerifications: number;
}

export interface Institution {
    id: string;
    name: string;
    slug: string;
    description?: string;
    type: 'museum' | 'gallery' | 'studio';
    city: string;
    province?: string;
    country: string;
    isVerified: boolean;
    isFeatured: boolean;
    totalArtworks: number;
    owner: {
        id: string;
        displayName: string;
        email: string;
    };
    createdAt: string;
}

export interface Partnership {
    id: string;
    name: string;
    type: string;
    contactName?: string;
    contactEmail?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    contractValue?: number;
}

export interface Report {
    id: string;
    reporterName: string;
    targetType: string;
    targetId: string;
    reason: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    createdAt: string;
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
}

// ============================================
// SERVICE
// ============================================

class AdminService {
    private static instance: AdminService;

    private constructor() { }

    static getInstance(): AdminService {
        if (!AdminService.instance) {
            AdminService.instance = new AdminService();
        }
        return AdminService.instance;
    }

    /** Expose raw axios instance for advanced queries */
    get api() {
        return api;
    }

    // ============================================
    // DASHBOARD & STATS
    // ============================================

    async getDashboardStats(): Promise<DashboardStats> {
        return apiGet<DashboardStats>('/admin/dashboard');
    }

    async getSystemStats(period = '30d'): Promise<DashboardStats> {
        return apiGet<DashboardStats>('/admin/stats', { params: { period } });
    }

    async getAnalytics(period = '30d'): Promise<any> {
        return apiGet('/admin/analytics', { params: { period } });
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    async getUsers(page = 1, limit = 20, filters?: { role?: string; status?: string }): Promise<PaginatedResponse<User>> {
        return apiGet<PaginatedResponse<User>>('/admin/users', {
            params: { page, limit, ...filters }
        });
    }

    async getUserById(id: string): Promise<User> {
        return apiGet<User>(`/admin/users/${id}`);
    }

    async updateUserRole(userId: string, role: string): Promise<User> {
        return apiPatch<User>(`/admin/users/${userId}/role`, { role });
    }

    async suspendUser(userId: string, reason: string): Promise<void> {
        return apiPost(`/admin/users/${userId}/suspend`, { reason });
    }

    async activateUser(userId: string): Promise<void> {
        return apiPost(`/admin/users/${userId}/activate`, {});
    }

    async deleteUser(userId: string): Promise<void> {
        return apiDelete(`/admin/users/${userId}`);
    }

    // ============================================
    // INSTITUTION MANAGEMENT
    // ============================================

    async getAllInstitutions(page = 1, limit = 20, filters?: {
        verified?: boolean;
        type?: string;
        city?: string;
    }): Promise<PaginatedResponse<Institution>> {
        return apiGet<PaginatedResponse<Institution>>('/admin/institutions', {
            params: { page, limit, ...filters }
        });
    }

    async getPendingInstitutions(): Promise<Institution[]> {
        return apiGet<Institution[]>('/admin/institutions/pending');
    }

    async verifyInstitution(id: string, verified: boolean): Promise<Institution> {
        return apiPost<Institution>(`/admin/institutions/${id}/verify`, { verified });
    }

    async featureInstitution(id: string, featured: boolean): Promise<Institution> {
        return apiPatch<Institution>(`/admin/institutions/${id}/feature`, { featured });
    }

    async deleteInstitution(id: string): Promise<void> {
        return apiDelete(`/admin/institutions/${id}`);
    }

    // ============================================
    // SYSTEM HEALTH & MONITORING
    // ============================================

    async getSystemHealth(): Promise<SystemHealth> {
        return apiGet<SystemHealth>('/admin/health');
    }

    async getDatabaseStats(): Promise<{
        tables: { name: string; rowCount: number; size: string }[];
        totalSize: string;
        connections: number;
    }> {
        return apiGet('/admin/database/stats');
    }

    // ============================================
    // SYSTEM LOGS
    // ============================================

    async getSystemLogs(page = 1, limit = 50, filters?: {
        level?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
        source?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<PaginatedResponse<SystemLog>> {
        return apiGet<PaginatedResponse<SystemLog>>('/admin/logs', {
            params: { page, limit, ...filters }
        });
    }

    async getAuditLogs(page = 1, limit = 50, filters?: {
        userId?: string;
        action?: string;
        resourceType?: string;
    }): Promise<PaginatedResponse<AuditLog>> {
        return apiGet<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
            params: { page, limit, ...filters }
        });
    }

    // ============================================
    // SYSTEM ALERTS
    // ============================================

    async getSystemAlerts(activeOnly = true): Promise<SystemAlert[]> {
        return apiGet<SystemAlert[]>('/admin/alerts', { params: { activeOnly } });
    }

    async createSystemAlert(data: {
        title: string;
        message: string;
        severity: 'info' | 'warning' | 'error' | 'critical';
        isGlobal?: boolean;
        targetRoles?: string[];
        expiresAt?: string;
    }): Promise<SystemAlert> {
        return apiPost<SystemAlert>('/admin/alerts', data);
    }

    async updateSystemAlert(id: string, data: Partial<SystemAlert>): Promise<SystemAlert> {
        return apiPut<SystemAlert>(`/admin/alerts/${id}`, data);
    }

    async deleteSystemAlert(id: string): Promise<void> {
        return apiDelete(`/admin/alerts/${id}`);
    }

    // ============================================
    // REPORTS & ISSUES
    // ============================================

    async getReports(page = 1, limit = 20, status?: string): Promise<PaginatedResponse<Report>> {
        return apiGet<PaginatedResponse<Report>>('/admin/reports', {
            params: { page, limit, status }
        });
    }

    async updateReportStatus(id: string, status: string, notes?: string): Promise<Report> {
        return apiPatch<Report>(`/admin/reports/${id}`, { status, resolutionNotes: notes });
    }

    // ============================================
    // PARTNERSHIPS
    // ============================================

    async getPartnerships(page = 1, limit = 20): Promise<PaginatedResponse<Partnership>> {
        return apiGet<PaginatedResponse<Partnership>>('/admin/partnerships', {
            params: { page, limit }
        });
    }

    async createPartnership(data: Partial<Partnership>): Promise<Partnership> {
        return apiPost<Partnership>('/admin/partnerships', data);
    }

    async updatePartnership(id: string, data: Partial<Partnership>): Promise<Partnership> {
        return apiPut<Partnership>(`/admin/partnerships/${id}`, data);
    }

    async deletePartnership(id: string): Promise<void> {
        return apiDelete(`/admin/partnerships/${id}`);
    }

    // ============================================
    // ART OVERSIGHT
    // ============================================

    async getArtStats(): Promise<{
        totalMinted: number;
        totalListed: number;
        totalSold: number;
        totalVolume: number;
    }> {
        return apiGet('/admin/arts/stats');
    }

    async getArtTransactions(page = 1, limit = 50): Promise<PaginatedResponse<any>> {
        return apiGet('/admin/arts/transactions', { params: { page, limit } });
    }

    // ============================================
    // PREMIUM MANAGEMENT
    // ============================================

    async getSubscriptions(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
        return apiGet('/admin/subscriptions', { params: { page, limit } });
    }

    async getPremiumStats(): Promise<{
        totalSubscribers: number;
        activeSubscriptions: number;
        monthlyRevenue: number;
        churnRate: number;
    }> {
        return apiGet('/admin/premium/stats');
    }

    // ============================================
    // GLOBAL SETTINGS
    // ============================================

    async getGlobalSettings(): Promise<Record<string, any>> {
        return apiGet('/admin/settings');
    }

    async updateGlobalSettings(settings: Record<string, any>): Promise<void> {
        return apiPut('/admin/settings', settings);
    }
}

export const adminService = AdminService.getInstance();
