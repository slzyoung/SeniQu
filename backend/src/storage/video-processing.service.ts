/**
 * Video Processing Service
 * Handles video compression, thumbnail generation, and metadata extraction.
 *
 * Architecture:
 * - Uses FFmpeg for transcoding (H.264/AAC → MP4 container)
 * - CRF-based encoding for optimal quality-to-size ratio
 * - Mobile-first: targets 720p with 1080p cap
 * - Generates WebP thumbnail from best frame
 * - Extracts full video metadata for database indexing
 *
 * Compression Strategy:
 * - CRF 23 (visually lossless for mobile screens)
 * - H.264 baseline profile (widest device compatibility)
 * - AAC 128kbps audio (transparent quality)
 * - faststart for progressive download (instant mobile playback)
 * - Max 1080p resolution, auto-downscale if larger
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import * as ffmpeg from "fluent-ffmpeg"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { v4 as uuidv4 } from "uuid"

export interface VideoMetadata {
    /** Duration in seconds */
    duration: number
    /** Width in pixels */
    width: number
    /** Height in pixels */
    height: number
    /** Video codec (e.g. h264) */
    videoCodec: string
    /** Audio codec (e.g. aac) */
    audioCodec: string | null
    /** Bitrate in kbps */
    bitrate: number
    /** Frames per second */
    fps: number
    /** File size in bytes */
    fileSize: number
    /** Aspect ratio string (e.g. "16:9") */
    aspectRatio: string
}

export interface ProcessedVideo {
    /** Compressed video buffer */
    buffer: Buffer
    /** Video MIME type */
    contentType: string
    /** File extension */
    extension: string
    /** Final file size in bytes */
    size: number
    /** Video metadata */
    metadata: VideoMetadata
}

export interface VideoThumbnail {
    /** Thumbnail image buffer (WebP) */
    buffer: Buffer
    /** Thumbnail MIME type */
    contentType: string
    /** File extension */
    extension: string
    /** Thumbnail size in bytes */
    size: number
    /** Thumbnail width */
    width: number
    /** Thumbnail height */
    height: number
}

/** Max video dimensions — mobile-first strategy */
const MAX_WIDTH = 1080
const MAX_HEIGHT = 1920  // Allow portrait videos (9:16)

/** CRF value: 18 = near-lossless, 23 = good quality, 28 = acceptable */
const CRF_QUALITY = 23

/** Audio bitrate for mobile */
const AUDIO_BITRATE = "128k"

/** Max video duration (5 minutes) */
const MAX_DURATION_SECONDS = 300

/** Thumbnail dimensions */
const THUMBNAIL_WIDTH = 480
const THUMBNAIL_HEIGHT = 270

@Injectable()
export class VideoProcessingService {
    private readonly logger = new Logger(VideoProcessingService.name)

    /**
     * Check if a file is a processable video type
     */
    canProcess(mimetype: string): boolean {
        return [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska",
        ].includes(mimetype)
    }

    /**
     * Extract video metadata using ffprobe
     */
    async getMetadata(buffer: Buffer): Promise<VideoMetadata> {
        const tmpFile = this.createTempFile(buffer, ".tmp")

        try {
            return await new Promise<VideoMetadata>((resolve, reject) => {
                ffmpeg.ffprobe(tmpFile, (err, data) => {
                    if (err) {
                        reject(new BadRequestException(`Invalid video file: ${err.message}`))
                        return
                    }

                    const videoStream = data.streams.find(s => s.codec_type === "video")
                    const audioStream = data.streams.find(s => s.codec_type === "audio")

                    if (!videoStream) {
                        reject(new BadRequestException("No video stream found in file"))
                        return
                    }

                    const width = videoStream.width || 0
                    const height = videoStream.height || 0
                    const duration = parseFloat(String(data.format.duration || "0"))
                    const bitrate = Math.round(parseInt(String(data.format.bit_rate || "0")) / 1000)
                    const fpsStr = videoStream.r_frame_rate || "30/1"
                    const fpsParts = fpsStr.split("/")
                    const fps = fpsParts.length === 2
                        ? Math.round(parseInt(fpsParts[0]) / parseInt(fpsParts[1]))
                        : parseInt(fpsStr)

                    // Calculate aspect ratio
                    const gcd = this.gcd(width, height)
                    const aspectRatio = gcd > 0 ? `${width / gcd}:${height / gcd}` : "unknown"

                    resolve({
                        duration,
                        width,
                        height,
                        videoCodec: videoStream.codec_name || "unknown",
                        audioCodec: audioStream?.codec_name || null,
                        bitrate,
                        fps: isNaN(fps) ? 30 : fps,
                        fileSize: buffer.length,
                        aspectRatio,
                    })
                })
            })
        } finally {
            this.cleanupTempFile(tmpFile)
        }
    }

