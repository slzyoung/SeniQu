/**
 * Museums Controller - REST API for Museums/Galleries
 * OWASP: Input validation, Rate limiting, Authorization
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Req,
    UseGuards,
    ParseUUIDPipe,
    HttpStatus,
    HttpCode,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { Throttle, SkipThrottle } from "@nestjs/throttler"
import { MuseumsService } from "./museums.service"
import { CreateMuseumDto } from "./dto/create-museum.dto"
import { UpdateMuseumDto } from "./dto/update-museum.dto"
import { SearchMuseumDto } from "./dto/search-museum.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Museums")
@Controller("museums")
export class MuseumsController {
    constructor(private readonly museumsService: MuseumsService) { }

    // ===========================================
    // PUBLIC ENDPOINTS
    // ===========================================

    @Public()
    @Get()
    @SkipThrottle({ default: true })
    @ApiOperation({ summary: "List all verified museums and galleries" })
    @ApiResponse({ status: 200, description: "List of museums" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "city", required: false, type: String })
    @ApiQuery({ name: "type", required: false, type: String })
    async findAll(@Query() query: SearchMuseumDto) {
        return this.museumsService.findAll(query)
    }

    @Public()
    @Get("nearby")
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: "Find museums near a location" })
    @ApiQuery({ name: "lat", required: true, type: Number })
    @ApiQuery({ name: "lng", required: true, type: Number })
    @ApiQuery({ name: "radius", required: false, type: Number, description: "Radius in km (default: 50, max: 100)" })
    async findNearby(
        @Query("lat") lat?: number,
        @Query("lng") lng?: number,
        @Query("latitude") latitude?: number,
        @Query("longitude") longitude?: number,
        @Query("radius") radius?: number,
    ) {
        const actualLat = lat ?? latitude ?? 0;
        const actualLng = lng ?? longitude ?? 0;
        const safeLat = Math.max(-90, Math.min(90, Number(actualLat) || 0));
        const safeLng = Math.max(-180, Math.min(180, Number(actualLng) || 0));
        const safeRadius = Math.max(1, Math.min(100, Number(radius) || 50));
        return this.museumsService.findNearby(safeLat, safeLng, safeRadius)
    }

    @Public()
    @Get("search-nearby")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Search nearby museums, galleries, and heritage sites using Google Places API" })
    @ApiQuery({ name: "lat", required: true, type: Number })
    @ApiQuery({ name: "lng", required: true, type: Number })
    @ApiQuery({ name: "radius", required: false, type: Number, description: "Radius in meters (default: 70000, max: 70000)" })
    @ApiQuery({ name: "query", required: false, type: String, description: "Search query for specific name/address matching" })
    async searchNearbyPlaces(
        @Query("lat") lat?: number,
        @Query("lng") lng?: number,
        @Query("latitude") latitude?: number,
        @Query("longitude") longitude?: number,
        @Query("radius") radius?: number,
        @Query("query") query?: string,
        @Req() req?: any,
    ) {
        const actualLat = lat ?? latitude ?? 0;
        const actualLng = lng ?? longitude ?? 0;
        const safeLat = Math.max(-90, Math.min(90, Number(actualLat) || 0));
        const safeLng = Math.max(-180, Math.min(180, Number(actualLng) || 0));
        const safeRadius = Math.max(1000, Math.min(70000, Number(radius) || 70000));
        // SECURITY: Truncate query to prevent oversized search strings
        const safeQuery = query ? String(query).slice(0, 200) : undefined;
        
        // Extract client IP address safely
        const clientIp = req ? (req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "unknown") : "unknown";
        
        return this.museumsService.searchNearbyPlaces(
            safeLat,
            safeLng,
            safeRadius,
            safeQuery,
            Array.isArray(clientIp) ? clientIp[0] : String(clientIp),
        );
    }

    @Public()
    @Get("place-details/:placeId")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Get detailed place information from Google Places API (New)" })
    async getPlaceDetails(
        @Param("placeId") placeId: string,
        @Req() req?: any
    ) {
        // SECURITY: Sanitize path parameter to prevent injection
        const safePlaceId = String(placeId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
        const clientIp = req ? (req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "unknown") : "unknown";
        const ipStr = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);
        return this.museumsService.getPlaceDetails(safePlaceId, ipStr);
    }

    @Public()
    @Get("wikipedia-summary")
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: "Get Wikipedia page summary (brief history) for a place" })
    @ApiQuery({ name: "name", required: true, type: String })
    async getWikipediaSummary(
        @Query("name") name: string
    ) {
        const safeName = String(name).slice(0, 100);
        return this.museumsService.scrapePlaceSummary(safeName);
    }

    @Public()
    @Get("region-type")
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @ApiOperation({ summary: "Detect if coordinates are in a major city (50km) or regency/kabupaten area (100km)" })
    @ApiQuery({ name: "lat", required: true, type: Number })
    @ApiQuery({ name: "lng", required: true, type: Number })
    async detectRegionType(
        @Query("lat") lat: number,
        @Query("lng") lng: number,
        @Req() req?: any
    ) {
        const safeLat = Math.max(-90, Math.min(90, Number(lat) || 0));
        const safeLng = Math.max(-180, Math.min(180, Number(lng) || 0));
        const clientIp = req ? (req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "unknown") : "unknown";
        const ipStr = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);
        return this.museumsService.detectRegionType(safeLat, safeLng, ipStr);
    }

    @Public()
    @Get("route")
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @ApiOperation({ summary: "Get routing directions from Google Maps API" })
    @ApiQuery({ name: "originLat", required: true, type: Number })
    @ApiQuery({ name: "originLng", required: true, type: Number })
    @ApiQuery({ name: "destLat", required: true, type: Number })
    @ApiQuery({ name: "destLng", required: true, type: Number })
    @ApiQuery({ name: "mode", required: false, type: String, enum: ['driving', 'walking', 'bicycling', 'transit'] })
    async getRoute(
        @Query("originLat") originLat: number,
        @Query("originLng") originLng: number,
        @Query("destLat") destLat: number,
        @Query("destLng") destLng: number,
        @Query("mode") mode?: string,
        @Req() req?: any
    ) {
        // SECURITY: Validate and clamp coordinates to valid geo ranges
        const safeOriginLat = Math.max(-90, Math.min(90, Number(originLat) || 0));
        const safeOriginLng = Math.max(-180, Math.min(180, Number(originLng) || 0));
        const safeDestLat = Math.max(-90, Math.min(90, Number(destLat) || 0));
        const safeDestLng = Math.max(-180, Math.min(180, Number(destLng) || 0));
        // SECURITY: Validate mode against allowed values
        const ALLOWED_MODES = ['driving', 'walking', 'bicycling', 'transit'];
        const safeMode = ALLOWED_MODES.includes(String(mode || '').toLowerCase())
            ? String(mode).toLowerCase()
            : 'driving';
        const clientIp = req ? (req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "unknown") : "unknown";
        const ipStr = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);
        return this.museumsService.getRoute(
            safeOriginLat,
            safeOriginLng,
            safeDestLat,
            safeDestLng,
            safeMode,
            ipStr
        );
    }

    @Public()
    @Get("maps-config")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Get Google Maps client configuration" })
    @ApiResponse({ status: 200, description: "Maps API key for client-side rendering" })
    async getMapsConfig() {
        return this.museumsService.getMapsConfig()
    }

    @Public()
    @Get(":slug")
    @ApiOperation({ summary: "Get museum details by slug" })
    @ApiResponse({ status: 200, description: "Museum details" })
    @ApiResponse({ status: 404, description: "Museum not found" })
    async findBySlug(@Param("slug") slug: string) {
        return this.museumsService.findBySlug(slug)
    }

    @Public()
    @Get(":id/artworks")
    @ApiOperation({ summary: "Get artworks in a museum" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async getMuseumArtworks(
        @Param("id", ParseUUIDPipe) id: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.museumsService.getMuseumArtworks(id, page, limit)
    }

    // ===========================================
    // PROTECTED ENDPOINTS (Institution Owner)
    // ===========================================

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("artist", "institution", "admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
    @ApiOperation({ summary: "Create a new museum/gallery" })
    @ApiResponse({ status: 201, description: "Museum created" })
    async create(
        @Body() createMuseumDto: CreateMuseumDto,
        @GetUser("id") userId: string,
    ) {
        return this.museumsService.create(createMuseumDto, userId)
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("artist", "institution", "admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update museum details" })
    @ApiResponse({ status: 200, description: "Museum updated" })
    async update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() updateMuseumDto: UpdateMuseumDto,
        @GetUser("id") userId: string,
    ) {
        return this.museumsService.update(id, updateMuseumDto, userId)
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a museum (Admin only)" })
    async remove(@Param("id", ParseUUIDPipe) id: string) {
        return this.museumsService.remove(id)
    }

    // ===========================================
    // ADMIN ENDPOINTS
    // ===========================================

    @Get("pending")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get pending museums (Admin only)" })
    async findPending() {
        return this.museumsService.findPending()
    }

    @Put(":id/verify")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Verify a museum (Admin only)" })
    async verifyMuseum(@Param("id", ParseUUIDPipe) id: string) {
        return this.museumsService.verify(id)
    }

    @Put(":id/feature")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Feature a museum on homepage" })
    async featureMuseum(
        @Param("id", ParseUUIDPipe) id: string,
        @Body("featured") featured: boolean,
    ) {
        return this.museumsService.setFeatured(id, featured)
    }
}
