/**
 * Audit Service - OWASP Security Logging
 * Comprehensive audit trail for security compliance
 */

import { Injectable, Logger } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"

interface AuditLogEntry {
    userId?: string
    action: string
    resourceType: string
    resourceId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    ipAddress?: string
    userAgent?: string
    status?: "success" | "failure"
    errorMessage?: string
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Log an audit event
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await this.supabase.from("audit_logs").insert({
                user_id: entry.userId,
                action: entry.action,
                resource_type: entry.resourceType,
                resource_id: entry.resourceId,
                old_values: entry.oldValues,
                new_values: entry.newValues,
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
                status: entry.status || "success",
                error_message: entry.errorMessage,
            })

            this.logger.debug(
                `Audit: ${entry.action} on ${entry.resourceType}/${entry.resourceId} by ${entry.userId || "anonymous"}`,
            )
        } catch (error) {
            this.logger.error(`Failed to write audit log: ${error.message}`)
        }
    }

    /**
     * Log authentication events
     */
    async logAuth(action: "login" | "logout" | "login_failed" | "password_reset", userId?: string, metadata?: Record<string, any>) {
        await this.log({
            userId,
            action: `auth.${action}`,
            resourceType: "session",
            status: action.includes("failed") ? "failure" : "success",
            ...metadata,
        })
    }

    /**
     * Log data access events
     */
    async logDataAccess(userId: string, resourceType: string, resourceId: string, action: "read" | "create" | "update" | "delete") {
        await this.log({
            userId,
            action: `data.${action}`,
            resourceType,
            resourceId,
        })
    }

    /**
     * Log security events
     */
    async logSecurity(event: string, details: Record<string, any>) {
        await this.log({
            action: `security.${event}`,
            resourceType: "security",
            newValues: details,
        })
    }

    /**
     * Log admin actions
     */
    async logAdminAction(adminId: string, action: string, targetType: string, targetId: string, details?: Record<string, any>) {
        await this.log({
            userId: adminId,
            action: `admin.${action}`,
            resourceType: targetType,
            resourceId: targetId,
            newValues: details,
        })
    }

    /**
     * Get audit logs for admin review
     */
    async getAuditLogs(params: {
        page?: number
        limit?: number
        userId?: string
        action?: string
        resourceType?: string
        startDate?: Date
        endDate?: Date
    }) {
        const { page = 1, limit = 50, userId, action, resourceType, startDate, endDate } = params
        const offset = (page - 1) * limit

        let query = this.supabase
            .from("audit_logs")
            .select("*, user:users(id, email, display_name)", { count: "exact" })

        if (userId) query = query.eq("user_id", userId)
        if (action) query = query.ilike("action", `%${action}%`)
        if (resourceType) query = query.eq("resource_type", resourceType)
        if (startDate) query = query.gte("created_at", startDate.toISOString())
        if (endDate) query = query.lte("created_at", endDate.toISOString())

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }
}
