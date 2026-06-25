import { moderateContent } from "../common/utils/moderation.util"
import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
    OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"
import { UploadResult, ForumVideoUploadResult } from "./dto/upload-file.dto"
import { ImageProcessingService } from "./image-processing.service"
import { VideoProcessingService } from "./video-processing.service"

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/avif",
]

const ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
]

const ALLOWED_AUDIO_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/x-m4a",
    "audio/mp4",
]

const ALLOWED_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_AUDIO_TYPES,
    "application/pdf",
]

// Max file sizes
const MAX_IMAGE_SIZE = 15 * 1024 * 1024  // 15 MB
const MAX_VIDEO_SIZE = 150 * 1024 * 1024 // 150 MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024  // 50 MB
const MAX_GENERAL_SIZE = 25 * 1024 * 1024 // 25 MB

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name)
    private s3Client: S3Client
    private bucketName: string
    private publicUrl: string

    constructor(
        private readonly configService: ConfigService,
        private readonly imageProcessor: ImageProcessingService,
        private readonly videoProcessor: VideoProcessingService,
    ) {}

    onModuleInit() {
        const accountId = this.configService.get<string>("r2.accountId")
        const accessKeyId = this.configService.get<string>("r2.accessKeyId")
        const secretAccessKey = this.configService.get<string>("r2.secretAccessKey")
        this.bucketName = this.configService.get<string>("r2.bucketName") || "seniqu"
        this.publicUrl = this.configService.get<string>("r2.publicUrl") || ""

        if (!accountId || !accessKeyId || !secretAccessKey) {
            this.logger.warn(
                "⚠️  R2 credentials not configured. Storage uploads will fail. " +
                "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env"
            )
            return
        }

        this.s3Client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        })

        this.logger.log(`✅ Cloudflare R2 storage initialized (bucket: ${this.bucketName})`)

        // Validate credentials asynchronously on startup
        this.validateCredentials().catch(() => {
            // Error already logged inside validateCredentials
        })
    }

    /**
     * Validate R2 credentials on startup by attempting a HeadObject on a known path.
     * Logs a critical warning if credentials are invalid (signature mismatch).
     */
    private async validateCredentials(): Promise<void> {
        try {
            // Attempt a lightweight HeadObject on a non-existent key — the 404 is fine,
            // but a SignatureDoesNotMatch error means credentials are wrong.
            await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: "__health-check__",
                }),
            )
        } catch (error: any) {
            const code = error?.name || error?.Code || ""
            if (code === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
                // 404 is expected — credentials work fine
                this.logger.log("✅ R2 credential validation passed.")
                return
            }

            if (
                code === "SignatureDoesNotMatch" ||
                code === "InvalidAccessKeyId" ||
                error?.message?.includes("signature") ||
                error?.message?.includes("AccessDenied")
            ) {
                this.logger.error(
                    "🚨 R2 CREDENTIAL VALIDATION FAILED! " +
                    `Error: ${code} — ${error.message}. ` +
                    "Storage uploads WILL fail. Please update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your environment."
                )
                return
            }

            this.logger.warn(`⚠️  R2 credential check inconclusive: ${code} — ${error.message}`)
        }
    }

    /**
     * Map logical folders to enterprise-grade structured R2 bucket paths with tenant isolation
     */
    private mapFolderToPath(folder: string, scopeId?: string, city?: string): string {
        const mapping: Record<string, string> = {
            avatars: "users/profile-images",
            "profile-images": "users/profile-images",
            artworks: "artworks/images",
            thumbnails: "artworks/thumbnails",
            "ar-markers": "artworks/ar-markers",
            "audio-guides": "artworks/audio-guides",
            videos: "artworks/video-previews",
            "video-previews": "artworks/video-previews",
            museums: "museums/images",
            "ai-outputs": "ai/processed",
            static: "assets/static",
            collections: "collections/covers",
            photos: "collections/photos",
            "photo-edits": "collections/photos/edits",
            "artist-profiles": "artists/profiles",
            "creator-profiles": "artists/profiles",
            "artist-banners": "artists/banners",
            "creator-banners": "artists/banners",
            "collector-profiles": "collectors/profiles",
            "collector-banners": "collectors/banners",
            "forum-videos": "forum/videos",
            "forum-thumbnails": "forum/thumbnails",
            general: "general",
        }
        let basePath = mapping[folder.toLowerCase()] || folder

        if (scopeId) {
            const cleanScope = scopeId.trim().toLowerCase()
            if (city) {
                const cleanCity = city.trim().toLowerCase().replace(/\s+/g, "-")
                basePath = `${basePath}/${cleanCity}/${cleanScope}`
            } else {
                basePath = `${basePath}/${cleanScope}`
            }
        } else if (city) {
            const cleanCity = city.trim().toLowerCase().replace(/\s+/g, "-")
            basePath = `${basePath}/${cleanCity}`
        }

        return basePath
    }

    /**
     * Upload a file to R2 with automatic path organization and image optimization
     */
    async uploadFile(
        file: Express.Multer.File,
        folder = "general",
        scopeId?: string,
        city?: string,
    ): Promise<UploadResult> {
        this.validateFile(file)
        this.ensureClientReady()

        const targetFolder = this.mapFolderToPath(folder, scopeId, city)
        const fileUuid = uuidv4()
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype)

        // Moderate uploaded images (screen out NSFW/violence for forum, avatars, artworks)
        if (isImage) {
            this.logger.log(`🔍 Moderating image upload in folder: ${folder}...`)
            const geminiApiKey = this.configService.get<string>("ai.geminiApiKey") || ""
            const moderation = await moderateContent(
                file.buffer,
                file.mimetype,
                geminiApiKey,
                this.logger
            )

            if (!moderation.isAppropriate) {
                this.logger.warn(`🚫 Image upload blocked by content moderation: ${moderation.reason}`)
                throw new BadRequestException(
                    `Gambar terdeteksi mengandung konten tidak pantas (SARA, pornografi, kekerasan). Alasan: ${moderation.reason}`
                )
            }
        }

        // ─── Case A: Artwork Upload with Automated Multi-size Variants ───
        if (folder === "artworks" && isImage && this.imageProcessor.canProcess(file.mimetype)) {
            try {
                this.logger.log(`🎨 Processing artwork image upload with multi-variant generation...`)
                const variants = await this.imageProcessor.generateVariants(
                    file.buffer,
                    file.mimetype,
                    "artworks"
                )

                // Define keys for each variant using same UUID for easy maintenance
                const cleanScope = scopeId ? scopeId.trim().toLowerCase() : ""
                const cleanCity = city ? city.trim().toLowerCase().replace(/\s+/g, "-") : ""
                const scopePath = cleanScope ? (cleanCity ? `${cleanCity}/${cleanScope}/` : `${cleanScope}/`) : ""

                const originalKey = `${targetFolder}/${fileUuid}.webp`
                const mediumKey = `artworks/mediums/${scopePath}${fileUuid}.webp`
                const thumbnailKey = `artworks/thumbnails/${scopePath}${fileUuid}.webp`

                // Upload variants in parallel to R2
                await Promise.all([
                    this.uploadToR2(originalKey, variants.original.buffer, "image/webp"),
                    this.uploadToR2(mediumKey, variants.medium.buffer, "image/webp"),
                    this.uploadToR2(thumbnailKey, variants.thumbnail.buffer, "image/webp"),
                ])

                const originalUrl = this.buildPublicUrl(originalKey)
                const mediumUrl = this.buildPublicUrl(mediumKey)
                const thumbnailUrl = this.buildPublicUrl(thumbnailKey)

                this.logger.log(
                    `✅ Artwork upload success: Original (${this.formatSize(variants.original.size)}), ` +
                    `Medium (${this.formatSize(variants.medium.size)}), ` +
                    `Thumbnail (${this.formatSize(variants.thumbnail.size)})`
                )

                return {
                    key: originalKey,
                    url: originalUrl,
                    size: variants.original.size,
                    contentType: "image/webp",
                    mediumKey,
                    mediumUrl,
                    thumbnailKey,
                    thumbnailUrl,
                }
            } catch (err: any) {
                this.logger.error(`Failed to generate/upload artwork variants: ${err.message}. Falling back to single optimized image...`)
                if (err instanceof BadRequestException) {
                    throw err;
                }
            }
        }

        // ─── Case B: Standard Single Asset Upload ───
        let processedBuffer = file.buffer
        let processedMimetype = file.mimetype
        let processedExt = this.getExtension(file.originalname)

        // Process images (resize, compress, strip metadata, convert to WebP)
        if (isImage && this.imageProcessor.canProcess(file.mimetype)) {
            const processed = await this.imageProcessor.processImage(
                file.buffer,
                file.mimetype,
                folder,
            )
            processedBuffer = processed.buffer
            processedMimetype = processed.contentType
            processedExt = processed.extension
        }

        const key = `${targetFolder}/${fileUuid}${processedExt}`

        try {
            await this.uploadToR2(key, processedBuffer, processedMimetype)
            const url = this.buildPublicUrl(key)

            this.logger.log(`Uploaded single asset ${key} (${this.formatSize(processedBuffer.length)})`)

            return {
                key,
                url,
                size: processedBuffer.length,
                contentType: processedMimetype,
            }
        } catch (error: any) {
            const env = this.configService.get<string>("nodeEnv")
            const errorCode = error?.name || error?.Code || ""
            const isSignatureError =
                errorCode === "SignatureDoesNotMatch" ||
                errorCode === "InvalidAccessKeyId" ||
                error?.message?.includes("signature") ||
                error?.message?.includes("AccessDenied")

            if (env === "production") {
                if (isSignatureError) {
                    this.logger.error(
                        `🚨 R2 CDN Upload CREDENTIAL ERROR for ${key}: ${errorCode} — ${error.message}. ` +
                        `Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in production environment.`
                    )
                    throw new InternalServerErrorException(
                        "Storage credentials are misconfigured. Please contact the administrator."
                    )
                }
                this.logger.error(`R2 CDN Upload failed for ${key} in production: ${error.message}`)
                throw new InternalServerErrorException("Storage upload failed. Please try again later.")
            }

            this.logger.warn(`R2 CDN Upload failed for ${key}: ${error.message}. Falling back to Base64 database storage!`)
            
            // Fallback: Convert file to Base64 data URI to prevent backend crash
            const base64Data = processedBuffer.toString("base64")
            const dataUri = `data:${processedMimetype};base64,${base64Data}`
            
            return {
                key,
                url: dataUri,
                size: processedBuffer.length,
                contentType: processedMimetype,
            }
        }
    }

    /**
     * Upload a forum video with automatic compression and thumbnail generation.
     * Returns video URL, thumbnail URL, and complete metadata for database indexing.
     */
    async uploadForumVideo(
        file: Express.Multer.File,
        userId: string,
    ): Promise<ForumVideoUploadResult> {
        // Validate
        if (!file || !file.buffer) {
            throw new BadRequestException("No video file provided")
        }

        const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
        if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
            throw new BadRequestException(
                `Video type '${file.mimetype}' is not allowed. Accepted: ${ALLOWED_VIDEO_MIMES.join(", ")}`
            )
        }

        const MAX_VIDEO_UPLOAD = 150 * 1024 * 1024 // 150MB
        if (file.size > MAX_VIDEO_UPLOAD) {
            throw new BadRequestException(
                `Video too large (${this.formatSize(file.size)}). Maximum: ${this.formatSize(MAX_VIDEO_UPLOAD)}`
            )
        }

        this.ensureClientReady()

        this.logger.log(`🎬 Processing forum video upload: ${file.originalname} (${this.formatSize(file.size)})`)

        // Process video: compress + generate thumbnail
        const { video, thumbnail } = await this.videoProcessor.processVideo(file.buffer, file.mimetype)

        // Moderate Thumbnail
        this.logger.log(`🔍 Moderating forum video thumbnail for user ${userId}...`)
        const geminiApiKey = this.configService.get<string>("ai.geminiApiKey") || ""
        const moderation = await moderateContent(
            thumbnail.buffer,
            thumbnail.contentType,
            geminiApiKey,
            this.logger
        )

        if (!moderation.isAppropriate) {
            this.logger.warn(`🚫 Forum video blocked by content moderation: ${moderation.reason}`)
            throw new BadRequestException(
                `Video terdeteksi mengandung konten tidak pantas (SARA, pornografi, kekerasan). Alasan: ${moderation.reason}`
            )
        }

        // Upload compressed video and thumbnail to R2 in parallel
        const fileUuid = require("uuid").v4()
        const videoKey = `forum/videos/${userId}/${fileUuid}.mp4`
        const thumbnailKey = `forum/thumbnails/${userId}/${fileUuid}.webp`

        await Promise.all([
            this.uploadToR2(videoKey, video.buffer, video.contentType),
            this.uploadToR2(thumbnailKey, thumbnail.buffer, thumbnail.contentType),
        ])

        const videoUrl = this.buildPublicUrl(videoKey)
        const thumbnailUrl = this.buildPublicUrl(thumbnailKey)

        const compressionRatio = file.size > 0
            ? parseFloat(((1 - video.size / file.size) * 100).toFixed(2))
            : 0

        this.logger.log(
            `✅ Forum video uploaded: ${this.formatSize(file.size)} → ${this.formatSize(video.size)} ` +
            `(${compressionRatio}% saved, ${video.metadata.width}x${video.metadata.height})`
        )

        return {
            key: videoKey,
            url: videoUrl,
            size: video.size,
            contentType: video.contentType,
            thumbnailKey,
            thumbnailUrl,
            metadata: {
                duration: video.metadata.duration,
                width: video.metadata.width,
                height: video.metadata.height,
                videoCodec: video.metadata.videoCodec,
                audioCodec: video.metadata.audioCodec,
                bitrate: video.metadata.bitrate,
                fps: video.metadata.fps,
                aspectRatio: video.metadata.aspectRatio,
                originalFileSize: file.size,
                compressedFileSize: video.size,
                compressionRatio,
                originalFilename: file.originalname,
            },
        }
    }

    /**
     * Send object buffer to Cloudflare R2 bucket
     */
    private async uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: "public, max-age=31536000, immutable",
            }),
        )
    }

    /**
     * Delete a file from R2
     */
    async deleteFile(key: string): Promise<void> {
        this.ensureClientReady()

        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            )
            this.logger.log(`Deleted ${key}`)
        } catch (error: any) {
            this.logger.error(`Delete failed for ${key}: ${error.message}`)
            throw new InternalServerErrorException("File deletion failed.")
        }
    }

    /**
     * Check if a file exists in R2
     */
    async fileExists(key: string): Promise<boolean> {
        this.ensureClientReady()

        try {
            await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            )
            return true
        } catch {
            return false
        }
    }

    // ─── Private Helpers ──────────────────────────

    private ensureClientReady(): void {
        if (!this.s3Client) {
            throw new InternalServerErrorException(
                "Storage service is not configured. Please set R2 credentials in .env",
            )
        }
    }

    private validateFile(file: Express.Multer.File): void {
        if (!file || !file.buffer) {
            throw new BadRequestException("No file provided")
        }

        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type '${file.mimetype}' is not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`,
            )
        }

        let maxSize = MAX_GENERAL_SIZE
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            maxSize = MAX_IMAGE_SIZE
        } else if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            maxSize = MAX_VIDEO_SIZE
        } else if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
            maxSize = MAX_AUDIO_SIZE
        }

        if (file.size > maxSize) {
            throw new BadRequestException(
                `File too large (${this.formatSize(file.size)}). Max: ${this.formatSize(maxSize)}`,
            )
        }
    }

    private getExtension(filename: string): string {
        const lastDot = filename.lastIndexOf(".")
        return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : ""
    }

    private buildPublicUrl(key: string): string {
        if (this.publicUrl) {
            return `${this.publicUrl.replace(/\/$/, "")}/${key}`
        }
        // Fallback: direct R2 URL (requires public bucket access)
        return `https://${this.bucketName}.r2.dev/${key}`
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}
