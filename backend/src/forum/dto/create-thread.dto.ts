/**
 * Create Thread DTO
 */

import { IsString, IsUUID, IsOptional, IsArray, MaxLength, MinLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"

export class CreateThreadDto {
    @ApiProperty({ description: "Category ID" })
    @IsUUID()
    category_id: string

    @ApiProperty({ description: "Thread title", maxLength: 255 })
    @IsString()
    @MinLength(5)
    @MaxLength(255)
    @Transform(({ value }) => value?.trim())
    title: string

    @ApiProperty({ description: "Thread content" })
    @IsString()
    @MinLength(10)
    @MaxLength(50000)
    content: string

    @ApiPropertyOptional({ description: "Tags", type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[]
}
