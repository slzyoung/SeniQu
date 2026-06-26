/**
 * Video Processing Service — Memory-Efficient File-Based Pipeline
 * Handles video compression, thumbnail generation, and metadata extraction.
 *
 * Architecture:
 * - ALL processing operates on file PATHS, never full in-memory buffers
 * - Uses FFmpeg for transcoding (H.264/AAC → MP4 container)
 * - CRF-based encoding for optimal quality-to-size ratio
 * - Mobile-first: targets 720p with 1080p cap
 * - Generates WebP thumbnail from best frame
 * - Extracts full video metadata for database indexing
 *
 * Memory Strategy:
 * - Never hold more than ~10MB in memory at once
 * - Temp files on disk for all intermediate stages
 * - Explicit cleanup in finally blocks
 * - Buffer usage only for tiny outputs (thumbnails)
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

export interface ProcessedVideoResult {
    /** Path to the compressed video file on disk */
    videoPath: string
    /** Video MIME type */
    contentType: string
    /** File extension */
    extension: string
    /** Final file size in bytes */
    size: number
    /** Video metadata */
    metadata: VideoMetadata
}

export interface VideoThumbnailResult {
    /** Path to the thumbnail file on disk */
    thumbnailPath: string
    /** Thumbnail image buffer (WebP) — small enough to hold in memory */
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

// === Legacy buffer-based interfaces (kept for backward compat) ===
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

/** CRF value: 18 = near-lossless, 22 = high quality, 23 = good quality, 28 = acceptable */
const CRF_QUALITY = 22

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
     * Extract video metadata using ffprobe — FILE-PATH based (no buffer needed)
     */
    async getMetadataFromFile(filePath: string): Promise<VideoMetadata> {
        const fileSize = fs.statSync(filePath).size

        return new Promise<VideoMetadata>((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, data) => {
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
                    fileSize,
                    aspectRatio,
                })
            })
        })
    }

    /**
     * Legacy: Extract video metadata from a buffer (creates temp file internally)
     * @deprecated Use getMetadataFromFile() instead to avoid memory pressure
     */
    async getMetadata(buffer: Buffer): Promise<VideoMetadata> {
        const tmpFile = this.createTempFile(buffer, ".tmp")

        try {
            return await this.getMetadataFromFile(tmpFile)
        } finally {
            this.cleanupTempFile(tmpFile)
        }
    }

    /**
     * Compress a video with FFmpeg — FILE-PATH based (memory efficient)
     * Uses H.264 + AAC encoding with CRF-based quality targeting.
     * Mobile-optimized: caps at 1080p, fast decode profile, faststart.
     *
     * Returns the OUTPUT FILE PATH — caller is responsible for cleanup.
     */
    async compressVideoFile(inputFile: string, mimetype: string, mute = false): Promise<ProcessedVideoResult> {
        const outputFile = path.join(os.tmpdir(), `seniqu-vc-${uuidv4()}.mp4`)

        try {
            // Get source metadata from file path (no buffer)
            const metadata = await this.getMetadataFromFile(inputFile)

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

            const inputSize = fs.statSync(inputFile).size

            // Determine if we need to re-encode
            const isAlreadyOptimal =
                !mute &&
                metadata.videoCodec === "h264" &&
                metadata.width <= MAX_WIDTH &&
                metadata.height <= MAX_HEIGHT &&
                metadata.bitrate <= 3000 && // Already low bitrate
                inputSize <= 20 * 1024 * 1024 // Under 20MB

            if (isAlreadyOptimal) {
                this.logger.log(`🎬 Video already optimal (${metadata.videoCodec}, ${metadata.width}x${metadata.height}, ${this.formatSize(inputSize)}). Copying without re-encode.`)
                // Copy the file instead of re-encoding
                fs.copyFileSync(inputFile, outputFile)
                return {
                    videoPath: outputFile,
                    contentType: "video/mp4",
                    extension: ".mp4",
                    size: inputSize,
                    metadata,
                }
            }

            this.logger.log(
                `🎬 Compressing video (mute=${mute}): ${metadata.width}x${metadata.height} → ${targetWidth}x${targetHeight} ` +
                `(${metadata.videoCodec} → h264, CRF ${CRF_QUALITY}, ${this.formatSize(inputSize)})`
            )

            // Build scale filter — only apply if dimensions need to change
            const needsScale = targetWidth !== metadata.width || targetHeight !== metadata.height
            const scaleFilter = needsScale
                ? `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`
                : null

            await new Promise<void>((resolve, reject) => {
                const options = [
                    `-c:v libx264`,         // H.264 codec — widest compatibility
                    `-preset faster`,        // Faster encoding — still good compression
                    `-crf ${CRF_QUALITY}`,   // Constant Rate Factor quality
                    `-profile:v main`,       // Main profile for mobile compatibility
                    `-level 4.0`,            // Level 4.0 for 1080p support
                    `-pix_fmt yuv420p`,      // Standard pixel format
                    `-movflags +faststart`,  // Enable progressive download
                    `-maxrate 4M`,           // Cap bitrate to prevent bloat on complex scenes
                    `-bufsize 8M`,           // VBV buffer size
                ];

                if (mute) {
                    options.push(`-an`);     // Completely strip audio track (mute)
                } else {
                    options.push(
                        `-c:a aac`,              // AAC audio codec
                        `-b:a ${AUDIO_BITRATE}`, // Audio bitrate
                        `-ac 2`,                 // Stereo audio
                        `-ar 44100`,             // Standard sample rate
                    );
                }

                options.push(
                    `-max_muxing_queue_size 2048`,
                    `-threads 0`,            // Use all available CPU threads
                );

                let cmd = ffmpeg(inputFile)
                    .outputOptions(options)
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

            const compressedSize = fs.statSync(outputFile).size
            const compressionRatio = ((1 - compressedSize / inputSize) * 100).toFixed(1)

            this.logger.log(
                `✅ Video compressed: ${this.formatSize(inputSize)} → ${this.formatSize(compressedSize)} ` +
                `(${compressionRatio}% reduction)`
            )

            // Get metadata of compressed video
            const compressedMetadata = await this.getMetadataFromFile(outputFile)

            return {
                videoPath: outputFile,
                contentType: "video/mp4",
                extension: ".mp4",
                size: compressedSize,
                metadata: compressedMetadata,
            }
        } catch (err) {
            // Clean up output file on error
            this.cleanupTempFile(outputFile)
            throw err
        }
    }

    /**
     * Legacy: Compress a video from a buffer
     * @deprecated Use compressVideoFile() instead for memory efficiency
     */
    async compressVideo(buffer: Buffer, mimetype: string): Promise<ProcessedVideo> {
        const inputFile = this.createTempFile(buffer, this.getExtForMime(mimetype))

        try {
            const result = await this.compressVideoFile(inputFile, mimetype)
            const compressedBuffer = fs.readFileSync(result.videoPath)

            return {
                buffer: compressedBuffer,
                contentType: result.contentType,
                extension: result.extension,
                size: result.size,
                metadata: result.metadata,
            }
        } finally {
            this.cleanupTempFile(inputFile)
        }
    }

    /**
     * Generate a thumbnail from a video FILE PATH (memory efficient)
     * Picks a frame at ~20% of the video duration for a visually interesting thumbnail.
     * Returns the thumbnail as a buffer (typically < 50KB, safe for memory).
     */
    async generateThumbnailFromFile(inputFile: string): Promise<VideoThumbnailResult> {
        const thumbnailFile = path.join(os.tmpdir(), `seniqu-vt-${uuidv4()}.webp`)

        try {
            const metadata = await this.getMetadataFromFile(inputFile)
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
                thumbnailPath: thumbnailFile,
                buffer: thumbnailBuffer,
                contentType: "image/webp",
                extension: ".webp",
                size: thumbnailBuffer.length,
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
            }
        } catch (err) {
            this.cleanupTempFile(thumbnailFile)
            throw err
        }
    }

    /**
     * Generate a thumbnail from a video
     * @deprecated Use generateThumbnailFromFile() instead
     */
    async generateThumbnail(buffer: Buffer, mimetype: string): Promise<VideoThumbnail> {
        const inputFile = this.createTempFile(buffer, this.getExtForMime(mimetype))

        try {
            const result = await this.generateThumbnailFromFile(inputFile)
            this.cleanupTempFile(result.thumbnailPath)

            return {
                buffer: result.buffer,
                contentType: result.contentType,
                extension: result.extension,
                size: result.size,
                width: result.width,
                height: result.height,
            }
        } finally {
            this.cleanupTempFile(inputFile)
        }
    }

    /**
     * Full video processing pipeline — FILE-PATH based (memory efficient)
     * Compresses video + generates thumbnail without loading full video into memory.
     *
     * IMPORTANT: Caller is responsible for cleaning up returned file paths.
     */
    async processVideoFromFile(inputFile: string, mimetype: string, mute = false): Promise<{
        video: ProcessedVideoResult
        thumbnail: VideoThumbnailResult
    }> {
        const inputSize = fs.statSync(inputFile).size
        this.logger.log(`🎬 Starting file-based video processing pipeline (${this.formatSize(inputSize)})...`)

        try {
            // Check if ffmpeg/ffprobe is available
            await new Promise<void>((resolve, reject) => {
                ffmpeg.getAvailableCodecs((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Run compression (file path → file path, NO buffer in memory)
            const video = await this.compressVideoFile(inputFile, mimetype, mute)

            // Generate thumbnail from COMPRESSED video (already on disk)
            const thumbnail = await this.generateThumbnailFromFile(video.videoPath)

            this.logger.log(
                `✅ Video pipeline complete: Video ${this.formatSize(video.size)}, Thumbnail ${this.formatSize(thumbnail.size)}`
            )

            return { video, thumbnail }
        } catch (ffmpegErr: any) {
            this.logger.warn(`⚠️ FFmpeg/ffprobe is not available or failed. Falling back to direct video upload without compression. Error: ${ffmpegErr.message}`);

            // Base64 transparent WebP 1x1 image as fallback thumbnail
            const transparentWebpBase64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
            const fallbackThumbnailBuffer = Buffer.from(transparentWebpBase64, 'base64');
            const fallbackThumbnailPath = path.join(os.tmpdir(), `seniqu-vt-fallback-${uuidv4()}.webp`)
            fs.writeFileSync(fallbackThumbnailPath, fallbackThumbnailBuffer)

            // Copy input as "output" since we can't compress
            const outputPath = path.join(os.tmpdir(), `seniqu-vc-passthrough-${uuidv4()}${this.getExtForMime(mimetype)}`)
            fs.copyFileSync(inputFile, outputPath)

            return {
                video: {
                    videoPath: outputPath,
                    contentType: mimetype,
                    extension: this.getExtForMime(mimetype),
                    size: inputSize,
                    metadata: {
                        duration: 0,
                        width: 1080,
                        height: 1920,
                        videoCodec: "unknown",
                        audioCodec: "unknown",
                        bitrate: 0,
                        fps: 30,
                        fileSize: inputSize,
                        aspectRatio: "9:16"
                    }
                },
                thumbnail: {
                    thumbnailPath: fallbackThumbnailPath,
                    buffer: fallbackThumbnailBuffer,
                    contentType: "image/webp",
                    extension: ".webp",
                    size: fallbackThumbnailBuffer.length,
                    width: 480,
                    height: 270
                }
            };
        }
    }

    /**
     * Legacy: Full pipeline from buffer
     * @deprecated Use processVideoFromFile() for memory efficiency
     */
    async processVideo(buffer: Buffer, mimetype: string): Promise<{
        video: ProcessedVideo
        thumbnail: VideoThumbnail
    }> {
        this.logger.log(`🎬 Starting full video processing pipeline (${this.formatSize(buffer.length)})...`)

        try {
            // Check if ffmpeg/ffprobe is available
            await new Promise<void>((resolve, reject) => {
                ffmpeg.getAvailableCodecs((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Run compression and thumbnail generation
            const video = await this.compressVideo(buffer, mimetype)
            const thumbnail = await this.generateThumbnail(video.buffer, "video/mp4")

            this.logger.log(
                `✅ Video pipeline complete: Video ${this.formatSize(video.size)}, Thumbnail ${this.formatSize(thumbnail.size)}`
            )

            return { video, thumbnail }
        } catch (ffmpegErr: any) {
            this.logger.warn(`⚠️ FFmpeg/ffprobe is not available or failed. Falling back to direct video upload without compression. Error: ${ffmpegErr.message}`);

            // Base64 transparent WebP 1x1 image as fallback thumbnail
            const transparentWebpBase64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
            const fallbackThumbnailBuffer = Buffer.from(transparentWebpBase64, 'base64');

            return {
                video: {
                    buffer,
                    contentType: mimetype,
                    extension: this.getExtForMime(mimetype),
                    size: buffer.length,
                    metadata: {
                        duration: 0,
                        width: 1080,
                        height: 1920,
                        videoCodec: "unknown",
                        audioCodec: "unknown",
                        bitrate: 0,
                        fps: 30,
                        fileSize: buffer.length,
                        aspectRatio: "9:16"
                    }
                },
                thumbnail: {
                    buffer: fallbackThumbnailBuffer,
                    contentType: "image/webp",
                    extension: ".webp",
                    size: fallbackThumbnailBuffer.length,
                    width: 480,
                    height: 270
                }
            };
        }
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

    cleanupTempFile(filePath: string): void {
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

    getExtForMime(mime: string): string {
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

    formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}
