/**
 * Artist DTO Validation Classes (OWASP A03 — Injection Prevention)
 * Uses class-validator for strict input validation on all artist endpoints
 */

import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    MaxLength,
    MinLength,
    IsEnum,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

// ============================================
// ARTWORK DTOs
// ============================================

export enum ArtworkStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived",
}

export class CreateArtworkDto {
    @ApiProperty({ description: "Artwork title", maxLength: 200 })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    title: string

    @ApiProperty({ description: "Artwork description", maxLength: 5000 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    description: string

    @ApiProperty({ description: "Category", maxLength: 100 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    category: string

    @ApiPropertyOptional({ description: "Region", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    region?: string

    @ApiPropertyOptional({ description: "Era/period", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    era?: string

    @ApiPropertyOptional({ description: "Medium used", maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    medium?: string

    @ApiPropertyOptional({ description: "Dimensions", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    dimensions?: string

    @ApiProperty({ description: "Image URL" })
    @IsString()
    @IsNotEmpty()
    @IsUrl({}, { message: "imageUrl must be a valid URL" })
    imageUrl: string

    @ApiPropertyOptional({ enum: ArtworkStatus, description: "Status" })
    @IsOptional()
    @IsEnum(ArtworkStatus)
    status?: ArtworkStatus
}

export class UpdateArtworkDto {
    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string

    @ApiPropertyOptional({ maxLength: 5000 })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string

    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    category?: string

    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    region?: string

    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    era?: string

    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    medium?: string

    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    dimensions?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsUrl({}, { message: "imageUrl must be a valid URL" })
    imageUrl?: string

    @ApiPropertyOptional({ enum: ArtworkStatus })
    @IsOptional()
    @IsEnum(ArtworkStatus)
    status?: ArtworkStatus
}

// ============================================
// PROFILE DTOs
// ============================================

export class UpdateArtistProfileDto {
    @ApiPropertyOptional({ description: "Display name", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    displayName?: string

    @ApiPropertyOptional({ description: "Biography", maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    bio?: string

    @ApiPropertyOptional({ description: "Avatar URL" })
    @IsOptional()
    @IsString()
    @IsUrl({}, { message: "avatarUrl must be a valid URL" })
    avatarUrl?: string

    @ApiPropertyOptional({ description: "Social links" })
    @IsOptional()
    socialLinks?: {
        twitter?: string
        instagram?: string
        website?: string
    }
}