    /**
     * Compress a video with FFmpeg
     * Uses H.264 + AAC encoding with CRF-based quality targeting.
     * Mobile-optimized: caps at 1080p, fast decode profile, faststart.
     */
    async compressVideo(buffer: Buffer, mimetype: string): Promise<ProcessedVideo> {
        const inputFile = this.createTempFile(buffer, this.getExtForMime(mimetype))
        const outputFile = path.join(os.tmpdir(), `seniqu-vc-${uuidv4()}.mp4`)

        try {
            // Get source metadata first
            const metadata = await this.getMetadata(buffer)

            // Validate duration
            if (metadata.duration > MAX_DURATION_SECONDS) {
                throw new BadRequestException(
                    `Video too long (${Math.round(metadata.duration)}s). Maximum: ${MAX_DURATION_SECONDS}s (${MAX_DURATION_SECONDS / 60} minutes)`
                )
            }

            // Calculate target dimensions (maintain aspect ratio, cap at max)
            const { width: targetWidth, height: targetHeight } = this.calculateDimensions(
                metadata.width,
                metadata.height,
                MAX_WIDTH,
                MAX_HEIGHT,
            )

            // Determine if we need to re-encode
            const isAlreadyOptimal =
                metadata.videoCodec === "h264" &&
                metadata.width <= MAX_WIDTH &&
                metadata.height <= MAX_HEIGHT &&
                metadata.bitrate <= 3000 && // Already low bitrate
                buffer.length <= 20 * 1024 * 1024 // Under 20MB

            if (isAlreadyOptimal) {
                this.logger.log(`🎬 Video already optimal (${metadata.videoCodec}, ${metadata.width}x${metadata.height}, ${this.formatSize(buffer.length)}). Skipping re-encode.`)
                return {
                    buffer,
                    contentType: "video/mp4",
                    extension: ".mp4",
                    size: buffer.length,
                    metadata,
                }
            }

            this.logger.log(
                `🎬 Compressing video: ${metadata.width}x${metadata.height} → ${targetWidth}x${targetHeight} ` +
                `(${metadata.videoCodec} → h264, CRF ${CRF_QUALITY}, ${this.formatSize(buffer.length)})`
            )

            // Build scale filter — only apply if dimensions need to change
            const needsScale = targetWidth !== metadata.width || targetHeight !== metadata.height
            const scaleFilter = needsScale
                ? `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`
                : null

            await new Promise<void>((resolve, reject) => {
                let cmd = ffmpeg(inputFile)
                    .outputOptions([
                        `-c:v libx264`,         // H.264 codec — widest compatibility
                        `-preset medium`,        // Encoding speed vs compression tradeoff
                        `-crf ${CRF_QUALITY}`,   // Constant Rate Factor quality
                        `-profile:v main`,       // Main profile for mobile compatibility
                        `-level 4.0`,            // Level 4.0 for 1080p support
                        `-pix_fmt yuv420p`,      // Standard pixel format
                        `-movflags +faststart`,  // Enable progressive download
                        `-c:a aac`,              // AAC audio codec
                        `-b:a ${AUDIO_BITRATE}`, // Audio bitrate
                        `-ac 2`,                 // Stereo audio
                        `-ar 44100`,             // Standard sample rate
                        `-max_muxing_queue_size 1024`,
                    ])
                    .outputFormat("mp4")

                if (scaleFilter) {
                    cmd = cmd.videoFilter(scaleFilter)
                }

                cmd
                    .on("start", (cmdLine) => {
                        this.logger.debug(`FFmpeg command: ${cmdLine}`)
                    })
                    .on("progress", (progress) => {
                        if (progress.percent) {
                            this.logger.debug(`Compression progress: ${Math.round(progress.percent)}%`)
                        }
                    })
                    .on("error", (err) => {
                        this.logger.error(`FFmpeg error: ${err.message}`)
                        reject(new BadRequestException(`Video compression failed: ${err.message}`))
                    })
                    .on("end", () => resolve())
                    .save(outputFile)
            })

            const compressedBuffer = fs.readFileSync(outputFile)
            const compressionRatio = ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(1)

            this.logger.log(
                `✅ Video compressed: ${this.formatSize(buffer.length)} → ${this.formatSize(compressedBuffer.length)} ` +
                `(${compressionRatio}% reduction)`
            )

            // Get metadata of compressed video
            const compressedMetadata = await this.getMetadata(compressedBuffer)

            return {
                buffer: compressedBuffer,
                contentType: "video/mp4",
                extension: ".mp4",
                size: compressedBuffer.length,
                metadata: compressedMetadata,
            }
        } finally {
            this.cleanupTempFile(inputFile)
            this.cleanupTempFile(outputFile)
        }
    }

