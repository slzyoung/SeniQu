import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export enum UserType {
    ART_LOVER = "ART_LOVER",
    ARTIST = "ARTIST",
    COLLECTOR = "COLLECTOR",
    INSTITUTION = "INSTITUTION",
}

export class RegisterDto {
    @ApiProperty({ example: "user@example.com" })
    @IsEmail()
    email: string

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string

    @ApiPropertyOptional({ example: "johndoe" })
    @IsString()
    @IsOptional()
    username?: string

    @ApiPropertyOptional({ example: "John Doe" })
    @IsString()
    @IsOptional()
    displayName?: string

    @ApiPropertyOptional({ enum: UserType, default: UserType.ART_LOVER })
    @IsEnum(UserType)
    @IsOptional()
    userType?: UserType

    @ApiPropertyOptional({ description: "Cloudflare Turnstile CAPTCHA token" })
    @IsString()
    @IsOptional()
    turnstileToken?: string

    /**
     * Honeypot field — invisible to real users, but bots auto-fill it.
     * If this field has a value, the request is silently rejected.
     */
    @ApiPropertyOptional({ description: "Do not fill this field (anti-bot)" })
    @IsString()
    @IsOptional()
    website?: string
}

