import { ApiProperty } from "@nestjs/swagger"

export interface JwtPayload {
    sub: string
    email: string
    userType: string
    adminRole?: string
}

export class UserResponseDto {
    @ApiProperty()
    id: string

    @ApiProperty()
    email: string

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
}
