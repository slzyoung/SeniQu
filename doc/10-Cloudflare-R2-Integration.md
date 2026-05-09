# 10. Cloudflare R2 Integration & CDN Storage

This document provides a comprehensive overview of the **Cloudflare R2** integration within the SeniQu platform. Cloudflare R2 is an S3-compatible object storage service that provides zero egress fees and seamless edge caching, making it the ideal CDN backend for storing artwork images, user avatars, and system assets.

---

## 1. Architecture Overview

### Previous State
Initially, artwork uploads and image data across the platform relied on encoding files into base64 Data URIs, which were sent to the database as plain strings (`imageUrl`). This resulted in very large payload constraints and significant DB storage overhead.

### Current State (R2 Implementation + Optimization Pipeline)
With the R2 CDN integration and the new End-to-End Image Processing Pipeline:
1. **Frontend (Pre-compression)**: Images selected by the user are intercepted by a client-side `ImageCompressor` (using `OffscreenCanvas`) to resize and compress to WebP before hitting the network, ensuring ultra-fast uploads even on mobile data.
2. **Backend (Server-side Processing)**: The `ImageProcessingService` intercepts the binary payload. Using the high-performance `sharp` library, it strips EXIF metadata (for privacy) and applies strict responsive resizing presets (Avatars: 400px, Artworks: 2048px). It forces final conversion to WebP format.
3. **Storage Upload**: The highly optimized binary is uploaded to Cloudflare R2 securely.
4. **Storage Endpoint**: Returns the generated CDN URL (Public R2 URL).
5. **Database**: Saves only the lightweight URL string. The optimized WebP images are then served directly from the CDN edge.

---

## 2. Environment Variables & Configuration

Cloudflare R2 configurations are housed under `src/config/configuration.ts` mapping and validated through Joi schemas.

In the `.env`, you must provide the following keys to access R2 correctly. You can obtain these from the **Cloudflare Dashboard → R2 → Manage API Tokens**.

```env
# ===========================================
# CLOUDFLARE R2 STORAGE (CDN)
# ===========================================
# ID of the Cloudflare account (Found on R2 dashboard)
R2_ACCOUNT_ID=your-cloudflare-account-id

# Dedicated R2 Access Key ID
R2_ACCESS_KEY_ID=your-r2-access-key-id

# Dedicated R2 Secret Access Key
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key

# The designated bucket name (default: seniqu-assets)
R2_BUCKET_NAME=seniqu-assets

# Public domain/Custom domain pointing to the bucket
# Format: https://pub-<abc>.r2.dev or your custom domain
R2_PUBLIC_URL=https://your-r2-bucket.r2.cloudflarestorage.com
```

### Fallback Behavior
In Development mode, if the R2 configurations are not completely filled, the NestJS `StorageService` initializes but emits a warning in the terminal. Without accurate credentials, subsequent file uploads will throw HTTP 500 exceptions. 

---

## 3. Backend Module (`src/storage`)

An independent module handles S3 communications.

### Dependencies
- `@aws-sdk/client-s3`: Official standardized client configured to route to Cloudflare endpoints.
- `multer` & `@types/multer`: For standard multipart HTTP payload interceptors.
- `uuid`: Generating collision-free object keys.

### 3.1. `StorageService` (`storage.service.ts`)
The `StorageService` provides standard AWS-S3 compatible directives (`PutObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`).
- **Initialization**: Bootstraps the `S3Client` mapping the generic region `"auto"` to Cloudflare's regional domains.
- **Categorization**: Accommodates optional bucket folders string: `folder=avatars`, `artworks`, `videos`.
- **Validation Gates**: Prevents non-image/non-video files (or executables) from bypassing to object storage.
- **Image Processing Hook**: It injects the `ImageProcessingService` automatically for incoming image streams before pushing to R2. If R2 fails, it gracefully falls back to Base64 database encoding.

### 3.2. `ImageProcessingService` (`image-processing.service.ts`)
A dedicated service utilizing `sharp` for enterprise-grade media manipulation.
- **WebP Conversion**: All valid raster images (JPEG, PNG, etc.) are converted to highly optimized WebP format (70-80% size reduction).
- **Responsive Presets**: 
  - `avatars`: aggressive scaling (max 400x400) at 75% quality.
  - `artworks`: high-fidelity scaling (max 2048x2048) at 85% quality to preserve artistic details.
  - `general`: standard scaling (max 1600x1600) at 80% quality.
