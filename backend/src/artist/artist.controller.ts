/**
 * Artist Controller - Backend
 * API endpoints for artist-specific operations
 * Security: JWT auth + Permissions + SQL injection guard + Rate limiting
 */

import {
    Controller,
    Get,
    Post,
    Put,
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
import { ArtistService } from "./artist.service"
import {
    CreateArtworkDto,
    UpdateArtworkDto,
    UpdateArtistProfileDto,
} from "./artist.dto"

@ApiTags("Artist")
@Controller("artist")
@UseGuards(JwtAuthGuard, PermissionsGuard, SqlInjectionGuard)
@ApiBearerAuth("JWT-auth")
export class ArtistController {
    constructor(private readonly artistService: ArtistService) { }

    // ============================================
    // DASHBOARD & STATS
    // ============================================

    @Get("stats")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist dashboard stats" })
    async getStats(@Req() req: any) {
        return this.artistService.getArtistStats(req.user.id)
    }

    @Get("analytics")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist analytics data" })
    @ApiQuery({ name: "period", required: false })
    async getAnalytics(@Req() req: any, @Query("period") period = "30d") {
        return this.artistService.getArtistAnalytics(req.user.id, period)
    }

    @Get("performance")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist performance metrics" })
    async getPerformance(@Req() req: any) {
        return this.artistService.getArtistPerformance(req.user.id)
    }

    // ============================================
    // ARTWORKS MANAGEMENT
    // ============================================

    @Get("artworks")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist's artworks" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiQuery({ name: "status", required: false })
    @ApiQuery({ name: "category", required: false })
    async getArtworks(
        @Req() req: any,
        @Query("page") page = 1,
        @Query("limit") limit = 20,
        @Query("status") status?: string,
        @Query("category") category?: string
    ) {
        return this.artistService.getArtistArtworks(req.user.id, +page, Math.min(+limit, 100), { status, category })
    }

    @Post("artworks")
    @Permissions(Permission.ARTWORK_CREATE)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Create new artwork" })
    async createArtwork(@Req() req: any, @Body() dto: CreateArtworkDto) {
        return this.artistService.createArtwork(req.user.id, dto)
    }

    @Put("artworks/:id")
    @Permissions(Permission.ARTWORK_UPDATE)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Update artwork" })
    async updateArtwork(
        @Req() req: any,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateArtworkDto
    ) {
        return this.artistService.updateArtwork(id, req.user.id, dto)
    }

    @Delete("artworks/:id")
    @Permissions(Permission.ARTWORK_DELETE)
    @Throttle({ short: { ttl: 1000, limit: 3 } })
    @ApiOperation({ summary: "Delete artwork" })
    async deleteArtwork(
        @Req() req: any,
        @Param("id", ParseUUIDPipe) id: string
    ) {
        await this.artistService.deleteArtwork(id, req.user.id)
        return { success: true, message: "Artwork deleted" }
    }

    @Post("artworks/:id/publish")
    @Permissions(Permission.ARTWORK_PUBLISH)
    @Throttle({ short: { ttl: 1000, limit: 5 } })
    @ApiOperation({ summary: "Publish artwork" })
    async publishArtwork(
        @Req() req: any,
        @Param("id", ParseUUIDPipe) id: string
    ) {
        return this.artistService.publishArtwork(id, req.user.id)
    }

    // ============================================
    // PROFILE
    // ============================================

    @Get("profile")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist profile with stats" })
    async getProfile(@Req() req: any) {
        return this.artistService.getArtistProfile(req.user.id)
    }

    @Put("profile")
    @Permissions(Permission.ARTWORK_UPDATE)
    @SkipThrottle()
    @BypassSecurity()
    @ApiOperation({ summary: "Update artist profile" })
    async updateProfile(@Req() req: any, @Body() dto: UpdateArtistProfileDto) {
        return this.artistService.updateArtistProfile(req.user.id, dto)
    }

    // ============================================
    // ENGAGEMENT
    // ============================================

    @Get("followers")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get artist followers" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getFollowers(
        @Req() req: any,
        @Query("page") page = 1,
        @Query("limit") limit = 20
    ) {
        return this.artistService.getFollowers(req.user.id, +page, Math.min(+limit, 100))
    }

    @Get("activity")
    @Permissions(Permission.ARTWORK_READ)
    @ApiOperation({ summary: "Get recent activity/notifications" })
    async getActivity(@Req() req: any, @Query("limit") limit = 10) {
        return this.artistService.getRecentActivity(req.user.id, Math.min(+limit, 50))
    }
}

// ============================================
// PUBLIC ARTIST ENDPOINTS (for viewing artist profiles)
// ============================================

@ApiTags("Artists")
@Controller("artists")
@UseGuards(SqlInjectionGuard)
export class ArtistsController {
    constructor(private readonly artistService: ArtistService) { }

    @Get(":id")
    @ApiOperation({ summary: "Get public artist profile" })
    async getPublicProfile(@Param("id", ParseUUIDPipe) id: string) {
        return this.artistService.getArtistProfile(id)
    }

    @Get(":id/artworks")
    @ApiOperation({ summary: "Get artist's published artworks" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getArtistArtworks(
        @Param("id", ParseUUIDPipe) id: string,
        @Query("page") page = 1,
        @Query("limit") limit = 20
    ) {
        return this.artistService.getArtistArtworks(id, +page, Math.min(+limit, 100), { status: "published" })
    }
}
