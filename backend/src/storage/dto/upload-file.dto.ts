import { IsOptional, IsString, IsIn } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class UploadFileDto {
    @ApiPropertyOptional({
        description: "Subfolder to organize uploads",
        enum: ["artworks", "avatars", "videos", "collections", "general"],
        default: "general",
    })
    @IsString()
    @IsOptional()
    @IsIn(["artworks", "avatars", "videos", "collections", "general"])
    folder?: string
}

export interface UploadResult {
    key: string
    url: string
    size: number
    contentType: string
}
