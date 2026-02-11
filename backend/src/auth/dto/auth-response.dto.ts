import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger"

export interface JwtPayload {
    sub: string
    email?: string | null
    userType: string
    adminRole?: string
}

export class UserResponseDto {
    @ApiProperty()
    id: string

    @ApiProperty({ required: false })
    email?: string | null

    @ApiProperty({ required: false })
    username?: string

    @ApiProperty()
    displayName?: string

    @ApiProperty()
    userType: string

    @ApiProperty()
    adminRole?: string

    @ApiProperty()
    walletAddress?: string

    @ApiProperty()
    createdAt: Date
}

export class AuthResponseDto {
    @ApiProperty({ type: UserResponseDto })
    user: any

    @ApiProperty()
    accessToken: string

    @ApiProperty()
    refreshToken: string

    @ApiResponseProperty()
    isNewUser?: boolean
}
