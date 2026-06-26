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

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { moderateContent } from "../common/utils/moderation.util"
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
    CopyObjectCommand,
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
    /** original video MIME type */
    mimeType?: string
}

const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_REEL_DURATION = 60 // seconds
const MAX_FORUM_DURATION = 60 // 1 minute
const PRESIGNED_URL_EXPIRY = 3600 // 1 hour

@Injectable()
export class VideoUploadService implements OnModuleInit {
    private readonly logger = new Logger(VideoUploadService.name)
    private s3Client: S3Client
    private bucketName: string
    private publicUrl: string
    private supabase: SupabaseClient

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

        // Initialize Supabase Client
        const supabaseUrl = this.configService.get<string>("SUPABASE_URL") || ""
        const supabaseServiceKey = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY") || ""
        this.supabase = createClient(supabaseUrl, supabaseServiceKey)

        if (!accountId || !accessKeyId || !secretAccessKey) {
            this.logger.warn("⚠️ R2 credentials not configured. Video upload service will not work.")
            return
        }

        this.s3Client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
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
            signableHeaders: new Set(["host"]),
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
            mimeType: params.mimeType,
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
        // Track all temp files for guaranteed cleanup
        const tempFiles: string[] = []

        try {
            // Create temp directory
            fs.mkdirSync(tmpDir, { recursive: true })

            // PHASE 1: Download raw video from R2 (streaming to temp file — NO buffer)
            jobTracker.status = "downloading"
            jobTracker.progress = 5
            session.progress = 5

            const rawFilePath = path.join(tmpDir, "raw_video.mp4")
            await this.downloadFromR2(session.rawKey, rawFilePath)
            tempFiles.push(rawFilePath)

            const rawSize = fs.statSync(rawFilePath).size
            jobTracker.progress = 20
            session.progress = 20

            // PHASE 2: Analyze metadata directly from file (NO buffer loading)
            jobTracker.status = "analyzing"
            const metadata = await this.videoProcessor.getMetadataFromFile(rawFilePath)
            const maxDuration = session.context === "reel" ? MAX_REEL_DURATION : MAX_FORUM_DURATION

            if (metadata.duration > maxDuration) {
                throw new BadRequestException(
                    `Video too long (${Math.round(metadata.duration)}s). ` +
                    `Maximum for ${session.context}: ${maxDuration}s.`
                )
            }

            jobTracker.progress = 30
            session.progress = 30

            // PHASE 3: Process video (Compress or direct passthrough if > 10MB)
            let video: any;
            let thumbnail: any;
            const isLargeVideo = rawSize > 10 * 1024 * 1024; // 10MB threshold

            if (isLargeVideo) {
                this.logger.log(
                    `ℹ️ Video is large (${this.formatSize(rawSize)}), bypassing compression to conserve server resources.`
                )
                jobTracker.status = "copying_cdn"
                
                // Copy the raw file to the compressedKey path on R2 directly (extremely fast, zero server memory)
                await this.s3Client.send(
                    new CopyObjectCommand({
                        Bucket: this.bucketName,
                        CopySource: `${this.bucketName}/${encodeURIComponent(session.rawKey)}`,
                        Key: session.compressedKey,
                        ContentType: session.mimeType || "video/mp4",
                        MetadataDirective: "REPLACE",
                    })
                )

                // Generate thumbnail from raw downloaded file
                const generatedThumb = await this.videoProcessor.generateThumbnailFromFile(rawFilePath)
                tempFiles.push(generatedThumb.thumbnailPath)

                thumbnail = generatedThumb
                video = {
                    videoPath: rawFilePath,
                    contentType: session.mimeType || "video/mp4",
                    size: rawSize,
                    metadata,
                }
            } else {
                // PHASE 3: Compress video — FILE-PATH based (zero buffer memory)
                jobTracker.status = "compressing"
                this.logger.log(
                    `🔄 Compressing video: ${this.formatSize(rawSize)} | ` +
                    `${metadata.width}x${metadata.height} | ${metadata.videoCodec}`
                )

                const audioMeta = session.audioMetadata || {}
                const isMuted = audioMeta.originalVolume === 0 || audioMeta.mute === true

                const processed = await this.videoProcessor.processVideoFromFile(
                    rawFilePath,
                    "video/mp4",
                    isMuted
                )
                tempFiles.push(processed.video.videoPath, processed.thumbnail.thumbnailPath)

                video = processed.video
                thumbnail = processed.thumbnail
            }

            // PHASE 3.5: Moderate Thumbnail (thumbnail buffer is tiny ~50KB, safe for memory)
            jobTracker.status = "moderating"
            this.logger.log(`🔍 Moderating video thumbnail for session ${sessionId}...`)
            const geminiApiKey = this.configService.get<string>("ai.geminiApiKey") || ""
            const moderation = await moderateContent(
                thumbnail.buffer,
                thumbnail.contentType,
                geminiApiKey,
                this.logger
            )

            if (!moderation.isAppropriate) {
                this.logger.warn(`🚫 Video blocked by content moderation: ${moderation.reason} | Session: ${sessionId}`)
                
                // If it is a reel, set status to 'deleted'
                if (session.context === "reel" && session.reelId) {
                    this.logger.log(`🗑️ Hiding inappropriate reel in database: ${session.reelId}`)
                    await this.supabase
                        .from("reels")
                        .update({ status: "deleted" })
                        .eq("id", session.reelId)
                }

                // If it is a forum video, clean up thread/post video fields
                if (session.context === "forum") {
                    if (session.threadId) {
                        this.logger.log(`🗑️ Removing video fields from thread in database: ${session.threadId}`)
                        await this.supabase
                            .from("forum_threads")
                            .update({
                                video_url: null,
                                video_thumbnail_url: null,
                                video_duration: null,
                                media_url: null,
                                media_type: null,
                            })
                            .eq("id", session.threadId)
                    }
                    if (session.postId) {
                        this.logger.log(`🗑️ Removing video fields from post in database: ${session.postId}`)
                        await this.supabase
                            .from("forum_posts")
                            .update({
                                video_url: null,
                                video_thumbnail_url: null,
                                video_duration: null,
                                media_url: null,
                                media_type: null,
                            })
                            .eq("id", session.postId)
                    }

                    // Delete forum_videos record
                    await this.supabase
                        .from("forum_videos")
                        .delete()
                        .eq("video_key", session.compressedKey)
                }

                throw new BadRequestException(
                    `Video terdeteksi mengandung konten tidak pantas (SARA, pornografi, kekerasan). Alasan: ${moderation.reason}`
                )
            }

            jobTracker.progress = 80
            session.progress = 80

            // PHASE 4: Upload compressed video (streaming from disk) + thumbnail to R2
            jobTracker.status = "uploading_compressed"
            if (isLargeVideo) {
                // Video is already copied on R2, only upload the generated thumbnail
                await this.uploadToR2(session.thumbnailKey, thumbnail.buffer, thumbnail.contentType)
            } else {
                await Promise.all([
                    this.uploadFileToR2(session.compressedKey, video.videoPath, video.contentType),
                    this.uploadToR2(session.thumbnailKey, thumbnail.buffer, thumbnail.contentType),
                ])
            }

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
            // Cleanup all temp files individually
            for (const f of tempFiles) {
                this.videoProcessor.cleanupTempFile(f)
            }
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

    /**
     * File-based upload that writes the multipart stream to disk first,
     * then processes entirely via file paths — zero large-buffer memory pressure.
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

        if (fileSize > 0 && fileSize > MAX_VIDEO_SIZE) {
            throw new BadRequestException(`Video too large. Maximum: ${this.formatSize(MAX_VIDEO_SIZE)}`)
        }

        if (!this.s3Client) {
            throw new InternalServerErrorException("Storage service not configured")
        }

        const fileUuid = uuidv4()
        const prefix = context === "reel" ? "reels" : "forum"
        const videoKey = `${prefix}/videos/${userId}/${fileUuid}.mp4`
        const thumbnailKey = `${prefix}/thumbnails/${userId}/${fileUuid}.webp`

        // Write stream/buffer to temp file FIRST — never hold full video in memory
        const ext = this.videoProcessor.getExtForMime(mimeType)
        const tmpInputPath = path.join(os.tmpdir(), `seniqu-stream-${uuidv4()}${ext}`)
        const tempFiles: string[] = [tmpInputPath]

        try {
            if (Buffer.isBuffer(fileStream)) {
                fs.writeFileSync(tmpInputPath, fileStream)
                // Release buffer reference immediately
            } else {
                const writeStream = fs.createWriteStream(tmpInputPath)
                await pipeline(fileStream, writeStream)
            }

            const actualSize = fs.statSync(tmpInputPath).size
            if (actualSize > MAX_VIDEO_SIZE) {
                throw new BadRequestException(
                    `Video too large (${this.videoProcessor.formatSize(actualSize)}). Maximum: ${this.videoProcessor.formatSize(MAX_VIDEO_SIZE)}`
                )
            }

            this.logger.log(`🎬 Stream upload: ${filename} (${this.videoProcessor.formatSize(actualSize)})`)

            const audioMeta = options?.audioMetadata || {}
            const isMuted = audioMeta.originalVolume === 0 || audioMeta.mute === true

            // Process video (Compress or direct passthrough if > 10MB)
            let video: any;
            let thumbnail: any;
            const isLargeVideo = actualSize > 10 * 1024 * 1024; // 10MB threshold

            if (isLargeVideo) {
                this.logger.log(
                    `ℹ️ Stream video is large (${this.videoProcessor.formatSize(actualSize)}), bypassing compression to conserve server resources.`
                )
                
                // Analyze metadata from raw file
                const metadata = await this.videoProcessor.getMetadataFromFile(tmpInputPath)

                // Generate thumbnail from raw file
                const generatedThumb = await this.videoProcessor.generateThumbnailFromFile(tmpInputPath)
                tempFiles.push(generatedThumb.thumbnailPath)

                thumbnail = generatedThumb
                video = {
                    videoPath: tmpInputPath,
                    contentType: mimeType,
                    size: actualSize,
                    metadata,
                }
            } else {
                // Process video from file path — NO buffer in memory
                const processed = await this.videoProcessor.processVideoFromFile(tmpInputPath, mimeType, isMuted)
                tempFiles.push(processed.video.videoPath, processed.thumbnail.thumbnailPath)
                video = processed.video
                thumbnail = processed.thumbnail
            }

            // Moderate Thumbnail (thumbnail buffer is tiny ~50KB)
            this.logger.log(`🔍 Moderating stream video thumbnail for user ${userId}...`)
            const geminiApiKey = this.configService.get<string>("ai.geminiApiKey") || ""
            const moderation = await moderateContent(
                thumbnail.buffer,
                thumbnail.contentType,
                geminiApiKey,
                this.logger
            )

            if (!moderation.isAppropriate) {
                this.logger.warn(`🚫 Stream video blocked by content moderation: ${moderation.reason}`)
                throw new BadRequestException(
                    `Video terdeteksi mengandung konten tidak pantas (SARA, pornografi, kekerasan). Alasan: ${moderation.reason}`
                )
            }

            // Validate duration
            const maxDuration = context === "reel" ? MAX_REEL_DURATION : MAX_FORUM_DURATION
            if (video.metadata.duration > maxDuration) {
                throw new BadRequestException(
                    `Video too long (${Math.round(video.metadata.duration)}s). Maximum: ${maxDuration}s.`
                )
            }

            // Upload video (streaming from file) + thumbnail in parallel
            await Promise.all([
                this.uploadFileToR2(videoKey, video.videoPath, video.contentType),
                this.uploadToR2(thumbnailKey, thumbnail.buffer, thumbnail.contentType),
            ])

            const compressionRatio = actualSize > 0
                ? parseFloat(((1 - video.size / actualSize) * 100).toFixed(2))
                : 0

            this.logger.log(
                `✅ Stream upload complete: ${this.videoProcessor.formatSize(actualSize)} → ${this.videoProcessor.formatSize(video.size)} ` +
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
                    originalFileSize: actualSize,
                    compressedFileSize: video.size,
                    compressionRatio,
                    originalFilename: filename,
                },
            }
        } finally {
            // Guaranteed cleanup of ALL temp files
            for (const f of tempFiles) {
                this.videoProcessor.cleanupTempFile(f)
            }
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

    /**
     * Upload a file from disk to R2 via streaming — avoids loading into memory.
     * Critical for large compressed videos (50-100MB+).
     */
    private async uploadFileToR2(key: string, filePath: string, contentType: string): Promise<void> {
        const fileSize = fs.statSync(filePath).size
        const readStream = fs.createReadStream(filePath)

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: readStream,
                ContentType: contentType,
                ContentLength: fileSize,
                CacheControl: "public, max-age=31536000, immutable",
            })
        )

        this.logger.log(`📤 Uploaded to R2 (streamed): ${key} (${this.formatSize(fileSize)})`)
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
