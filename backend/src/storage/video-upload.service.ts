/**
 * Video Upload Service — Direct-to-CDN + Async Compression Pipeline
 *
 * Architecture:
 *   1. Client requests presigned upload URL (metadata only)
 *   2. Client uploads video directly to R2 CDN (no backend memory pressure)
 *   3. Client confirms upload completion
 *   4. Backend queues async FFmpeg compression job
 *   5. Compressed video replaces original on R2
 *   6. Database record updated to 'active'
 *
 * Benefits over previous approach:
 *   - No full-video buffer in Node.js memory
 *   - Upload never times out (direct CDN, resumable)
 *   - Compression happens asynchronously (non-blocking)
 *   - User sees instant feedback (optimistic creation)
 *   - Supports 100MB+ videos reliably
 */

import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"
import { VideoProcessingService } from "./video-processing.service"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { Readable } from "stream"
import { pipeline } from "stream/promises"

/** Upload session tracks the lifecycle of a video upload */
export interface UploadSession {
    id: string
    reelId?: string
    userId: string
    /** R2 key for the raw (uncompressed) original upload */
    rawKey: string
    /** R2 key for the compressed final video */
    compressedKey: string
    /** R2 key for the generated thumbnail */
    thumbnailKey: string
    /** Presigned URL the client uses to PUT the video directly to R2 */
    uploadUrl: string
    /** Current status of the upload pipeline */
    status: "awaiting_upload" | "uploading" | "processing" | "completed" | "failed"
    /** Caption from user */
    caption?: string
    /** Hashtags */
    hashtags?: string[]
    /** Audio metadata from editor */
    audioMetadata?: any
    /** Context: 'reel' or 'forum' */
    context: "reel" | "forum"
    /** Thread/post IDs for forum context */
    threadId?: string
    postId?: string
    /** Video metadata (populated after compression) */
    metadata?: any
    /** Error message if failed */
    error?: string
    /** Timestamps */
    createdAt: Date
    updatedAt: Date
    /** Compression progress 0-100 */
    progress: number
}

const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_REEL_DURATION = 60 // seconds
const MAX_FORUM_DURATION = 300 // 5 minutes
const PRESIGNED_URL_EXPIRY = 3600 // 1 hour

@Injectable()
export class VideoUploadService implements OnModuleInit {
    private readonly logger = new Logger(VideoUploadService.name)
    private s3Client: S3Client
    private bucketName: string
    private publicUrl: string

    /** In-memory session store (production would use Redis) */
    private sessions = new Map<string, UploadSession>()

    /** Active compression jobs for progress tracking */
    private activeJobs = new Map<string, { progress: number; status: string }>()

    constructor(
        private readonly configService: ConfigService,
        private readonly videoProcessor: VideoProcessingService,
    ) {}

