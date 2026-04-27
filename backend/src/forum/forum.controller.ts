/**
 * Forum Controller - Community threads and posts
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
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { Throttle, SkipThrottle } from "@nestjs/throttler"
import { ForumService } from "./forum.service"
import { CreateThreadDto } from "./dto/create-thread.dto"
import { CreatePostDto } from "./dto/create-post.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Forum")
@Controller("forum")
export class ForumController {
    constructor(private readonly forumService: ForumService) { }

    // ===========================================
    // CATEGORIES (Public)
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("categories")
    @ApiOperation({ summary: "Get all forum categories" })
    async getCategories() {
        return this.forumService.getCategories()
    }

    // ===========================================
    // TRENDING & FEATURED (must be before :idOrSlug catch-all)
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("trending")
    @ApiOperation({ summary: "Get trending threads" })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async getTrending(@Query("limit") limit?: number) {
        return this.forumService.getTrending(limit || 10)
    }

    @Public()
    @SkipThrottle()
    @Get("featured")
    @ApiOperation({ summary: "Get featured threads" })
    async getFeatured() {
        return this.forumService.getFeatured()
    }

    // ===========================================
    // THREADS
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("threads")
    @ApiOperation({ summary: "List forum threads" })
    @ApiQuery({ name: "categoryId", required: false })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiQuery({ name: "sortBy", required: false })
    async getThreads(
        @Query("categoryId") categoryId?: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("sortBy") sortBy?: "latest" | "popular" | "views",
    ) {
        return this.forumService.getThreads(categoryId, page, limit, sortBy)
    }

    @Public()
    @SkipThrottle()
    @Get("threads/:idOrSlug")
    @ApiOperation({ summary: "Get thread by ID or slug" })
    async getThread(@Param("idOrSlug") idOrSlug: string) {
        // UUID v4 pattern detection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(idOrSlug)) {
            return this.forumService.getThreadById(idOrSlug)
        }
        return this.forumService.getThreadBySlug(idOrSlug)
    }

    @Post("threads")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: "Create a new thread" })
    async createThread(
        @Body() dto: CreateThreadDto,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.createThread(dto, userId)
    }

    @Put("threads/:id/pin")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Pin/Unpin a thread (Admin)" })
    async togglePin(
        @Param("id", ParseUUIDPipe) id: string,
        @Body("pinned") pinned: boolean,
    ) {
        return this.forumService.togglePin(id, pinned)
    }

    @Put("threads/:id/lock")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin", "super_admin")
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Lock/Unlock a thread (Admin)" })
    async toggleLock(
        @Param("id", ParseUUIDPipe) id: string,
        @Body("locked") locked: boolean,
    ) {
        return this.forumService.toggleLock(id, locked)
    }

    // ===========================================
    // POSTS (Replies)
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("threads/:threadId/posts")
    @ApiOperation({ summary: "Get posts in a thread" })
    async getPosts(
        @Param("threadId", ParseUUIDPipe) threadId: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.forumService.getPosts(threadId, page, limit)
    }

    @Post("threads/:threadId/posts")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: "Reply to a thread" })
    async createPost(
        @Param("threadId", ParseUUIDPipe) threadId: string,
        @Body() dto: CreatePostDto,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.createPost(threadId, dto, userId)
    }

    @Delete("posts/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a post" })
    async deletePost(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.forumService.deletePost(id, userId, role)
    }

    // ===========================================
    // LIKES
    // ===========================================

    @Post("threads/:id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Like a thread" })
    async likeThread(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.toggleLike(id, userId, 'forum_thread', true)
    }

    @Delete("threads/:id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Unlike a thread" })
    async unlikeThread(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.toggleLike(id, userId, 'forum_thread', false)
    }

    @Post("posts/:id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Like a post" })
    async likePost(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.toggleLike(id, userId, 'forum_post', true)
    }

    @Delete("posts/:id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Unlike a post" })
    async unlikePost(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.forumService.toggleLike(id, userId, 'forum_post', false)
    }
}
