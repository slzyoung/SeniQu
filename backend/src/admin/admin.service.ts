/**
 * Admin Service - Backend
 * Enterprise-grade business logic for admin operations
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"

export interface DashboardStats {
    totalUsers: number
    totalArtworks: number
    totalInstitutions: number
    totalArts: number
    totalRevenue: number
    activeUsers: number
    newUsersToday: number
    pendingVerifications: number
}

export interface InstitutionWithOwner {
    id: string
    name: string
    slug: string
    description: string
    type: string
    city: string
    province: string
    country: string
    is_verified: boolean
    is_featured: boolean
    total_artworks: number
    created_at: string
    owner: {
        id: string
        display_name: string
        email: string
    }
}

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name)

    constructor(private readonly db: DatabaseService) { }

    // ============================================
    // DASHBOARD STATS
    // ============================================

    async getDashboardStats(): Promise<DashboardStats> {
        const client = this.db.getClient()

        const [users, artworks, institutions, nfts, pendingInstitutions] = await Promise.all([
            client.from("users").select("*", { count: "exact", head: true }),
            client.from("artworks").select("*", { count: "exact", head: true }),
            client.from("institutions").select("*", { count: "exact", head: true }),
            client.from("arts").select("*", { count: "exact", head: true }),
            client.from("institutions").select("*", { count: "exact", head: true }).eq("is_verified", false),
        ])

        // Get today's new users
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: newUsersToday } = await client
            .from("users")
            .select("*", { count: "exact", head: true })
            .gte("created_at", today.toISOString())

        return {
            totalUsers: users.count || 0,
            totalArtworks: artworks.count || 0,
            totalInstitutions: institutions.count || 0,
            totalArts: nfts.count || 0,
            totalRevenue: 0, // TODO: Calculate from subscriptions/transactions
            activeUsers: Math.floor((users.count || 0) * 0.3), // Placeholder
            newUsersToday: newUsersToday || 0,
            pendingVerifications: pendingInstitutions.count || 0,
        }
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    async getUsers(page = 1, limit = 20, filters?: { role?: string; status?: string }) {
        const client = this.db.getClient()
        const safeLimit = Math.min(Math.max(limit, 1), 100)
        const offset = (page - 1) * safeLimit

        let query = client
            .from("users")
            .select("id, email, display_name, role, is_verified, is_active, is_premium, created_at, last_login_at", { count: "exact" })

        if (filters?.role) {
            query = query.eq("role", filters.role)
        }
        if (filters?.status === "active") {
            query = query.eq("is_active", true)
        } else if (filters?.status === "inactive") {
            query = query.eq("is_active", false)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + safeLimit - 1)

        if (error) {
            this.logger.error(`Failed to fetch users: ${error.message}`)
            throw error
        }

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: safeLimit,
                totalPages: Math.ceil((count || 0) / safeLimit),
            },
        }
    }

    async suspendUser(userId: string, reason: string, adminId?: string) {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("users")
            .update({ is_active: false })
            .eq("id", userId)

        if (error) throw error

        // Log audit with admin ID
        await this.logAudit("SUSPEND_USER", "user", userId, { reason }, adminId)

        this.logger.warn(`User suspended: ${userId} by admin: ${adminId}`)
    }

    async activateUser(userId: string, adminId?: string) {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("users")
            .update({ is_active: true, locked_until: null, failed_login_attempts: 0 })
            .eq("id", userId)

        if (error) throw error

        await this.logAudit("ACTIVATE_USER", "user", userId, undefined, adminId)
        this.logger.log(`User activated: ${userId} by admin: ${adminId}`)
    }

    // ============================================
    // INSTITUTION MANAGEMENT
    // ============================================

    async getAllInstitutions(page = 1, limit = 20, filters?: { verified?: boolean; type?: string; city?: string }) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client
            .from("institutions")
            .select("*, owner:users(id, display_name, email)", { count: "exact" })

        if (filters?.verified !== undefined) {
            query = query.eq("is_verified", filters.verified)
        }
        if (filters?.type) {
            query = query.eq("type", filters.type)
        }
        if (filters?.city) {
            query = query.ilike("city", `%${filters.city}%`)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async getPendingInstitutions(): Promise<InstitutionWithOwner[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("institutions")
            .select("*, owner:users(id, display_name, email)")
            .eq("is_verified", false)
            .order("created_at", { ascending: false })

        if (error) throw error
        return data || []
    }

    async verifyInstitution(id: string, verified: boolean) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("institutions")
            .update({ is_verified: verified })
            .eq("id", id)
            .select("*, owner:users(id, display_name, email)")
            .single()

        if (error) throw error
        if (!data) throw new NotFoundException("Institution not found")

        await this.logAudit(verified ? "VERIFY_INSTITUTION" : "UNVERIFY_INSTITUTION", "institution", id)
        this.logger.log(`Institution ${verified ? "verified" : "unverified"}: ${id}`)

        return data
    }

    async featureInstitution(id: string, featured: boolean) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("institutions")
            .update({ is_featured: featured })
            .eq("id", id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    // ============================================
    // SYSTEM LOGS
    // ============================================

    async getSystemLogs(page = 1, limit = 50, filters?: { level?: string; source?: string; startDate?: string; endDate?: string }) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client
            .from("system_logs")
            .select("*", { count: "exact" })

        if (filters?.level) {
            query = query.eq("level", filters.level)
        }
        if (filters?.source) {
            query = query.eq("source", filters.source)
        }
        if (filters?.startDate) {
            query = query.gte("created_at", filters.startDate)
        }
        if (filters?.endDate) {
            query = query.lte("created_at", filters.endDate)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async getAuditLogs(page = 1, limit = 50, filters?: { userId?: string; action?: string; resourceType?: string }) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client
            .from("audit_logs")
            .select("*, user:users(id, display_name, email)", { count: "exact" })

        if (filters?.userId) {
            query = query.eq("user_id", filters.userId)
        }
        if (filters?.action) {
            query = query.eq("action", filters.action)
        }
        if (filters?.resourceType) {
            query = query.eq("resource_type", filters.resourceType)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    // ============================================
    // SYSTEM ALERTS
    // ============================================

    async getSystemAlerts(activeOnly = true) {
        const client = this.db.getClient()

        let query = client
            .from("system_alerts")
            .select("*")
            .order("created_at", { ascending: false })

        if (activeOnly) {
            query = query.eq("is_active", true)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }

    async createSystemAlert(data: {
        title: string
        message: string
        severity: string
        isGlobal?: boolean
        targetRoles?: string[]
        expiresAt?: string
    }, createdBy: string) {
        const client = this.db.getAdminClient()

        const { data: alert, error } = await client
            .from("system_alerts")
            .insert({
                title: data.title,
                message: data.message,
                severity: data.severity,
                is_global: data.isGlobal ?? true,
                target_roles: data.targetRoles,
                expires_at: data.expiresAt,
                created_by: createdBy,
            })
            .select()
            .single()

        if (error) throw error

        this.logger.log(`System alert created: ${alert.id}`)
        return alert
    }

    async updateSystemAlert(id: string, updates: any) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("system_alerts")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteSystemAlert(id: string) {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("system_alerts")
            .delete()
            .eq("id", id)

        if (error) throw error
        this.logger.warn(`System alert deleted: ${id}`)
    }

    // ============================================
    // REPORTS
    // ============================================

    async getReports(page = 1, limit = 20, status?: string) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client
            .from("reports")
            .select("*, reporter:users!reporter_id(id, display_name)", { count: "exact" })

        if (status) {
            query = query.eq("status", status)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async updateReportStatus(id: string, status: string, resolvedBy: string, notes?: string) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("reports")
            .update({
                status,
                resolved_by: resolvedBy,
                resolution_notes: notes,
                resolved_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    // ============================================
    // PARTNERSHIPS
    // ============================================

    async getPartnerships(page = 1, limit = 20) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        const { data, error, count } = await client
            .from("partnerships")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async createPartnership(partnershipData: any) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("partnerships")
            .insert(partnershipData)
            .select()
            .single()

        if (error) throw error
        return data
    }

    // ============================================
    // DATABASE STATS
    // ============================================

    async getDatabaseStats() {
        const client = this.db.getClient()

        const tables = ["users", "artworks", "institutions", "arts", "forum_threads", "notifications"]
        const tableStats = await Promise.all(
            tables.map(async table => {
                const { count } = await client.from(table).select("*", { count: "exact", head: true })
                return { name: table, rowCount: count || 0, size: "N/A" }
            })
        )

        return {
            tables: tableStats,
            totalSize: "N/A",
            connections: 10, // Placeholder
        }
    }

    // ============================================
    // AUDIT LOGGING
    // ============================================

    private async logAudit(action: string, resourceType: string, resourceId: string, metadata?: any, userId?: string) {
        try {
            const client = this.db.getAdminClient()
            await client.from("audit_logs").insert({
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                metadata,
                user_id: userId,
                status: "success",
            })
        } catch (error) {
            this.logger.error(`Failed to log audit: ${error}`)
        }
    }
}
