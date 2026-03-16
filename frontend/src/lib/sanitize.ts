/**
 * Input Sanitization Utility
 * Client-side XSS prevention for user inputs before sending to API
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script content
 */
export function sanitizeString(input: string): string {
    if (!input) return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

/**
 * Sanitize an object recursively — clean all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj } as any;
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeString(sanitized[key]);
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeObject(sanitized[key]);
        }
    }
    return sanitized;
}

/**
 * Validate and sanitize a file for upload
 * Returns null if the file is invalid
 */
export function validateUploadFile(
    file: File,
    options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    } = {}
): { valid: boolean; error?: string } {
    const { maxSizeMB = 50, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } = options;

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${maxSizeMB}MB` };
    }

    // Check for suspicious filenames
    const suspiciousPatterns = /\.(exe|bat|cmd|sh|php|asp|jsp|cgi)$/i;
    if (suspiciousPatterns.test(file.name)) {
        return { valid: false, error: 'Suspicious file extension detected' };
    }

    return { valid: true };
}

/**
 * Debounce utility to prevent rapid repeated calls (anti-chunking)
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    waitMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), waitMs);
    };
}
