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
    ParseUUIDPipe,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { Throttle, SkipThrottle } from "@nestjs/throttler"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { SqlInjectionGuard } from "../common/guards/sql-injection.guard"
import { BypassSecurity } from "../common/decorators/bypass-security.decorator"
import { AdminService } from "./admin.service"
import {
    CreateSystemAlertDto,
    UpdateSystemAlertDto,
    CreatePartnershipDto,
    SuspendUserDto,
    UpdateReportStatusDto,
} from "./admin.dto"

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard, SqlInjectionGuard)
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

    @Get("stats")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get system stats with period filter" })
    @ApiQuery({ name: "period", required: false })
    async getStats(@Query("period") period = "30d") {
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
        return this.adminService.getUsers(+page, Math.min(+limit, 100), { role, status })
    }

    @Post("users/:id/suspend")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @Throttle({ short: { ttl: 1000, limit: 3 } })
    @ApiOperation({ summary: "Suspend a user" })
    async suspendUser(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: SuspendUserDto,
        @Req() req: any
    ) {
        await this.adminService.suspendUser(id, dto.reason, req.user?.id)
        return { success: true, message: "User suspended" }
    }

    @Post("users/:id/activate")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @Throttle({ short: { ttl: 1000, limit: 3 } })
    @ApiOperation({ summary: "Activate a user" })
    async activateUser(
        @Param("id", ParseUUIDPipe) id: string,
        @Req() req: any
    ) {
        await this.adminService.activateUser(id, req.user?.id)
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
        return this.adminService.getAllInstitutions(+page, Math.min(+limit, 100), {
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
    @Permissions(Permission.INSTITUTION_VERIFY)
    @Throttle({ short: { ttl: 1000, limit: 5 } })
    @ApiOperation({ summary: "Verify/unverify institution" })
    async verifyInstitution(
        @Param("id", ParseUUIDPipe) id: string,
        @Body("verified") verified: boolean
    ) {
        return this.adminService.verifyInstitution(id, verified)
    }

    @Patch("institutions/:id/feature")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Feature/unfeature institution" })
    async featureInstitution(
        @Param("id", ParseUUIDPipe) id: string,
        @Body("featured") featured: boolean
    ) {
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
        return this.adminService.getSystemLogs(+page, Math.min(+limit, 100), { level, source, startDate, endDate })
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
        return this.adminService.getAuditLogs(+page, Math.min(+limit, 100), { userId, action, resourceType })
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
    @Permissions(Permission.ADMIN_SETTINGS)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Create system alert" })
    async createSystemAlert(@Body() dto: CreateSystemAlertDto, @Req() req: any) {
        return this.adminService.createSystemAlert(dto, req.user.id)
    }

    @Put("alerts/:id")
    @Permissions(Permission.ADMIN_SETTINGS)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Update system alert" })
    async updateSystemAlert(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateSystemAlertDto
    ) {
        return this.adminService.updateSystemAlert(id, dto)
    }

    @Delete("alerts/:id")
    @Permissions(Permission.ADMIN_SETTINGS)
    @Throttle({ short: { ttl: 1000, limit: 3 } })
    @ApiOperation({ summary: "Delete system alert" })
    async deleteSystemAlert(@Param("id", ParseUUIDPipe) id: string) {
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
        return this.adminService.getReports(+page, Math.min(+limit, 100), status)
    }

    @Patch("reports/:id")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Update report status" })
    async updateReportStatus(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateReportStatusDto,
        @Req() req: any
    ) {
        return this.adminService.updateReportStatus(id, dto.status, req.user.id, dto.resolutionNotes)
    }

    // ============================================
    // PARTNERSHIPS
    // ============================================

    @Get("partnerships")
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiOperation({ summary: "Get partnerships" })
    async getPartnerships(@Query("page") page = 1, @Query("limit") limit = 20) {
        return this.adminService.getPartnerships(+page, Math.min(+limit, 100))
    }

    @Post("partnerships")
    @Permissions(Permission.ADMIN_SETTINGS)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Create partnership" })
    async createPartnership(@Body() dto: CreatePartnershipDto) {
        return this.adminService.createPartnership(dto)
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
