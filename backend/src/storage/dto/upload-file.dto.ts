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
            "collector-banners"
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
        "collector-banners"
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
