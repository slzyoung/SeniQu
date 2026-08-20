/**
 * Forum Controller - Community threads, posts, and video content
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
    Req,
    BadRequestException,
    Header,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from "@nestjs/swagger"
import { Throttle, SkipThrottle } from "@nestjs/throttler"
import { ForumService } from "./forum.service"
import { CreateThreadDto } from "./dto/create-thread.dto"
import { UpdateThreadDto } from "./dto/update-thread.dto"
import { CreatePostDto } from "./dto/create-post.dto"
import { UpdatePostDto } from "./dto/update-post.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"
import { BypassSecurity } from "../common/decorators/bypass-security.decorator"
import { StorageService } from "../storage/storage.service"
import { VideoUploadService } from "../storage/video-upload.service"

@ApiTags("Forum")
@Controller("forum")
export class ForumController {
    constructor(
        private readonly forumService: ForumService,
        private readonly storageService: StorageService,
        private readonly videoUploadService: VideoUploadService,
    ) { }

    // ===========================================
    // CATEGORIES (Public)
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("categories")
    @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
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
    @Header("Cache-Control", "public, max-age=15, stale-while-revalidate=60")
    @ApiOperation({ summary: "Get trending threads" })
    @ApiQuery({ name: "limit", required: false, type: Number })
    async getTrending(@Query("limit") limit?: number) {
        return this.forumService.getTrending(limit || 10)
    }

    @Public()
    @SkipThrottle()
    @Get("featured")
    @Header("Cache-Control", "public, max-age=15, stale-while-revalidate=60")
    @ApiOperation({ summary: "Get featured threads" })
    async getFeatured() {
        return this.forumService.getFeatured()
    }

    // ===========================================
    // VIDEO UPLOAD (must be before :idOrSlug catch-all)
    // ===========================================

    /**
     * Direct-to-CDN: Initialize forum video upload
     */
    @Post("video/upload/init")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: "Initialize forum video upload — get presigned CDN URL" })
    async initVideoUpload(
        @Body() body: {
            filename: string
            mimeType: string
            fileSize: number
            threadId?: string
            postId?: string
            caption?: string
            mute?: boolean
        },
        @GetUser("id") userId: string,
    ) {
        return this.videoUploadService.initUpload({
            userId,
            filename: body.filename,
            mimeType: body.mimeType,
            fileSize: body.fileSize,
            context: "forum",
            threadId: body.threadId,
            postId: body.postId,
            caption: body.caption,
            audioMetadata: body.mute ? { mute: true, originalVolume: 0 } : undefined
        })
    }

    /**
     * Direct-to-CDN: Confirm forum video upload + start compression
     */
    @Post("video/upload/complete")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Confirm forum video upload + start compression" })
    async completeVideoUpload(
        @Body() body: { sessionId: string },
        @GetUser("id") userId: string,
    ) {
        const result = await this.videoUploadService.completeUpload(body.sessionId, userId)
        const session = this.videoUploadService.getSession(body.sessionId)

        if (session) {
            const videoRecord = await this.forumService.saveVideoMetadata({
                userId,
                threadId: session.threadId,
                postId: session.postId,
                videoUrl: result.videoUrl,
                videoKey: session.compressedKey,
                thumbnailUrl: result.thumbnailUrl || null,
                thumbnailKey: session.thumbnailKey || null,
                caption: session.caption,
                metadata: session.metadata || {},
            })

            return { ...result, videoId: videoRecord?.id }
        }

        return result
    }

    /**
     * Direct-to-CDN: Poll forum video status
     */
    @Get("video/upload/status/:sessionId")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @SkipThrottle()
    @ApiOperation({ summary: "Get forum video upload/compression progress" })
    async getVideoUploadStatus(
        @Param("sessionId") sessionId: string,
        @GetUser("id") userId: string,
    ) {
        return this.videoUploadService.getUploadStatus(sessionId, userId)
    }

    /**
     * Legacy: Multipart upload (streaming — works for all sizes)
     */
    @Post("video/upload")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Upload and compress a forum video (legacy multipart)" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary", description: "Video file (MP4, WebM, MOV, OGG)" },
                threadId: { type: "string", description: "Optional thread ID to attach video to" },
                postId: { type: "string", description: "Optional post ID to attach video to" },
                caption: { type: "string", description: "Optional video caption" },
            },
            required: ["file"],
        },
    })
    async uploadVideo(
        @Req() req: any,
        @GetUser("id") userId: string,
    ) {
        // Parse multipart form data
        const data = await req.file()
        if (!data) {
            throw new BadRequestException("No video file provided")
        }

        // Validate MIME type
        const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
        if (!ALLOWED_VIDEO_MIMES.includes(data.mimetype)) {
            throw new BadRequestException(
                `Video type ${data.mimetype} is not allowed. Accepted: ${ALLOWED_VIDEO_MIMES.join(", ")}`
            )
        }

        // Helper to extract fields dynamically
        const getFields = () => {
            const fields = data.fields as Record<string, any>
            const threadId = fields?.threadId?.value || undefined
            const postId = fields?.postId?.value || undefined
            const caption = fields?.caption?.value || undefined
            const muteVal = fields?.mute?.value === 'true' || fields?.mute?.value === true
            return { threadId, postId, caption, muteVal }
        }

        // Extract initial fields (available if sent before file in multipart form)
        const initialFields = getFields()

        // Upload & compress video through new streaming service using data.file stream
        const result = await this.videoUploadService.streamUploadAndProcess(
            data.file,
            data.filename,
            data.mimetype,
            0, // fileSize checked after stream is written to temp file
            userId,
            "forum",
            { 
                caption: initialFields.caption,
                audioMetadata: initialFields.muteVal ? { mute: true, originalVolume: 0 } : undefined
            },
        )

        // Read fields again (fully populated now that the stream has been consumed)
        const finalFields = getFields()
        const threadId = finalFields.threadId || initialFields.threadId
        const postId = finalFields.postId || initialFields.postId
        const caption = finalFields.caption || initialFields.caption

        // Save metadata to database
        const videoRecord = await this.forumService.saveVideoMetadata({
            userId,
            threadId,
            postId,
            videoUrl: result.url,
            videoKey: result.key,
            thumbnailUrl: result.thumbnailUrl || null,
            thumbnailKey: result.thumbnailKey || null,
            caption,
            metadata: result.metadata,
        })

        return {
            ...result,
            videoId: videoRecord?.id,
        }
    }

    // ===========================================
    // THREADS
    // ===========================================

    @Public()
    @SkipThrottle()
    @Get("threads")
    @Header("Cache-Control", "public, max-age=5, stale-while-revalidate=20")
    @ApiOperation({ summary: "List forum threads" })
    @ApiQuery({ name: "categoryId", required: false })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiQuery({ name: "sortBy", required: false })
    @ApiQuery({ name: "authorId", required: false })
    async getThreads(
        @Query("categoryId") categoryId?: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("sortBy") sortBy?: "latest" | "popular" | "views",
        @Query("authorId") authorId?: string,
    ) {
        return this.forumService.getThreads(categoryId, page, limit, sortBy, authorId)
    }

    @Public()
    @SkipThrottle()
    @Get("threads/:idOrSlug")
    @Header("Cache-Control", "public, max-age=5, stale-while-revalidate=20")
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

    @Put("threads/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update a thread" })
    async updateThread(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateThreadDto,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.forumService.updateThread(id, dto, userId, role)
    }

    @Delete("threads/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a thread" })
    async deleteThread(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.forumService.deleteThread(id, userId, role)
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
    @Header("Cache-Control", "public, max-age=3, stale-while-revalidate=15")
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

    @Put("posts/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update a post" })
    async updatePost(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdatePostDto,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.forumService.updatePost(id, dto, userId, role)
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
