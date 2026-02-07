import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../users/users.service"
import { PrivyService } from "./privy.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { AuthResponseDto, JwtPayload } from "./dto/auth-response.dto"
import * as bcrypt from "bcryptjs"

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly privyService: PrivyService,
    ) { }

    /**
     * Authenticate user with Privy token
     */
    async authenticateWithPrivy(privyToken: string): Promise<AuthResponseDto> {
        // Verify Privy token
        const privyUser = await this.privyService.verifyToken(privyToken)

        if (!privyUser) {
            throw new UnauthorizedException("Invalid Privy token")
        }

        // Find or create user
        let user = await this.usersService.findByPrivyId(privyUser.id)

        if (!user) {
            user = await this.usersService.create({
                privyId: privyUser.id,
                email: privyUser.email?.address,
                walletAddress: privyUser.wallet?.address,
                userType: "ART_LOVER",
            })
        }

        // Generate JWT
        const tokens = await this.generateTokens(user)

        return {
            user,
            ...tokens,
        }
    }

    /**
     * Register new user
     */
    async register(dto: RegisterDto): Promise<AuthResponseDto> {
        const existingUser = await this.usersService.findByEmail(dto.email)

        if (existingUser) {
            throw new UnauthorizedException("Email already registered")
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12)

        const user = await this.usersService.create({
            email: dto.email,
            password: hashedPassword,
            displayName: dto.displayName,
            userType: dto.userType || "ART_LOVER",
        })

        const tokens = await this.generateTokens(user)

        return {
            user,
            ...tokens,
        }
    }

    /**
     * Login with email/password
     */
    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.usersService.findByEmail(dto.email)

        if (!user || !user.password) {
            throw new UnauthorizedException("Invalid credentials")
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password)

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials")
        }

        const tokens = await this.generateTokens(user)

        return {
            user,
            ...tokens,
        }
    }

    /**
     * Link wallet to existing account
     */
    async linkWallet(userId: string, walletAddress: string, signature: string): Promise<void> {
        // Verify wallet signature
        const isValid = await this.verifyWalletSignature(walletAddress, signature)

        if (!isValid) {
            throw new UnauthorizedException("Invalid wallet signature")
        }

        await this.usersService.updateWallet(userId, walletAddress)
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get<string>("auth.jwtSecret"),
            })

            const user = await this.usersService.findById(payload.sub)

            if (!user) {
                throw new UnauthorizedException("User not found")
            }

            const accessToken = this.jwtService.sign({
                sub: user.id,
                email: user.email,
                userType: user.userType,
                adminRole: user.adminRole,
            })

            return { accessToken }
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token")
        }
    }

    /**
     * Generate access and refresh tokens
     */
    private async generateTokens(user: any) {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            userType: user.userType,
            adminRole: user.adminRole,
        }

        const accessToken = this.jwtService.sign(payload)

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get<string>("auth.jwtRefreshExpiresIn"),
        })

        return { accessToken, refreshToken }
    }

    /**
     * Verify Solana wallet signature
     */
    private async verifyWalletSignature(
        walletAddress: string,
        signature: string,
    ): Promise<boolean> {
        // TODO: Implement Solana signature verification using tweetnacl
        return true
    }
}
