import { IsString, IsOptional, IsEnum, IsObject } from "class-validator"
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

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    profileVideoUrl?: string

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    socialLinks?: Record<string, string>

    @ApiPropertyOptional()
    @IsOptional()
    notificationPrefs?: Record<string, boolean>

    @ApiPropertyOptional()
    @IsOptional()
    isTwoFactorEnabled?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    loginAlertsEnabled?: boolean
}
