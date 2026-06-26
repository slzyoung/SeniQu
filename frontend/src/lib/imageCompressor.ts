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
    /** Aspect ratio crop target (e.g. "1:1", "4:3", "16:9", "9:16", "original") */
    aspectRatio?: string;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    outputType: 'image/webp',
    aspectRatio: 'original',
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

        let cropX = 0;
        let cropY = 0;
        let cropWidth = bitmap.width;
        let cropHeight = bitmap.height;
        let targetWidth = bitmap.width;
        let targetHeight = bitmap.height;

        if (opts.aspectRatio && opts.aspectRatio !== 'original') {
            const [wRatio, hRatio] = opts.aspectRatio.split(':').map(Number);
            if (wRatio && hRatio) {
                const targetAspect = wRatio / hRatio;
                const currentAspect = bitmap.width / bitmap.height;

                if (currentAspect > targetAspect) {
                    cropHeight = bitmap.height;
                    cropWidth = Math.round(bitmap.height * targetAspect);
                    cropX = Math.round((bitmap.width - cropWidth) / 2);
                    cropY = 0;
                } else {
                    cropWidth = bitmap.width;
                    cropHeight = Math.round(bitmap.width / targetAspect);
                    cropX = 0;
                    cropY = Math.round((bitmap.height - cropHeight) / 2);
                }
                const dimensions = calculateDimensions(cropWidth, cropHeight, opts.maxWidth, opts.maxHeight);
                targetWidth = dimensions.width;
                targetHeight = dimensions.height;
            } else {
                const dimensions = calculateDimensions(bitmap.width, bitmap.height, opts.maxWidth, opts.maxHeight);
                targetWidth = dimensions.width;
                targetHeight = dimensions.height;
            }
        } else {
            const dimensions = calculateDimensions(bitmap.width, bitmap.height, opts.maxWidth, opts.maxHeight);
            targetWidth = dimensions.width;
            targetHeight = dimensions.height;
        }

        // Use OffscreenCanvas if available (better performance)
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.warn('[ImageCompressor] Canvas context unavailable, returning original');
            return file;
        }

        ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
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
            `[ImageCompressor] ${formatSize(file.size)} → ${formatSize(blob.size)} (${compressionRatio}% reduction, ${targetWidth}x${targetHeight})`
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
