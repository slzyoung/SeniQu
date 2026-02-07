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
import { Throttle } from "@nestjs/throttler"
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
    @Get("categories")
    @ApiOperation({ summary: "Get all forum categories" })
    async getCategories() {
        return this.forumService.getCategories()
    }

    // ===========================================
    // THREADS
    // ===========================================

    @Public()
    @Get("threads")
    @ApiOperation({ summary: "List forum threads" })
    @ApiQuery({ name: "category", required: false })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getThreads(
        @Query("category") category?: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.forumService.getThreads(category, page, limit)
    }

    @Public()
    @Get("threads/:slug")
    @ApiOperation({ summary: "Get thread by slug" })
    async getThread(@Param("slug") slug: string) {
        return this.forumService.getThreadBySlug(slug)
    }

    @Post("threads")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 10, ttl: 60000 } })
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
    @Throttle({ default: { limit: 20, ttl: 60000 } })
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
}
