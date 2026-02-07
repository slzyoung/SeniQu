/**
 * Track Event DTO
 */

import { IsString, IsOptional, IsUUID, IsObject } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class TrackEventDto {
    @ApiProperty({ description: "Event type", example: "page_view" })
    @IsString()
    eventType: string

    @ApiPropertyOptional({ description: "Event data" })
    @IsOptional()
    @IsObject()
    eventData?: Record<string, any>

    @ApiPropertyOptional({ description: "User ID" })
    @IsOptional()
    @IsUUID()
    userId?: string

    @ApiPropertyOptional({ description: "Page URL" })
    @IsOptional()
    @IsString()
    pageUrl?: string

    @ApiPropertyOptional({ description: "Referrer URL" })
    @IsOptional()
    @IsString()
    referrer?: string
}
