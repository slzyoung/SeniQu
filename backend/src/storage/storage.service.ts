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
import { UploadResult } from "./dto/upload-file.dto"

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

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name)
    private s3Client: S3Client
    private bucketName: string
    private publicUrl: string

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const accountId = this.configService.get<string>("r2.accountId")
        const accessKeyId = this.configService.get<string>("r2.accessKeyId")
        const secretAccessKey = this.configService.get<string>("r2.secretAccessKey")
        this.bucketName = this.configService.get<string>("r2.bucketName") || "seniqu-assets"
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
        })

        this.logger.log(`✅ Cloudflare R2 storage initialized (bucket: ${this.bucketName})`)
    }

    /**
     * Upload a file to R2 (or return Base64 for avatars)
     */
    async uploadFile(
        file: Express.Multer.File,
        folder = "general",
    ): Promise<UploadResult> {
        this.validateFile(file)

        // Bypass CDN for avatars and store directly as Base64 in database
        if (folder === "avatars") {
            const base64Data = file.buffer.toString('base64');
            const dataUri = `data:${file.mimetype};base64,${base64Data}`;
            const key = `avatars/${uuidv4()}`;
            
            this.logger.log(`Avatar processed as Base64 data URI (${this.formatSize(file.size)})`);
            
            return {
                key,
                url: dataUri,
                size: file.size,
                contentType: file.mimetype,
            };
        }

        this.ensureClientReady()

        const ext = this.getExtension(file.originalname)
        const key = `${folder}/${uuidv4()}${ext}`

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    CacheControl: "public, max-age=31536000, immutable",
                }),
            )

            const url = this.buildPublicUrl(key)

            this.logger.log(`Uploaded ${key} (${this.formatSize(file.size)})`)

            return {
                key,
                url,
                size: file.size,
                contentType: file.mimetype,
            }
        } catch (error) {
            this.logger.error(`Upload failed for ${key}: ${error.message}`)
            throw new InternalServerErrorException("File upload failed. Please try again.")
        }
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
        } catch (error) {
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

        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype)
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

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
