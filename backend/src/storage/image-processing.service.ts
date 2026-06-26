/**
 * Image Processing Pipeline
 * Automatically compresses and optimizes images during upload
 * while maintaining high visual quality for display.
 *
 * Features:
 * - Converts to WebP for optimal file size (70-80% smaller than PNG)
 * - Generates responsive variants (thumbnail, medium, large)
 * - Preserves aspect ratio
 * - Strips EXIF metadata (privacy & size reduction)
 * - Handles JPEG, PNG, WebP, GIF, AVIF inputs
 * - Skips SVGs and videos (pass-through)
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import * as sharp from "sharp"

export interface ProcessedImage {
    /** Optimized original-size buffer */
    buffer: Buffer
    /** WebP content type */
    contentType: string
    /** File extension */
    extension: string
    /** Final file size in bytes */
    size: number
    /** Image width */
    width: number
    /** Image height */
    height: number
}

export interface ImageVariants {
    /** Original optimized (max 2048px wide) */
    original: ProcessedImage
    /** Medium variant (max 800px wide) — for forum cards, gallery grids */
    medium: ProcessedImage
    /** Thumbnail (max 300px wide) — for avatars, small previews */
    thumbnail: ProcessedImage
}

/** Quality presets per folder type */
const QUALITY_PRESETS: Record<string, { quality: number; maxWidth: number }> = {
    artworks: { quality: 85, maxWidth: 2048 },   // High quality for art
    avatars:  { quality: 75, maxWidth: 400 },     // Compact for profile pics
    videos:   { quality: 80, maxWidth: 1920 },    // Video thumbnails
    collections: { quality: 82, maxWidth: 1600 }, // Collection covers
    general:  { quality: 80, maxWidth: 1600 },    // Forum posts, etc.
}

/** Size thresholds — skip processing if already small */
const SKIP_PROCESSING_BELOW = 50 * 1024 // 50KB — already small enough

/** MIME types we can process */
const PROCESSABLE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
]

@Injectable()
export class ImageProcessingService {
    private readonly logger = new Logger(ImageProcessingService.name)

    /**
     * Check if a file should be processed
     */
    canProcess(mimetype: string): boolean {
        return PROCESSABLE_TYPES.includes(mimetype)
    }

    /**
     * Process a single image — compress and optimize
     * Returns the optimized buffer ready for upload
     */
    async processImage(
        buffer: Buffer,
        mimetype: string,
        folder: string = "general",
    ): Promise<ProcessedImage> {
        const preset = QUALITY_PRESETS[folder] || QUALITY_PRESETS.general

        // Skip if already very small
        if (buffer.length < SKIP_PROCESSING_BELOW && mimetype === "image/webp") {
            const metadata = await sharp(buffer).metadata()
            return {
                buffer,
                contentType: "image/webp",
                extension: ".webp",
                size: buffer.length,
                width: metadata.width || 0,
                height: metadata.height || 0,
            }
        }

        try {
            const pipeline = sharp(buffer, {
                animated: mimetype === "image/gif", // Preserve GIF animation
                limitInputPixels: 268402689, // ~16384x16384
            })

            // Get original metadata
            const metadata = await pipeline.metadata()

            // Resize if exceeds max width (maintain aspect ratio)
            const needsResize = metadata.width && metadata.width > preset.maxWidth

            let processed = pipeline
                .rotate() // Auto-orient based on EXIF

            if (needsResize) {
                processed = processed.resize(preset.maxWidth, null, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
            }

            // Convert to WebP for optimal compression
            // GIFs stay as WebP with animation support
            const result = await processed
                .webp({
                    quality: preset.quality,
                    effort: 4, // Balance between speed and compression (0-6)
                    smartSubsample: true,
                })
                .toBuffer({ resolveWithObject: true })

            const compressionRatio = ((1 - result.info.size / buffer.length) * 100).toFixed(1)

            this.logger.log(
                `📸 Image optimized: ${this.formatSize(buffer.length)} → ${this.formatSize(result.info.size)} ` +
                `(${compressionRatio}% reduction, ${result.info.width}x${result.info.height}, q=${preset.quality})`
            )

            return {
                buffer: result.data,
                contentType: "image/webp",
                extension: ".webp",
                size: result.info.size,
                width: result.info.width,
                height: result.info.height,
            }
        } catch (error: any) {
            this.logger.error(`Image processing failed: ${error.message}`)
            throw new BadRequestException(`Invalid or corrupt image file: ${error.message}`)
        }
    }

    /**
     * Generate multiple size variants for responsive display
     * Useful for artwork galleries that need thumbnails + full-size
     */
    async generateVariants(
        buffer: Buffer,
        mimetype: string,
        folder: string = "general",
    ): Promise<ImageVariants> {
        const preset = QUALITY_PRESETS[folder] || QUALITY_PRESETS.general

        const [original, medium, thumbnail] = await Promise.all([
            // Original — full quality, max width capped
            this.processImage(buffer, mimetype, folder),

            // Medium — for cards/grids (800px)
            this.resizeAndCompress(buffer, mimetype, 800, Math.min(preset.quality, 78)),

            // Thumbnail — for small previews (300px)
            this.resizeAndCompress(buffer, mimetype, 300, 70),
        ])

        return { original, medium, thumbnail }
    }

    /**
     * Resize and compress to a specific width
     */
    private async resizeAndCompress(
        buffer: Buffer,
        mimetype: string,
        maxWidth: number,
        quality: number,
    ): Promise<ProcessedImage> {
        try {
            const result = await sharp(buffer, {
                animated: mimetype === "image/gif",
            })
                .rotate()
                .resize(maxWidth, null, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality, effort: 4, smartSubsample: true })
                .toBuffer({ resolveWithObject: true })

            return {
                buffer: result.data,
                contentType: "image/webp",
                extension: ".webp",
                size: result.info.size,
                width: result.info.width,
                height: result.info.height,
            }
        } catch {
            // Fallback to processImage
            return this.processImage(buffer, mimetype, "general")
        }
    }

    private getExtForMime(mime: string): string {
        const map: Record<string, string> = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "image/avif": ".avif",
            "image/svg+xml": ".svg",
        }
        return map[mime] || ".webp"
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}
