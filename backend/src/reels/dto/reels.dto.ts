import { IsOptional, IsString, IsArray, MaxLength } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class CreateReelDto {
    @ApiPropertyOptional({ description: "Caption for the reel", maxLength: 2200 })
    @IsString()
    @IsOptional()
    @MaxLength(2200)
    caption?: string

    @ApiPropertyOptional({ description: "Hashtags array" })
    @IsArray()
    @IsOptional()
    hashtags?: string[]

    @ApiPropertyOptional({ description: "Location name" })
    @IsString()
    @IsOptional()
    locationName?: string

    @ApiPropertyOptional({ description: "Location latitude" })
    @IsOptional()
    locationLat?: number

    @ApiPropertyOptional({ description: "Location longitude" })
    @IsOptional()
    locationLng?: number
}

export class CreateReelCommentDto {
    @ApiPropertyOptional({ description: "Comment content", maxLength: 1000 })
    @IsString()
    @MaxLength(1000)
    content: string

    @ApiPropertyOptional({ description: "Parent comment ID for replies" })
    @IsString()
    @IsOptional()
    parentId?: string
}

export class ReshareReelDto {
    @ApiPropertyOptional({ description: "Optional caption for reshare" })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    caption?: string
}
