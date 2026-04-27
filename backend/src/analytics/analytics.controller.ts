/**
 * Analytics Controller - Dashboard statistics
 */

import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { AnalyticsService } from "./analytics.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { TrackEventDto } from "./dto/track-event.dto"

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ===========================================
    // ARTIST ANALYTICS
    // ===========================================

    @Get("artist")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("artist", "institution")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get artist analytics dashboard" })
    @ApiQuery({ name: "period", required: false, enum: ["7d", "30d", "90d", "1y"] })
    async getArtistAnalytics(
        @GetUser("id") userId: string,
        @Query("period") period: string = "30d",
    ) {
        return this.analyticsService.getArtistAnalytics(userId, period)
    }

    @Get("artist/artworks")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("artist", "institution")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get per-artwork analytics" })
    async getArtworkAnalytics(@GetUser("id") userId: string) {
        return this.analyticsService.getArtworkAnalytics(userId)
    }

    // ===========================================
    // ADMIN ANALYTICS
    // ===========================================

    @Get("admin/overview")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get system-wide analytics (Admin)" })
    async getSystemAnalytics(@Query("period") period: string = "30d") {
        return this.analyticsService.getSystemAnalytics(period)
    }

    @Get("admin/users")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get user growth metrics" })
    async getUserAnalytics(@Query("period") period: string = "30d") {
        return this.analyticsService.getUserGrowthAnalytics(period)
    }

    @Get("admin/content")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get content metrics" })
    async getContentAnalytics() {
        return this.analyticsService.getContentAnalytics()
    }

    // ===========================================
    // EVENT TRACKING
    // ===========================================

    @Post("track")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: "Track an analytics event" })
    async trackEvent(@Body() dto: TrackEventDto) {
        return this.analyticsService.trackEvent(dto)
    }
}
