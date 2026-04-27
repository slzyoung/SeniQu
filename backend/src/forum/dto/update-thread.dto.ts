/**
 * Update Thread DTO
 */

import { IsString, IsOptional, IsArray, MaxLength, MinLength } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"

export class UpdateThreadDto {
    @ApiPropertyOptional({ description: "Thread title", maxLength: 255 })
    @IsOptional()
    @IsString()
    @MinLength(5)
    @MaxLength(255)
    @Transform(({ value }) => value?.trim())
    title?: string

    @ApiPropertyOptional({ description: "Thread content" })
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(50000)
    content?: string

    @ApiPropertyOptional({ description: "Tags", type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[]
}
