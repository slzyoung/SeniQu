/**
 * Client-side Video Compressor
 * Pre-validates and prepares videos before upload to backend.
 * The actual heavy compression is done server-side via FFmpeg.
 *
 * This utility handles:
 * - Client-side validation (size, duration, type)
 * - Generate preview thumbnail from video element
 * - Format file size display
 * - Extract basic metadata using HTML5 video element
 *
 * Mobile-First:
 * - Limits file size to prevent mobile data waste
 * - Validates duration for quick upload experience
 * - Supports capture="environment" for direct camera recording
 */

/** Video validation constraints */
export const VIDEO_CONSTRAINTS = {
    /** Max file size (100MB for reels) */
    maxFileSize: 100 * 1024 * 1024,
    /** Max duration in seconds (60 seconds for reels) */
    maxDuration: 60,
    /** Allowed MIME types */
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    /** Recommended max file size for fast upload (30MB) */
    recommendedMaxSize: 30 * 1024 * 1024,
}

export interface VideoValidationResult {
    valid: boolean
    error?: string
    warning?: string
    metadata?: {
        duration: number
        width: number
        height: number
        size: number
        type: string
    }
}

/**
 * Validate a video file on the client side before uploading.
 * Returns validation result with extracted metadata.
 */
export async function validateVideo(
    file: File,
    options?: { maxFileSize?: number; maxDuration?: number }
): Promise<VideoValidationResult> {
    const maxFileSize = options?.maxFileSize ?? VIDEO_CONSTRAINTS.maxFileSize;
    const maxDuration = options?.maxDuration ?? VIDEO_CONSTRAINTS.maxDuration;

    // Check file type
    if (!VIDEO_CONSTRAINTS.allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported format: ${file.type}. Use MP4, WebM, or OGG.`,
        };
    }

    // Check file size
    if (file.size > maxFileSize) {
        return {
            valid: false,
            error: `Video too large (${formatFileSize(file.size)}). Maximum: ${formatFileSize(maxFileSize)}.`,
        };
    }

    // Extract metadata using HTML5 video element
    try {
        const metadata = await extractVideoMetadata(file);

        // Check duration
        if (metadata.duration > maxDuration) {
            return {
                valid: false,
                error: `Video too long (${formatDuration(metadata.duration)}). Maximum: ${formatDuration(maxDuration)}.`,
            };
        }

        // Warn if file is large but valid
        let warning: string | undefined;
        if (file.size > VIDEO_CONSTRAINTS.recommendedMaxSize) {
            warning = `Large file (${formatFileSize(file.size)}). Upload may take a while on mobile data. Server will auto-compress.`;
        }

        return {
            valid: true,
            warning,
            metadata: {
                duration: metadata.duration,
                width: metadata.width,
                height: metadata.height,
                size: file.size,
                type: file.type,
            },
        };
    } catch (err: any) {
        console.warn('[VideoValidator] Metadata extraction failed, allowing upload:', err);
        // Allow upload even if we can't extract metadata — server will validate
        return {
            valid: true,
            warning: 'Could not preview video. File will be validated server-side.',
        };
    }
}

/**
 * Extract basic video metadata using HTML5 Video element
 */
export function extractVideoMetadata(file: File): Promise<{
    duration: number
    width: number
    height: number
}> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true

        const url = URL.createObjectURL(file)

        const cleanup = () => {
            URL.revokeObjectURL(url)
            video.removeAttribute('src')
            video.load()
        }

        video.onloadedmetadata = () => {
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
            })
            cleanup()
        }

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'))
            cleanup()
        }

        // Timeout after 10 seconds
        setTimeout(() => {
            reject(new Error('Video metadata extraction timeout'))
            cleanup()
        }, 10000)

        video.src = url
    })
}

/**
 * Generate a preview thumbnail from a video file using canvas
 * Seeks to 20% of video duration for a more interesting frame
 */
export function generateVideoThumbnail(file: File, options?: {
    width?: number
    height?: number
    seekPercent?: number
}): Promise<string> {
    const { seekPercent = 0.2 } = options || {}

    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        video.preload = 'auto'
        video.muted = true
        video.playsInline = true

        const url = URL.createObjectURL(file)

        const cleanup = () => {
            URL.revokeObjectURL(url)
            video.removeAttribute('src')
            video.load()
        }

        video.onloadedmetadata = () => {
            // Seek to desired position
            video.currentTime = video.duration * seekPercent
        }

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas')
                const targetWidth = options?.width || Math.min(video.videoWidth, 480)
                const scale = targetWidth / video.videoWidth
                const targetHeight = options?.height || Math.round(video.videoHeight * scale)

                canvas.width = targetWidth
                canvas.height = targetHeight

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Canvas context unavailable'))
                    cleanup()
                    return
                }

                ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
                const dataUrl = canvas.toDataURL('image/webp', 0.8)
                resolve(dataUrl)
                cleanup()
            } catch (err) {
                reject(err)
                cleanup()
            }
        }

        video.onerror = () => {
            reject(new Error('Failed to generate thumbnail'))
            cleanup()
        }

        setTimeout(() => {
            reject(new Error('Thumbnail generation timeout'))
            cleanup()
        }, 15000)

        video.src = url
    })
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Format duration in seconds to MM:SS display
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
