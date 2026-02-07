/**
 * Bookmarks Controller - User bookmark management
 */

import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { BookmarksService } from "./bookmarks.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"

@ApiTags("Bookmarks")
@Controller("bookmarks")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class BookmarksController {
    constructor(private readonly bookmarksService: BookmarksService) { }

    @Get()
    @ApiOperation({ summary: "Get user's bookmarked artworks" })
    @ApiResponse({ status: 200, description: "List of bookmarked artworks" })
    async findAll(
        @GetUser("id") userId: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.bookmarksService.findByUser(userId, page, limit)
    }

    @Post(":artworkId")
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: "Bookmark an artwork" })
    @ApiResponse({ status: 201, description: "Artwork bookmarked" })
    async create(
        @Param("artworkId", ParseUUIDPipe) artworkId: string,
        @GetUser("id") userId: string,
    ) {
        return this.bookmarksService.create(userId, artworkId)
    }

    @Delete(":artworkId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Remove bookmark" })
    async remove(
        @Param("artworkId", ParseUUIDPipe) artworkId: string,
        @GetUser("id") userId: string,
    ) {
        return this.bookmarksService.remove(userId, artworkId)
    }

    @Get("check/:artworkId")
    @ApiOperation({ summary: "Check if artwork is bookmarked" })
    async check(
        @Param("artworkId", ParseUUIDPipe) artworkId: string,
        @GetUser("id") userId: string,
    ) {
        return this.bookmarksService.isBookmarked(userId, artworkId)
    }
}
