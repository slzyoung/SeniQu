import { IsOptional, IsString, IsIn } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class UploadFileDto {
    @ApiPropertyOptional({
        description: "Subfolder to organize uploads",
        enum: [
            "artworks",
            "avatars",
            "videos",
            "collections",
            "general",
            "profile-images",
            "museums",
            "ar-markers",
            "audio-guides",
            "video-previews",
            "ai-outputs",
            "static",
            "artist-profiles",
            "creator-profiles",
            "artist-banners",
            "creator-banners",
            "collector-profiles",
            "collector-banners",
            "forum-videos",
            "forum-thumbnails"
        ],
        default: "general",
    })
    @IsString()
    @IsOptional()
    @IsIn([
        "artworks",
        "avatars",
        "videos",
        "collections",
        "general",
        "profile-images",
        "museums",
        "ar-markers",
        "audio-guides",
        "video-previews",
        "ai-outputs",
        "static",
        "artist-profiles",
        "creator-profiles",
        "artist-banners",
        "creator-banners",
        "collector-profiles",
        "collector-banners",
        "forum-videos",
        "forum-thumbnails"
    ])
    folder?: string

    @IsOptional()
    file?: any
}

export interface UploadResult {
    key: string
    url: string
    size: number
    contentType: string
    thumbnailUrl?: string
    thumbnailKey?: string
    mediumUrl?: string
    mediumKey?: string
}

export interface ForumVideoUploadResult extends UploadResult {
    metadata: {
        duration: number
        width: number
        height: number
        videoCodec: string
        audioCodec: string | null
        bitrate: number
        fps: number
        aspectRatio: string
        originalFileSize: number
        compressedFileSize: number
        compressionRatio: number
        originalFilename: string
    }
}
