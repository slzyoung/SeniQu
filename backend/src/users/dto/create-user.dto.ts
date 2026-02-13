import { IsString, IsEmail, IsOptional, IsEnum } from "class-validator"

export class CreateUserDto {
    @IsEmail()
    @IsOptional()
    email?: string

    @IsString()
    @IsOptional()
    password?: string

    @IsString()
    @IsOptional()
    username?: string

    @IsString()
    @IsOptional()
    displayName?: string

    @IsString()
    @IsOptional()
    userType?: string

    @IsString()
    @IsOptional()
    privyId?: string

    @IsString()
    @IsOptional()
    googleId?: string

    @IsOptional()
    isVerified?: boolean
}
