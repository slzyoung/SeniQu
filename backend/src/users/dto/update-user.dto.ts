import { IsString, IsOptional, IsEnum } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class UpdateUserDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    username?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    displayName?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    userType?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    bio?: string

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatarUrl?: string
}
