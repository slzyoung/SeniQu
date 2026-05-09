/**
 * Client-side Image Compression
 * Pre-compresses images before upload to reduce transfer time.
 * Works in conjunction with the backend image processing pipeline.
 *
 * Flow: User selects file → Client compresses → Upload → Server optimizes → Store
 */

/** Compression options */
interface CompressOptions {
    /** Max width in pixels (default: 2048) */
    maxWidth?: number;
    /** Max height in pixels (default: 2048) */
    maxHeight?: number;
    /** Quality 0-1 (default: 0.85) */
    quality?: number;
    /** Max file size in bytes (default: 5MB) */
    maxSizeBytes?: number;
    /** Output type (default: 'image/webp') */
    outputType?: string;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    outputType: 'image/webp',
};

/**
 * Compress an image file before upload
 * Returns a new File object with the compressed image
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {},
): Promise<File> {
    // Skip non-image files
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip SVGs — they're already vector and small
    if (file.type === 'image/svg+xml') {
        return file;
    }

    // Skip very small files (< 100KB)
    if (file.size < 100 * 1024) {
        return file;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = calculateDimensions(
            bitmap.width,
            bitmap.height,
            opts.maxWidth,
            opts.maxHeight,
        );

        // Use OffscreenCanvas if available (better performance)
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.warn('[ImageCompressor] Canvas context unavailable, returning original');
            return file;
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        // Try WebP first, fallback to JPEG
        let blob: Blob;
        let outputType = opts.outputType;

        try {
            blob = await canvas.convertToBlob({
                type: outputType,
                quality: opts.quality,
            });
        } catch {
            // WebP not supported in some browsers, fallback to JPEG
            outputType = 'image/jpeg';
            blob = await canvas.convertToBlob({
                type: outputType,
                quality: opts.quality,
            });
        }

        // If compressed is larger than original (rare but possible with small PNGs), use original
        if (blob.size >= file.size) {
            return file;
        }

        // If still over max size, reduce quality iteratively
        let currentQuality = opts.quality;
        while (blob.size > opts.maxSizeBytes && currentQuality > 0.3) {
            currentQuality -= 0.1;
            blob = await canvas.convertToBlob({
                type: outputType,
                quality: currentQuality,
            });
        }

        const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
        const newName = file.name.replace(/\.[^.]+$/, ext);

        const compressionRatio = ((1 - blob.size / file.size) * 100).toFixed(0);
        console.log(
            `[ImageCompressor] ${formatSize(file.size)} → ${formatSize(blob.size)} (${compressionRatio}% reduction, ${width}x${height})`
        );

        return new File([blob], newName, { type: outputType, lastModified: Date.now() });
    } catch (error) {
        console.warn('[ImageCompressor] Compression failed, using original:', error);
        return file;
    }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
    files: File[],
    options: CompressOptions = {},
): Promise<File[]> {
    return Promise.all(files.map(f => compressImage(f, options)));
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
    origWidth: number,
    origHeight: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    let width = origWidth;
    let height = origHeight;

    if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
    }

    if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
    }

    return { width, height };
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
