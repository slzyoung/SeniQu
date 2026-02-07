/**
 * Search Museum DTO - Query parameters validation
 */

import { IsOptional, IsString, IsInt, IsBoolean, Min, Max } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type, Transform } from "class-transformer"

export class SearchMuseumDto {
    @ApiPropertyOptional({ description: "Page number", default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1

    @ApiPropertyOptional({ description: "Items per page", default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20

    @ApiPropertyOptional({ description: "Filter by city" })
    @IsOptional()
    @IsString()
    city?: string

    @ApiPropertyOptional({ description: "Filter by type", enum: ["museum", "gallery", "studio"] })
    @IsOptional()
    @IsString()
    type?: string

    @ApiPropertyOptional({ description: "Search by name or description" })
    @IsOptional()
    @IsString()
    search?: string

    @ApiPropertyOptional({ description: "Filter by verification status" })
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    verified?: boolean
}