    /**
     * Generate a thumbnail from a video
     * Picks a frame at ~20% of the video duration for a visually interesting thumbnail.
     */
    async generateThumbnail(buffer: Buffer, mimetype: string): Promise<VideoThumbnail> {
        const inputFile = this.createTempFile(buffer, this.getExtForMime(mimetype))
        const thumbnailFile = path.join(os.tmpdir(), `seniqu-vt-${uuidv4()}.webp`)

        try {
            const metadata = await this.getMetadata(buffer)
            // Pick a frame at 20% of duration (usually more interesting than first frame)
            const seekTime = Math.min(metadata.duration * 0.2, 10)

            await new Promise<void>((resolve, reject) => {
                ffmpeg(inputFile)
                    .seekInput(seekTime)
                    .outputOptions([
                        `-vframes 1`,
                        `-vf scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=decrease,pad=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black`,
                        `-q:v 85`,
                    ])
                    .outputFormat("webp")
                    .on("error", (err) => {
                        this.logger.error(`Thumbnail generation error: ${err.message}`)
                        reject(new BadRequestException(`Thumbnail generation failed: ${err.message}`))
                    })
                    .on("end", () => resolve())
                    .save(thumbnailFile)
            })

            const thumbnailBuffer = fs.readFileSync(thumbnailFile)

            this.logger.log(
                `🖼️ Video thumbnail generated: ${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT} (${this.formatSize(thumbnailBuffer.length)})`
            )

            return {
                buffer: thumbnailBuffer,
                contentType: "image/webp",
                extension: ".webp",
                size: thumbnailBuffer.length,
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
            }
        } finally {
            this.cleanupTempFile(inputFile)
            this.cleanupTempFile(thumbnailFile)
        }
    }

    /**
     * Full video processing pipeline:
     * 1. Extract metadata
     * 2. Compress video
     * 3. Generate thumbnail
     */
    async processVideo(buffer: Buffer, mimetype: string): Promise<{
        video: ProcessedVideo
        thumbnail: VideoThumbnail
    }> {
        this.logger.log(`🎬 Starting full video processing pipeline (${this.formatSize(buffer.length)})...`)

        // Run compression and thumbnail generation
        // Use compressed buffer for thumbnail to ensure consistency
        const video = await this.compressVideo(buffer, mimetype)
        const thumbnail = await this.generateThumbnail(video.buffer, "video/mp4")

        this.logger.log(
            `✅ Video pipeline complete: Video ${this.formatSize(video.size)}, Thumbnail ${this.formatSize(thumbnail.size)}`
        )

        return { video, thumbnail }
    }

    // ─── Private Helpers ──────────────────────────

    private calculateDimensions(
        origWidth: number,
        origHeight: number,
        maxWidth: number,
        maxHeight: number,
    ): { width: number; height: number } {
        let width = origWidth
        let height = origHeight

        // Ensure even dimensions (required by H.264)
        const makeEven = (n: number) => n % 2 === 0 ? n : n - 1

        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
        }

        if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
        }

        return { width: makeEven(width), height: makeEven(height) }
    }

    private createTempFile(buffer: Buffer, extension: string): string {
        const tmpFile = path.join(os.tmpdir(), `seniqu-v-${uuidv4()}${extension}`)
        fs.writeFileSync(tmpFile, buffer)
        return tmpFile
    }

    private cleanupTempFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        } catch (err: any) {
            this.logger.warn(`Failed to cleanup temp file ${filePath}: ${err.message}`)
        }
    }

    private gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b)
    }

    private getExtForMime(mime: string): string {
        const map: Record<string, string> = {
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/ogg": ".ogg",
            "video/quicktime": ".mov",
            "video/x-msvideo": ".avi",
            "video/x-matroska": ".mkv",
        }
        return map[mime] || ".mp4"
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}
