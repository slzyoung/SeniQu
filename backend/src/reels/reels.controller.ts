/**
 * Reels Controller — Short-form video content API
 *
 * Upload Architecture (v2 — Direct-to-CDN):
 *   1. POST /upload/init     → Get presigned R2 URL + session ID
 *   2. Client PUTs video directly to R2 CDN (no backend memory)
 *   3. POST /upload/complete → Confirm + start async compression
 *   4. GET  /upload/status   → Poll compression progress
 *
 * Legacy fallback:
 *   POST /upload → Multipart streaming for files < 30MB
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
import { BypassSecurity } from "../common/decorators/bypass-security.decorator"
import { StorageService } from "../storage/storage.service"
import { VideoUploadService } from "../storage/video-upload.service"

@ApiTags("Reels")
@Controller("reels")
export class ReelsController {
    constructor(
        private readonly reelsService: ReelsService,
        private readonly storageService: StorageService,
        private readonly videoUploadService: VideoUploadService,
    ) {}

    // ==========================================
    // FEED (must be before :id catch-all)
    // ==========================================

    @Public()
    @UseGuards(JwtAuthGuard)
    @SkipThrottle()
    @Get("feed")
    @ApiOperation({ summary: "Get reels feed" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiQuery({ name: "creatorId", required: false })
    async getFeed(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("creatorId") creatorId?: string,
        @GetUser("id") userId?: string,
    ) {
        return this.reelsService.getFeed(page || 1, limit || 10, userId, creatorId)
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
    // UPLOAD v2 — Direct-to-CDN (Presigned URL)
    // ==========================================

    /**
     * STEP 1: Initialize upload session — returns presigned R2 PUT URL
     * Client sends only metadata (no video data), gets back a URL to upload directly to CDN.
     */
    @Post("upload/init")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: "Initialize reel upload — get presigned CDN URL" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "Original filename" },
                mimeType: { type: "string", description: "Video MIME type (video/mp4, etc.)" },
                fileSize: { type: "number", description: "File size in bytes" },
                caption: { type: "string", description: "Reel caption" },
                hashtags: { type: "array", items: { type: "string" } },
                audioMetadata: { type: "object" },
            },
            required: ["filename", "mimeType", "fileSize"],
        },
    })
    async initUpload(
        @Body() body: {
            filename: string
            mimeType: string
            fileSize: number
            caption?: string
            hashtags?: string[]
            audioMetadata?: any
        },
        @GetUser("id") userId: string,
    ) {
        return this.videoUploadService.initUpload({
            userId,
            filename: body.filename,
            mimeType: body.mimeType,
            fileSize: body.fileSize,
            context: "reel",
            caption: body.caption,
            hashtags: body.hashtags,
            audioMetadata: body.audioMetadata,
        })
    }

    /**
     * STEP 2: Confirm upload completed — triggers async compression pipeline
     * Client calls this after successfully PUTting the video to the presigned R2 URL.
     */
    @Post("upload/complete")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Confirm reel upload + start compression" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                sessionId: { type: "string", description: "Upload session ID from init" },
            },
            required: ["sessionId"],
        },
    })
    async completeUpload(
        @Body() body: { sessionId: string },
        @GetUser("id") userId: string,
    ) {
        const result = await this.videoUploadService.completeUpload(body.sessionId, userId)

        // Get session data
        const session = this.videoUploadService.getSession(body.sessionId)

        // Create a 'processing' reel record immediately so the user sees it in their feed
        if (session) {
            const reel = await this.reelsService.createReel(userId, {
                videoUrl: result.videoUrl,
                videoKey: session.compressedKey,
                thumbnailUrl: result.thumbnailUrl,
                thumbnailKey: session.thumbnailKey,
                caption: session.caption,
                hashtags: session.hashtags,
                duration: 0, // Will be updated after compression
                width: 0,
                height: 0,
                fileSize: 0,
                aspectRatio: "9:16",
                audioMetadata: session.audioMetadata,
            })

            // Store reelId in session for status updates
            session.reelId = reel.id

            return { ...result, reelId: reel.id, reel }
        }

        return result
    }

    /**
     * STEP 3: Poll upload/compression status
     */
    @Get("upload/status/:sessionId")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @SkipThrottle()
    @ApiOperation({ summary: "Get upload/compression progress" })
    async getUploadStatus(
        @Param("sessionId") sessionId: string,
        @GetUser("id") userId: string,
    ) {
        const status = this.videoUploadService.getUploadStatus(sessionId, userId)

        // If compression is completed, update the reel record with final metadata
        if (status.status === "completed" && status.metadata) {
            const session = this.videoUploadService.getSession(sessionId)
            if (session?.reelId) {
                // Update reel metadata in database
                await this.reelsService.updateReelMetadata(session.reelId, {
                    duration: status.metadata.duration,
                    width: status.metadata.width,
                    height: status.metadata.height,
                    fileSize: status.metadata.compressedFileSize,
                    aspectRatio: status.metadata.aspectRatio,
                })
            }
        }

        return status
    }

    // ==========================================
    // UPLOAD LEGACY — Multipart Streaming (Fallback)
    // ==========================================

    /**
     * Legacy upload endpoint. Streams video through backend.
     * Still works for all file sizes but uses the new streaming service.
     */
    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Upload a new reel (legacy multipart)" })
    @ApiConsumes("multipart/form-data")
    async uploadReel(@Req() req: any, @GetUser("id") userId: string) {
        const data = await req.file()
        if (!data) throw new BadRequestException("No video file provided")

        const ALLOWED = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
        if (!ALLOWED.includes(data.mimetype)) {
            throw new BadRequestException(`Video type ${data.mimetype} not allowed`)
        }

        // Helper to extract fields dynamically
        const getFields = () => {
            const fields = data.fields as Record<string, any>
            const caption = fields?.caption?.value || undefined
            const hashtagsRaw = fields?.hashtags?.value || "[]"
            let hashtags: string[] = []
            try { hashtags = JSON.parse(hashtagsRaw) } catch { /* ignore */ }

            const audioMetadataRaw = fields?.audioMetadata?.value || "{}"
            let audioMetadata: any = {}
            try { audioMetadata = JSON.parse(audioMetadataRaw) } catch { /* ignore */ }
            return { caption, hashtags, audioMetadata }
        }

        // Extract initial fields (available if sent before file in multipart form)
        const initialFields = getFields()

        // Use the new streaming upload service directly with data.file stream
        const result = await this.videoUploadService.streamUploadAndProcess(
            data.file,
            data.filename,
            data.mimetype,
            0, // fileSize checked after stream is written to temp file
            userId,
            "reel",
            { 
                caption: initialFields.caption, 
                hashtags: initialFields.hashtags, 
                audioMetadata: initialFields.audioMetadata 
            },
        )

        // Read fields again (fully populated now that the stream has been consumed)
        const finalFields = getFields()
        const caption = finalFields.caption || initialFields.caption
        const hashtags = finalFields.hashtags.length > 0 ? finalFields.hashtags : initialFields.hashtags
        const audioMetadata = (finalFields.audioMetadata && Object.keys(finalFields.audioMetadata).length > 2) 
            ? finalFields.audioMetadata 
            : initialFields.audioMetadata

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
            audioMetadata,
        })

        return reel
    }

    // ==========================================
    // SINGLE REEL
    // ==========================================

    @Public()
    @UseGuards(JwtAuthGuard)
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
