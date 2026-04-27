/**
 * Update Post DTO
 */

import { IsString, IsOptional, MaxLength, MinLength } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class UpdatePostDto {
    @ApiPropertyOptional({ description: "Post content" })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(50000)
    content?: string
}
