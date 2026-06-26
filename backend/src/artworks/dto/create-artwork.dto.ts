import { IsString, IsOptional, IsUrl } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreateArtworkDto {
    @ApiProperty()
    @IsString()
    title: string

    @ApiProperty()
    @IsString()
    description: string

    @ApiProperty()
    @IsString()
    category: string

    @ApiProperty()
    @IsString()
    region: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    era?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    medium?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    dimensions?: string

    @ApiProperty()
    @IsUrl()
    imageUrl: string

    @ApiPropertyOptional()
    @IsOptional()
    price?: number

    @ApiPropertyOptional()
    @IsOptional()
    isForSale?: boolean

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    artworkType?: string

    @ApiPropertyOptional()
    @IsOptional()
    poaCertificate?: any
}
