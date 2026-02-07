/**
 * Search Controller - Global search API
 */

import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import { SearchService } from "./search.service"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Search")
@Controller("search")
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Public()
    @Get()
    @SkipThrottle({ default: true })
    @ApiOperation({ summary: "Global search across artworks, museums, and artists" })
    @ApiQuery({ name: "q", required: true, description: "Search query" })
    @ApiQuery({ name: "type", required: false, enum: ["all", "artworks", "museums", "artists"] })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async search(
        @Query("q") query: string,
        @Query("type") type: string = "all",
        @Query("limit") limit: number = 10,
    ) {
        return this.searchService.search(query, type, limit)
    }

    @Public()
    @Get("artworks")
    @ApiOperation({ summary: "Search artworks with filters" })
    @ApiQuery({ name: "q", required: false })
    @ApiQuery({ name: "genre", required: false })
    @ApiQuery({ name: "medium", required: false })
    @ApiQuery({ name: "priceMin", required: false })
    @ApiQuery({ name: "priceMax", required: false })
    @ApiQuery({ name: "isNft", required: false })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async searchArtworks(
        @Query("q") query?: string,
        @Query("genre") genre?: string,
        @Query("medium") medium?: string,
        @Query("priceMin") priceMin?: number,
        @Query("priceMax") priceMax?: number,
        @Query("isNft") isNft?: boolean,
        @Query("page") page: number = 1,
        @Query("limit") limit: number = 20,
    ) {
        return this.searchService.searchArtworks({
            query,
            genre,
            medium,
            priceMin,
            priceMax,
            isNft,
            page,
            limit,
        })
    }

    @Public()
    @Get("nearby")
    @ApiOperation({ summary: "Search nearby museums/galleries" })
    @ApiQuery({ name: "lat", required: true })
    @ApiQuery({ name: "lng", required: true })
    @ApiQuery({ name: "radius", required: false, description: "Radius in km" })
    async searchNearby(
        @Query("lat") lat: number,
        @Query("lng") lng: number,
        @Query("radius") radius: number = 50,
    ) {
        return this.searchService.searchNearby(lat, lng, radius)
    }

    @Public()
    @Get("suggestions")
    @ApiOperation({ summary: "Get search suggestions (autocomplete)" })
    @ApiQuery({ name: "q", required: true })
    async getSuggestions(@Query("q") query: string) {
        return this.searchService.getSuggestions(query)
    }
}
