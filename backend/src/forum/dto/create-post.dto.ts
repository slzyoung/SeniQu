/**
 * Create Post DTO (Reply to thread)
 */

import { IsString, IsUUID, IsOptional, MaxLength, MinLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreatePostDto {
    @ApiProperty({ description: "Post content" })
    @IsString()
    @MinLength(1)
    @MaxLength(50000)
    content: string

    @ApiPropertyOptional({ description: "Parent post ID for nested replies" })
    @IsOptional()
    @IsUUID()
    parent_id?: string
}