- **Privacy Enforcement**: Strips all EXIF metadata (GPS coordinates, device models) to protect user anonymity.
- **Graceful Skipping**: Safely ignores PDFs, SVGs, and GIFs (to preserve animations).

### 3.3. `StorageController` (`storage.controller.ts`)
Creates two crucial guarded endpoints:

1. **`POST /api/v1/storage/upload`**
    - `multipart/form-data` containing `file` and `folder`.
    - Protected via `JwtAuthGuard`. Only verified token holders can initiate an upload.
2. **`DELETE /api/v1/storage/:key`**
    - Accepts a splat parameter key (e.g., `artworks/xyz-123.jpg`).
    - Guarded with `JwtAuthGuard` and `PermissionsGuard` demanding the `Permission.ADMIN_DASHBOARD`. Standard users cannot arbitrarily purge data.

---

## 4. Frontend Integration

A standard centralized `uploadFile` util has been established within `api.ts`. All feature services that leverage CDN offloading utilize this unified abstraction.

### 4.1. The `uploadFile` Utility
Located in `frontend/src/lib/api.ts`:
```typescript
export async function uploadFile(
    file: File,
    folder: 'artworks' | 'avatars' | 'videos' | 'collections' | 'general' = 'general',
    onProgress?: (progress: number) => void
): Promise<{ key: string; url: string; size: number; contentType: string }>
```
- Attaches the CSRF and typical Authoritarian payloads.
- Fires an optional progress callback mapping Axios upload progress bits (useful for UI progress bars).

### 4.2. Implementation Scopes

#### **Upload Artwork (`UploadArtwork.tsx`)**
- Allows Drag-and-Drop or direct file selection.
- Intercepts file with client-side `compressImage(file, { maxWidth: 2048, quality: 0.88 })`.
- Resolves file into the centralized `uploadFile(file, 'artworks')`.
- Returns the URL injected natively to `imageUrl` in the standard Artwork DB schema mutation logic (`createArtwork.mutateAsync`).

#### **Avatar Images (`userService.ts`)**
- Intercepts file with client-side `compressImage(file, { maxWidth: 400, quality: 0.8 })`.
- Calling `userService.uploadAvatar(file)` invokes the CDN flow `uploadFile(file, 'avatars')`.
- Updates profile avatar with minimal request cost.

#### **Community Forum (`CommunityPage.tsx`)**
- Forum attachments are pre-compressed locally before hitting the `createThread` APIs. This prevents payload throttling during high-concurrency periods.

#### **AI Image Generation/Detection (`aiService.ts`)**
- Pre-requisite step for querying robust AI detection endpoints requires edge-storing the artifact safely.
- Images uploaded through `aiService` funnel through the CDN root level (folder: `general`).

---

## 5. Security Posture & Safeguards

1. **Anti-Malware Filtering**: The S3 Client forcibly limits Accept MIME types exclusively to standard safe graphics formats.
2. **Path Traversal Constraints**: Utilizing deterministic Key logic (`{folder}/{uuid}.{ext}`). An attacker cannot manipulate destination keys using `../` directory traversal.
3. **Global Edge Delivery**: Setting `CacheControl: "public, max-age=31536000, immutable"` inside the S3 PutObject param header forces the Cloudflare edge to persist CDN hits heavily, saving egress requests.
4. **Access Control**: Users can independently read public assets via URL, but altering or provisioning files natively requires explicit JWT and internal Controller proxy. Direct client-to-R2 (Pre-Signed URLs) is disabled as default to allow NestJS telemetry.

---

## 6. Next Steps & Recommended Scalability Measures

* **Clean-up Cron-jobs**: Orphaned uploads (where the file succeeds CDN transmission but the DB hook fails) ought to be scrubbed via scheduled bucket reconciliations.
* **Batch Operations**: Support `/storage/upload-batch` parameter architectures once multi-item galleries are standardized.
