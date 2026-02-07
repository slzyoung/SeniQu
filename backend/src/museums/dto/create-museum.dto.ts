/**
 * Create Museum DTO - Enterprise Validation
 * OWASP: Input sanitization and validation
 */

import {
    IsString,
    IsOptional,
    IsEmail,
    IsUrl,
    IsNumber,
    IsPositive,
    MaxLength,
    MinLength,
    IsObject,
    IsArray,
    Matches,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"

export class CreateMuseumDto {
    @ApiProperty({ description: "Museum or gallery name", example: "Museum Nasional Indonesia" })
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    @Transform(({ value }) => value?.trim())
    name: string

    @ApiPropertyOptional({ description: "Detailed description" })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    @Transform(({ value }) => value?.trim())
    description?: string

    @ApiPropertyOptional({ enum: ["museum", "gallery", "studio"], default: "museum" })
    @IsOptional()
    @IsString()
    @Matches(/^(museum|gallery|studio)$/, { message: "Type must be museum, gallery, or studio" })
    type?: string = "museum"

    // Address
    @ApiPropertyOptional({ description: "Street address" })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    street?: string

    @ApiProperty({ description: "City", example: "Jakarta" })
    @IsString()
    @MaxLength(100)
    city: string

    @ApiPropertyOptional({ description: "Province/State", example: "DKI Jakarta" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    province?: string

    @ApiPropertyOptional({ description: "Postal/ZIP code" })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Matches(/^[A-Z0-9\s-]{3,20}$/i, { message: "Invalid postal code format" })
    postal_code?: string

    @ApiPropertyOptional({ default: "Indonesia" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string = "Indonesia"

    // Contact
    @ApiPropertyOptional({ description: "Phone number" })
    @IsOptional()
    @IsString()
    @Matches(/^[\d\s\-+()]+$/, { message: "Invalid phone number format" })
    @MaxLength(20)
    phone?: string

    @ApiPropertyOptional({ description: "Contact email" })
    @IsOptional()
    @IsEmail()
    @MaxLength(320)
    email?: string

    @ApiPropertyOptional({ description: "Official website URL" })
    @IsOptional()
    @IsUrl()
    website?: string

    // Media
    @ApiPropertyOptional({ description: "Logo image URL" })
    @IsOptional()
    @IsUrl()
    logo_url?: string

    @ApiPropertyOptional({ description: "Cover image URL" })
    @IsOptional()
    @IsUrl()
    cover_image_url?: string

    @ApiPropertyOptional({ description: "Additional images", type: [String] })
    @IsOptional()
    @IsArray()
    images?: string[]

    // Business
    @ApiPropertyOptional({
        description: "Opening hours JSON",
        example: { monday: "09:00-17:00", tuesday: "09:00-17:00" },
    })
    @IsOptional()
    @IsObject()
    opening_hours?: Record<string, string>

    @ApiPropertyOptional({ description: "Admission fee in IDR" })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    admission_fee?: number
}
