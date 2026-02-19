/**
 * Artist Controller - Backend
 * API endpoints for artist-specific operations
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
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { ArtistService } from "./artist.service"
import {
    CreateArtworkDto,
    UpdateArtworkDto,
    UpdateArtistProfileDto,
} from "./artist.dto"

@ApiTags("Artist")
@Controller("artist")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ArtistController {
    constructor(private readonly artistService: ArtistService) { }

    // ============================================
    // DASHBOARD & STATS
    // ============================================

    @Get("stats")
    @ApiOperation({ summary: "Get artist dashboard stats" })
    async getStats(@Req() req: any) {
        return this.artistService.getArtistStats(req.user.id)
    }

    @Get("analytics")
    @ApiOperation({ summary: "Get artist analytics data" })
    @ApiQuery({ name: "period", required: false })
    async getAnalytics(@Req() req: any, @Query("period") period = "30d") {
        return this.artistService.getArtistAnalytics(req.user.id, period)
    }

    @Get("performance")
    @ApiOperation({ summary: "Get artist performance metrics" })
    async getPerformance(@Req() req: any) {
        return this.artistService.getArtistPerformance(req.user.id)
    }

    // ============================================
    // ARTWORKS MANAGEMENT
    // ============================================

    @Get("artworks")
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
        return this.artistService.getArtistArtworks(req.user.id, +page, +limit, { status, category })
    }

    @Post("artworks")
    @ApiOperation({ summary: "Create new artwork" })
    async createArtwork(@Req() req: any, @Body() dto: CreateArtworkDto) {
        return this.artistService.createArtwork(req.user.id, dto)
    }

    @Put("artworks/:id")
    @ApiOperation({ summary: "Update artwork" })
    async updateArtwork(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateArtworkDto) {
        return this.artistService.updateArtwork(id, req.user.id, dto)
    }

    @Delete("artworks/:id")
    @ApiOperation({ summary: "Delete artwork" })
    async deleteArtwork(@Req() req: any, @Param("id") id: string) {
        await this.artistService.deleteArtwork(id, req.user.id)
        return { success: true, message: "Artwork deleted" }
    }

    @Post("artworks/:id/publish")
    @ApiOperation({ summary: "Publish artwork" })
    async publishArtwork(@Req() req: any, @Param("id") id: string) {
        return this.artistService.publishArtwork(id, req.user.id)
    }

    // ============================================
    // PROFILE
    // ============================================

    @Get("profile")
    @ApiOperation({ summary: "Get artist profile with stats" })
    async getProfile(@Req() req: any) {
        return this.artistService.getArtistProfile(req.user.id)
    }

    @Put("profile")
    @ApiOperation({ summary: "Update artist profile" })
    async updateProfile(@Req() req: any, @Body() dto: UpdateArtistProfileDto) {
        return this.artistService.updateArtistProfile(req.user.id, dto)
    }

    // ============================================
    // ENGAGEMENT
    // ============================================

    @Get("followers")
    @ApiOperation({ summary: "Get artist followers" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getFollowers(
        @Req() req: any,
        @Query("page") page = 1,
        @Query("limit") limit = 20
    ) {
        return this.artistService.getFollowers(req.user.id, +page, +limit)
    }

    @Get("activity")
    @ApiOperation({ summary: "Get recent activity/notifications" })
    async getActivity(@Req() req: any, @Query("limit") limit = 10) {
        return this.artistService.getRecentActivity(req.user.id, +limit)
    }
}

// ============================================
// PUBLIC ARTIST ENDPOINTS (for viewing artist profiles)
// ============================================

@ApiTags("Artists")
@Controller("artists")
export class ArtistsController {
    constructor(private readonly artistService: ArtistService) { }

    @Get(":id")
    @ApiOperation({ summary: "Get public artist profile" })
    async getPublicProfile(@Param("id") id: string) {
        return this.artistService.getArtistProfile(id)
    }

    @Get(":id/artworks")
    @ApiOperation({ summary: "Get artist's published artworks" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getArtistArtworks(
        @Param("id") id: string,
        @Query("page") page = 1,
        @Query("limit") limit = 20
    ) {
        return this.artistService.getArtistArtworks(id, +page, +limit, { status: "published" })
    }
}
