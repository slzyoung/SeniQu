/**
 * Reels Controller — Short-form video content API
 */

import {
    Controller, Get, Post, Delete, Body, Param, Query,
    UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Req, BadRequestException,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from "@nestjs/swagger"
import { Throttle, SkipThrottle } from "@nestjs/throttler"
import { ReelsService } from "./reels.service"
import { CreateReelCommentDto, ReshareReelDto } from "./dto/reels.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"
import { StorageService } from "../storage/storage.service"

@ApiTags("Reels")
@Controller("reels")
export class ReelsController {
    constructor(
        private readonly reelsService: ReelsService,
        private readonly storageService: StorageService,
    ) {}

    // ==========================================
    // FEED (must be before :id catch-all)
    // ==========================================

    @Public()
    @SkipThrottle()
    @Get("feed")
    @ApiOperation({ summary: "Get reels feed" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getFeed(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @GetUser("id") userId?: string,
    ) {
        return this.reelsService.getFeed(page || 1, limit || 10, userId)
    }

    // ==========================================
    // SAVED REELS (must be before :id catch-all)
    // ==========================================

    @Get("saved")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @SkipThrottle()
    @ApiOperation({ summary: "Get user's saved/bookmarked reels" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async getSavedReels(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @GetUser("id") userId?: string,
    ) {
        return this.reelsService.getSavedReels(userId!, page || 1, limit || 20)
    }

    // ==========================================
    // UPLOAD REEL
    // ==========================================

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Upload a new reel" })
    @ApiConsumes("multipart/form-data")
    async uploadReel(@Req() req: any, @GetUser("id") userId: string) {
        const data = await req.file()
        if (!data) throw new BadRequestException("No video file provided")

        const ALLOWED = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
        if (!ALLOWED.includes(data.mimetype)) {
            throw new BadRequestException(`Video type ${data.mimetype} not allowed`)
        }

        const buffer = await data.toBuffer()

        // Enforce max size 150MB
        const MAX_REEL_SIZE = 150 * 1024 * 1024
        if (buffer.length > MAX_REEL_SIZE) {
            throw new BadRequestException(`Video too large. Maximum 150MB allowed.`)
        }

        const fields = data.fields as Record<string, any>
        const caption = fields?.caption?.value || undefined
        const hashtagsRaw = fields?.hashtags?.value || "[]"
        let hashtags: string[] = []
        try { hashtags = JSON.parse(hashtagsRaw) } catch { /* ignore */ }

        // Compress video via storage pipeline (FFmpeg H.264 + AAC + faststart)
        const file = { buffer, originalname: data.filename, mimetype: data.mimetype, size: buffer.length }
        const result = await this.storageService.uploadForumVideo(file as any, userId)

        // Enforce max 60 seconds for Reels
        if (result.metadata.duration > 60) {
            throw new BadRequestException(
                `Reel too long (${Math.round(result.metadata.duration)}s). Maximum duration is 60 seconds.`
            )
        }

        // Create reel record with full metadata indexed
        const reel = await this.reelsService.createReel(userId, {
            videoUrl: result.url,
            videoKey: result.key,
            thumbnailUrl: result.thumbnailUrl,
            thumbnailKey: result.thumbnailKey,
            caption,
            hashtags,
            duration: result.metadata.duration,
            width: result.metadata.width,
            height: result.metadata.height,
            fileSize: result.metadata.compressedFileSize,
            aspectRatio: result.metadata.aspectRatio,
        })

        return reel
    }

    // ==========================================
    // SINGLE REEL
    // ==========================================

    @Public()
    @SkipThrottle()
    @Get(":id")
    @ApiOperation({ summary: "Get a reel by ID" })
    async getReel(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId?: string,
    ) {
        return this.reelsService.getReelById(id, userId)
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a reel" })
    async deleteReel(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.reelsService.deleteReel(id, userId, role)
    }

    // ==========================================
    // LIKES
    // ==========================================

    @Post(":id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Toggle like on a reel" })
    async toggleLike(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.reelsService.toggleLike(id, userId)
    }

    // ==========================================
    // COMMENTS
    // ==========================================

    @Public()
    @SkipThrottle()
    @Get(":id/comments")
    @ApiOperation({ summary: "Get reel comments" })
    async getComments(
        @Param("id", ParseUUIDPipe) id: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.reelsService.getComments(id, page, limit)
    }

    @Post(":id/comments")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: "Comment on a reel" })
    async createComment(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: CreateReelCommentDto,
        @GetUser("id") userId: string,
    ) {
        return this.reelsService.createComment(id, userId, dto.content, dto.parentId)
    }

    @Delete("comments/:commentId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteComment(
        @Param("commentId", ParseUUIDPipe) commentId: string,
        @GetUser("id") userId: string,
        @GetUser("role") role: string,
    ) {
        return this.reelsService.deleteComment(commentId, userId, role)
    }

    // ==========================================
    // RESHARE
    // ==========================================

    @Post(":id/reshare")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Reshare a reel" })
    async toggleReshare(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: ReshareReelDto,
        @GetUser("id") userId: string,
    ) {
        return this.reelsService.toggleReshare(id, userId, dto.caption)
    }

    // ==========================================
    // VIEWS
    // ==========================================

    @Post(":id/view")
    @SkipThrottle()
    @ApiOperation({ summary: "Record a reel view" })
    async recordView(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() body: { watchDuration?: number; completed?: boolean },
        @GetUser("id") userId?: string,
    ) {
        await this.reelsService.recordView(id, userId, body.watchDuration, body.completed)
        return { recorded: true }
    }
}