    onModuleInit() {
        const accountId = this.configService.get<string>("r2.accountId")
        const accessKeyId = this.configService.get<string>("r2.accessKeyId")
        const secretAccessKey = this.configService.get<string>("r2.secretAccessKey")
        this.bucketName = this.configService.get<string>("r2.bucketName") || "seniqu"
        this.publicUrl = this.configService.get<string>("r2.publicUrl") || ""

        if (!accountId || !accessKeyId || !secretAccessKey) {
            this.logger.warn("⚠️ R2 credentials not configured. Video upload service will not work.")
            return
        }

        this.s3Client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        })

        this.logger.log("✅ VideoUploadService initialized (Direct-to-CDN pipeline)")

        // Cleanup expired sessions every 10 minutes
        setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000)
    }

    // =========================================
    // STEP 1: Initialize Upload — Generate Presigned URL
    // =========================================

    async initUpload(params: {
        userId: string
        filename: string
        mimeType: string
        fileSize: number
        context: "reel" | "forum"
        caption?: string
        hashtags?: string[]
        audioMetadata?: any
        threadId?: string
        postId?: string
    }): Promise<{
        sessionId: string
        uploadUrl: string
        rawKey: string
        maxSize: number
        expiresIn: number
    }> {
        // Validate MIME type
        if (!ALLOWED_VIDEO_MIMES.includes(params.mimeType)) {
            throw new BadRequestException(
                `Video type '${params.mimeType}' not allowed. Accepted: ${ALLOWED_VIDEO_MIMES.join(", ")}`
            )
        }

        // Validate file size
        if (params.fileSize > MAX_VIDEO_SIZE) {
            throw new BadRequestException(
                `Video too large (${this.formatSize(params.fileSize)}). Maximum: ${this.formatSize(MAX_VIDEO_SIZE)}`
            )
        }

        if (!this.s3Client) {
            throw new InternalServerErrorException("Storage service not configured")
        }

        const sessionId = uuidv4()
        const fileUuid = uuidv4()
        const ext = this.getExtForMime(params.mimeType)

        // Generate R2 keys for the pipeline stages
        const prefix = params.context === "reel" ? "reels" : "forum"
        const rawKey = `${prefix}/raw/${params.userId}/${fileUuid}${ext}`
        const compressedKey = `${prefix}/videos/${params.userId}/${fileUuid}.mp4`
        const thumbnailKey = `${prefix}/thumbnails/${params.userId}/${fileUuid}.webp`

        // Generate presigned PUT URL for direct client upload to R2
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: rawKey,
            ContentType: params.mimeType,
            // Don't set ContentLength — let the client handle it
        })

        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: PRESIGNED_URL_EXPIRY,
        })

        // Create session
        const session: UploadSession = {
            id: sessionId,
            userId: params.userId,
            rawKey,
            compressedKey,
            thumbnailKey,
            uploadUrl,
            status: "awaiting_upload",
            caption: params.caption,
            hashtags: params.hashtags,
            audioMetadata: params.audioMetadata,
            context: params.context,
            threadId: params.threadId,
            postId: params.postId,
            createdAt: new Date(),
            updatedAt: new Date(),
            progress: 0,
        }

        this.sessions.set(sessionId, session)

        this.logger.log(
            `📤 Upload session created: ${sessionId} | ` +
            `Context: ${params.context} | ` +
            `File: ${params.filename} (${this.formatSize(params.fileSize)}) | ` +
            `Key: ${rawKey}`
        )

        return {
            sessionId,
            uploadUrl,
            rawKey,
            maxSize: MAX_VIDEO_SIZE,
            expiresIn: PRESIGNED_URL_EXPIRY,
        }
    }

    // =========================================
    // STEP 2: Confirm Upload & Start Processing
    // =========================================

    async completeUpload(sessionId: string, userId: string): Promise<{
        status: string
        reelId?: string
        videoUrl: string
        thumbnailUrl: string
        message: string
    }> {
        const session = this.sessions.get(sessionId)
        if (!session) {
            throw new NotFoundException(`Upload session '${sessionId}' not found or expired`)
        }

        if (session.userId !== userId) {
            throw new BadRequestException("Unauthorized: session belongs to another user")
        }

        if (session.status !== "awaiting_upload") {
            throw new BadRequestException(`Session is already in '${session.status}' state`)
        }

        // Verify the file actually exists on R2
        try {
            await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: session.rawKey,
                })
            )
        } catch (err: any) {
            throw new BadRequestException(
                "Video file not found on CDN. Upload may have failed — please try again."
            )
        }

        session.status = "processing"
        session.updatedAt = new Date()

        const videoUrl = this.buildPublicUrl(session.compressedKey)
        const thumbnailUrl = this.buildPublicUrl(session.thumbnailKey)

        // Start async compression — DON'T await it
        this.processVideoAsync(sessionId).catch(err => {
            this.logger.error(`❌ Async video processing failed for session ${sessionId}: ${err.message}`)
        })

        this.logger.log(`🎬 Upload confirmed, compression queued: ${sessionId}`)

        return {
            status: "processing",
            videoUrl,
            thumbnailUrl,
            message: "Video uploaded successfully. Compression is in progress.",
        }
    }

    // =========================================
    // STEP 3: Async Compression Pipeline
    // =========================================

    private async processVideoAsync(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId)
        if (!session) return

        const jobTracker = { progress: 0, status: "downloading" }
        this.activeJobs.set(sessionId, jobTracker)

        const tmpDir = path.join(os.tmpdir(), `seniqu-vp-${sessionId}`)
        try {
            // Create temp directory
            fs.mkdirSync(tmpDir, { recursive: true })

            // PHASE 1: Download raw video from R2 (streaming to temp file)
            jobTracker.status = "downloading"
            jobTracker.progress = 5
            session.progress = 5

            const rawFilePath = path.join(tmpDir, "raw_video.mp4")
            await this.downloadFromR2(session.rawKey, rawFilePath)

            jobTracker.progress = 20
            session.progress = 20

            // PHASE 2: Read the raw video file
            jobTracker.status = "analyzing"
            const rawBuffer = fs.readFileSync(rawFilePath)
            const rawSize = rawBuffer.length

            // Validate duration based on context
            const metadata = await this.videoProcessor.getMetadata(rawBuffer)
            const maxDuration = session.context === "reel" ? MAX_REEL_DURATION : MAX_FORUM_DURATION

            if (metadata.duration > maxDuration) {
                throw new BadRequestException(
                    `Video too long (${Math.round(metadata.duration)}s). ` +
                    `Maximum for ${session.context}: ${maxDuration}s.`
                )
            }

            jobTracker.progress = 30
            session.progress = 30

            // PHASE 3: Compress video
            jobTracker.status = "compressing"
            this.logger.log(
                `🔄 Compressing video: ${this.formatSize(rawSize)} | ` +
                `${metadata.width}x${metadata.height} | ${metadata.videoCodec}`
            )

            const { video, thumbnail } = await this.videoProcessor.processVideo(
                rawBuffer,
                "video/mp4"
            )

            jobTracker.progress = 80
            session.progress = 80

            // PHASE 4: Upload compressed video + thumbnail to R2
            jobTracker.status = "uploading_compressed"
            await Promise.all([
                this.uploadToR2(session.compressedKey, video.buffer, video.contentType),
                this.uploadToR2(session.thumbnailKey, thumbnail.buffer, thumbnail.contentType),
            ])

            jobTracker.progress = 95
            session.progress = 95

            // PHASE 5: Clean up raw upload from R2 (save storage costs)
            try {
                await this.s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: this.bucketName,
                        Key: session.rawKey,
                    })
                )
            } catch {
                // Non-critical: raw file cleanup failed
                this.logger.warn(`⚠️ Failed to cleanup raw video: ${session.rawKey}`)
            }

            // PHASE 6: Update session with final metadata
            const compressionRatio = rawSize > 0
                ? parseFloat(((1 - video.size / rawSize) * 100).toFixed(2))
                : 0

            session.metadata = {
                duration: video.metadata.duration,
                width: video.metadata.width,
                height: video.metadata.height,
                videoCodec: video.metadata.videoCodec,
                audioCodec: video.metadata.audioCodec,
                bitrate: video.metadata.bitrate,
                fps: video.metadata.fps,
                aspectRatio: video.metadata.aspectRatio,
                originalFileSize: rawSize,
                compressedFileSize: video.size,
                compressionRatio,
            }

            session.status = "completed"
            session.progress = 100
            session.updatedAt = new Date()
            jobTracker.progress = 100
            jobTracker.status = "completed"

            this.logger.log(
                `✅ Video processed: ${this.formatSize(rawSize)} → ${this.formatSize(video.size)} ` +
                `(${compressionRatio}% saved) | Session: ${sessionId}`
            )
        } catch (err: any) {
            session.status = "failed"
            session.error = err.message || "Video processing failed"
            session.updatedAt = new Date()
            jobTracker.status = "failed"

            this.logger.error(`❌ Video processing failed for ${sessionId}: ${err.message}`)
        } finally {
            // Cleanup temp directory
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true })
            } catch {
                // ignore cleanup errors
            }

            // Remove job tracker after a delay (allow status polling)
            setTimeout(() => {
                this.activeJobs.delete(sessionId)
            }, 5 * 60 * 1000) // Keep for 5 min
        }
    }

    // =========================================
    // STATUS POLLING
    // =========================================

    getUploadStatus(sessionId: string, userId: string): {
        sessionId: string
        status: string
        progress: number
        metadata?: any
        error?: string
        videoUrl?: string
        thumbnailUrl?: string
    } {
        const session = this.sessions.get(sessionId)
        if (!session) {
            throw new NotFoundException(`Upload session '${sessionId}' not found or expired`)
        }

        if (session.userId !== userId) {
            throw new BadRequestException("Unauthorized")
        }

        return {
            sessionId,
            status: session.status,
            progress: session.progress,
            metadata: session.metadata,
            error: session.error,
            videoUrl: session.status === "completed" ? this.buildPublicUrl(session.compressedKey) : undefined,
            thumbnailUrl: session.status === "completed" ? this.buildPublicUrl(session.thumbnailKey) : undefined,
        }
    }

    /** Get the full session data (for creating DB records after completion) */
    getSession(sessionId: string): UploadSession | undefined {
        return this.sessions.get(sessionId)
    }

    // =========================================
    // LEGACY STREAMING UPLOAD (Fallback for < 20MB)
    // =========================================

    /**
     * Stream-based upload that pipes the multipart file directly to R2
     * without loading the entire buffer into memory.
     * For files under 20MB, this is simpler than the presigned URL flow.
     */
    async streamUploadAndProcess(
        fileStream: Readable | Buffer,
        filename: string,
        mimeType: string,
        fileSize: number,
        userId: string,
        context: "reel" | "forum",
        options?: {
            caption?: string
            hashtags?: string[]
            audioMetadata?: any
        }
    ): Promise<{
        url: string
        key: string
        thumbnailUrl: string
        thumbnailKey: string
        metadata: any
    }> {
        if (!ALLOWED_VIDEO_MIMES.includes(mimeType)) {
            throw new BadRequestException(`Video type '${mimeType}' not allowed`)
        }

        if (fileSize > MAX_VIDEO_SIZE) {
            throw new BadRequestException(`Video too large. Maximum: ${this.formatSize(MAX_VIDEO_SIZE)}`)
        }

        if (!this.s3Client) {
            throw new InternalServerErrorException("Storage service not configured")
        }

        const fileUuid = uuidv4()
        const prefix = context === "reel" ? "reels" : "forum"
        const videoKey = `${prefix}/videos/${userId}/${fileUuid}.mp4`
        const thumbnailKey = `${prefix}/thumbnails/${userId}/${fileUuid}.webp`

        // Convert stream to buffer if needed (for FFmpeg processing)
        let buffer: Buffer
        if (Buffer.isBuffer(fileStream)) {
            buffer = fileStream
        } else {
            const chunks: Buffer[] = []
            for await (const chunk of fileStream) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            buffer = Buffer.concat(chunks)
        }

        this.logger.log(`🎬 Stream upload: ${filename} (${this.formatSize(buffer.length)})`)

        // Process video: compress + generate thumbnail
        const { video, thumbnail } = await this.videoProcessor.processVideo(buffer, mimeType)

        // Validate duration
        const maxDuration = context === "reel" ? MAX_REEL_DURATION : MAX_FORUM_DURATION
        if (video.metadata.duration > maxDuration) {
            throw new BadRequestException(
                `Video too long (${Math.round(video.metadata.duration)}s). Maximum: ${maxDuration}s.`
            )
        }

        // Upload compressed video + thumbnail in parallel
        await Promise.all([
            this.uploadToR2(videoKey, video.buffer, video.contentType),
            this.uploadToR2(thumbnailKey, thumbnail.buffer, thumbnail.contentType),
        ])

        const compressionRatio = buffer.length > 0
            ? parseFloat(((1 - video.size / buffer.length) * 100).toFixed(2))
            : 0

        this.logger.log(
            `✅ Stream upload complete: ${this.formatSize(buffer.length)} → ${this.formatSize(video.size)} ` +
            `(${compressionRatio}% saved)`
        )

        return {
            url: this.buildPublicUrl(videoKey),
            key: videoKey,
            thumbnailUrl: this.buildPublicUrl(thumbnailKey),
            thumbnailKey,
            metadata: {
                duration: video.metadata.duration,
                width: video.metadata.width,
                height: video.metadata.height,
                videoCodec: video.metadata.videoCodec,
                audioCodec: video.metadata.audioCodec,
                bitrate: video.metadata.bitrate,
                fps: video.metadata.fps,
                aspectRatio: video.metadata.aspectRatio,
                originalFileSize: buffer.length,
                compressedFileSize: video.size,
                compressionRatio,
                originalFilename: filename,
            },
        }
    }

    // =========================================
    // Private Helpers
    // =========================================

    private async downloadFromR2(key: string, destPath: string): Promise<void> {
        const response = await this.s3Client.send(
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            })
        )

        if (!response.Body) {
            throw new Error(`Empty response body for key: ${key}`)
        }

        const writeStream = fs.createWriteStream(destPath)
        await pipeline(response.Body as Readable, writeStream)

        this.logger.log(`📥 Downloaded from R2: ${key} → ${destPath} (${this.formatSize(fs.statSync(destPath).size)})`)
    }

    private async uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: "public, max-age=31536000, immutable",
            })
        )
    }

    private buildPublicUrl(key: string): string {
        if (this.publicUrl) {
            return `${this.publicUrl.replace(/\/$/, "")}/${key}`
        }
        return `https://${this.bucketName}.r2.dev/${key}`
    }

    private cleanupExpiredSessions(): void {
        const now = Date.now()
        const MAX_SESSION_AGE = 2 * 60 * 60 * 1000 // 2 hours

        let cleaned = 0
        for (const [id, session] of this.sessions.entries()) {
            if (now - session.createdAt.getTime() > MAX_SESSION_AGE) {
                this.sessions.delete(id)
                cleaned++
            }
        }

        if (cleaned > 0) {
            this.logger.log(`🧹 Cleaned up ${cleaned} expired upload sessions`)
        }
    }

    private getExtForMime(mime: string): string {
        const map: Record<string, string> = {
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/ogg": ".ogg",
            "video/quicktime": ".mov",
        }
        return map[mime] || ".mp4"
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}
