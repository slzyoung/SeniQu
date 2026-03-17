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
    ValidateNested,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform, Type } from "class-transformer"

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
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    title: string

    @ApiProperty({ description: "Artwork description", maxLength: 5000 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    description: string

    @ApiProperty({ description: "Category", maxLength: 100 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    category: string

    @ApiPropertyOptional({ description: "Region", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    region?: string

    @ApiPropertyOptional({ description: "Era/period", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
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

    @ApiProperty({ description: "Image URL or Base64 string" })
    @IsString()
    @IsNotEmpty()
    imageUrl: string

    @ApiPropertyOptional({ description: "Status" })
    @IsOptional()
    @IsString()
    status?: string
}

export class UpdateArtworkDto {
    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    title?: string

    @ApiPropertyOptional({ maxLength: 5000 })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
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
    imageUrl?: string

    @ApiPropertyOptional({ description: "Status" })
    @IsOptional()
    @IsString()
    status?: string
}

// ============================================
// PROFILE DTOs
// ============================================

class SocialLinksDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    twitter?: string

    @IsOptional()
    @IsString()
    @MaxLength(500)
    instagram?: string

    @IsOptional()
    @IsString()
    @MaxLength(500)
    website?: string
}

export class UpdateArtistProfileDto {
    @ApiPropertyOptional({ description: "Display name", maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    displayName?: string

    @ApiPropertyOptional({ description: "Biography", maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    bio?: string

    @ApiPropertyOptional({ description: "Avatar URL" })
    @IsOptional()
    @IsString()
    @IsUrl({}, { message: "avatarUrl must be a valid URL" })
    avatarUrl?: string

    @ApiPropertyOptional({ description: "Social links" })
    @IsOptional()
    @ValidateNested()
    @Type(() => SocialLinksDto)
    socialLinks?: SocialLinksDto
}
