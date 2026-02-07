import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    Req,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { AdminService } from "./admin.service"

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth("JWT-auth")
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ============================================
    // DASHBOARD
    // ============================================

    @Get("dashboard")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get admin dashboard stats" })
    async getDashboard() {
        return this.adminService.getDashboardStats()
    }

    @Get("analytics")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get analytics data" })
    async getAnalytics(@Query("period") period = "30d") {
        return this.adminService.getDashboardStats()
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    @Get("users")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get all users with pagination" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiQuery({ name: "role", required: false })
    @ApiQuery({ name: "status", required: false })
    async getUsers(
        @Query("page") page = 1,
        @Query("limit") limit = 20,
        @Query("role") role?: string,
        @Query("status") status?: string
    ) {
        return this.adminService.getUsers(+page, +limit, { role, status })
    }

    @Post("users/:id/suspend")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Suspend a user" })
    async suspendUser(@Param("id") id: string, @Body("reason") reason: string) {
        await this.adminService.suspendUser(id, reason)
        return { success: true, message: "User suspended" }
    }

    @Post("users/:id/activate")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Activate a user" })
    async activateUser(@Param("id") id: string) {
        await this.adminService.activateUser(id)
        return { success: true, message: "User activated" }
    }

    // ============================================
    // INSTITUTION MANAGEMENT
    // ============================================

    @Get("institutions")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get all institutions" })
    async getAllInstitutions(
        @Query("page") page = 1,
        @Query("limit") limit = 20,
        @Query("verified") verified?: string,
        @Query("type") type?: string,
        @Query("city") city?: string
    ) {
        return this.adminService.getAllInstitutions(+page, +limit, {
            verified: verified ? verified === "true" : undefined,
            type,
            city,
        })
    }

    @Get("institutions/pending")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get pending institutions" })
    async getPendingInstitutions() {
        return this.adminService.getPendingInstitutions()
    }

    @Post("institutions/:id/verify")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Verify/unverify institution" })
    async verifyInstitution(@Param("id") id: string, @Body("verified") verified: boolean) {
        return this.adminService.verifyInstitution(id, verified)
    }

    @Patch("institutions/:id/feature")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Feature/unfeature institution" })
    async featureInstitution(@Param("id") id: string, @Body("featured") featured: boolean) {
        return this.adminService.featureInstitution(id, featured)
    }

    // ============================================
    // SYSTEM LOGS
    // ============================================

    @Get("logs")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get system logs" })
    async getSystemLogs(
        @Query("page") page = 1,
        @Query("limit") limit = 50,
        @Query("level") level?: string,
        @Query("source") source?: string,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string
    ) {
        return this.adminService.getSystemLogs(+page, +limit, { level, source, startDate, endDate })
    }

    @Get("audit-logs")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get audit logs" })
    async getAuditLogs(
        @Query("page") page = 1,
        @Query("limit") limit = 50,
        @Query("userId") userId?: string,
        @Query("action") action?: string,
        @Query("resourceType") resourceType?: string
    ) {
        return this.adminService.getAuditLogs(+page, +limit, { userId, action, resourceType })
    }

    // ============================================
    // SYSTEM ALERTS
    // ============================================

    @Get("alerts")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get system alerts" })
    async getSystemAlerts(@Query("activeOnly") activeOnly = "true") {
        return this.adminService.getSystemAlerts(activeOnly === "true")
    }

    @Post("alerts")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Create system alert" })
    async createSystemAlert(@Body() body: any, @Req() req: any) {
        return this.adminService.createSystemAlert(body, req.user.id)
    }

    @Put("alerts/:id")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Update system alert" })
    async updateSystemAlert(@Param("id") id: string, @Body() body: any) {
        return this.adminService.updateSystemAlert(id, body)
    }

    @Delete("alerts/:id")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Delete system alert" })
    async deleteSystemAlert(@Param("id") id: string) {
        await this.adminService.deleteSystemAlert(id)
        return { success: true }
    }

    // ============================================
    // REPORTS
    // ============================================

    @Get("reports")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get content reports" })
    async getReports(
        @Query("page") page = 1,
        @Query("limit") limit = 20,
        @Query("status") status?: string
    ) {
        return this.adminService.getReports(+page, +limit, status)
    }

    @Patch("reports/:id")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Update report status" })
    async updateReportStatus(
        @Param("id") id: string,
        @Body("status") status: string,
        @Body("resolutionNotes") notes: string,
        @Req() req: any
    ) {
        return this.adminService.updateReportStatus(id, status, req.user.id, notes)
    }

    // ============================================
    // PARTNERSHIPS
    // ============================================

    @Get("partnerships")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get partnerships" })
    async getPartnerships(@Query("page") page = 1, @Query("limit") limit = 20) {
        return this.adminService.getPartnerships(+page, +limit)
    }

    @Post("partnerships")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Create partnership" })
    async createPartnership(@Body() body: any) {
        return this.adminService.createPartnership(body)
    }

    // ============================================
    // DATABASE STATS
    // ============================================

    @Get("database/stats")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get database statistics" })
    async getDatabaseStats() {
        return this.adminService.getDatabaseStats()
    }

    // ============================================
    // SYSTEM HEALTH
    // ============================================

    @Get("health")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get system health status" })
    async getSystemHealth() {
        return {
            status: "healthy",
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
        }
    }
}
