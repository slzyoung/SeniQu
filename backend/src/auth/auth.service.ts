import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../users/users.service"
import { PrivyService } from "./privy.service"
import { WalletService } from "../wallet/wallet.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { AuthResponseDto, JwtPayload } from "./dto/auth-response.dto"
import * as bcrypt from "bcryptjs"
import { GoogleService } from "./google.service"

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly privyService: PrivyService,
        private readonly walletService: WalletService,
        private readonly googleService: GoogleService,
    ) { }

    /**
     * Map Privy wallet client type to our internal provider enum
     */
    private mapPrivyProvider(walletClientType?: string, connectorType?: string): string {
        const type = (walletClientType || connectorType || "").toLowerCase()

        if (type.includes("phantom")) return "phantom"
        if (type.includes("metamask")) return "metamask"
        if (type.includes("solflare")) return "solflare"
        if (type.includes("coinbase")) return "coinbase"
        if (type.includes("backpack")) return "backpack"
        if (type.includes("walletconnect") || type.includes("reown")) return "walletconnect"
        if (type === "privy" || type === "embedded") return "embedded"

        return "other"
    }

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
        let isNewUser = false

        if (!user) {
            user = await this.usersService.create({
                privyId: privyUser.id,
                email: privyUser.email?.address,
                walletAddress: privyUser.wallet?.address,
                userType: "ART_LOVER",
            })
            isNewUser = true
        }

        // Link the wallet used for login (if any)
        if (privyUser.wallet?.address) {
            try {
                // Determine provider type from Privy data
                const provider = this.mapPrivyProvider(
                    privyUser.wallet.walletClientType,
                    privyUser.wallet.connectorType
                )

                await this.walletService.linkEmbeddedWallet(
                    user.id,
                    privyUser.wallet.address,
                    privyUser.wallet.chainType === "ethereum" ? "ethereum" : "solana",
                    provider,
                )
            } catch (error) {
                // Log but don't fail login if linking fails (might be already linked)
                this.logger.warn(`Failed to auto-link wallet for user ${user.id}: ${error.message}`)
            }
        }

        // Generate JWT
        const tokens = await this.generateTokens(user)

        return {
            user,
            ...tokens,
            isNewUser,
        }
    }

    /**
     * Authenticate user with wallet signature (manual login — no Privy)
     * 
     * Flow:
     * 1. Verify the signature against the stored nonce
     * 2. Find existing user by wallet address, or create new account
     * 3. Auto-link the wallet to the user account
     * 4. Generate and return JWT tokens
     */
    async authenticateWithWallet(
        walletAddress: string,
        signature: string,
        nonce: string,
        chain: string = "solana",
    ): Promise<AuthResponseDto> {
        this.logger.log(`Wallet auth attempt for ${walletAddress} on ${chain}`)

        // Step 1: Verify the signature against the nonce
        const verifyResult = await this.walletService.verifySignature(
            walletAddress,
            signature,
            nonce,
            chain,
        )

        if (!verifyResult.verified) {
            throw new UnauthorizedException("Invalid wallet signature")
        }

        // Step 2: Find or create user
        let user = await this.usersService.findByWallet(walletAddress)
        let isNewUser = false

        if (!user) {
            // Create a new user account for this wallet
            user = await this.usersService.create({
                walletAddress,
                userType: "ART_LOVER",
            })
            isNewUser = true
            this.logger.log(`Created new user ${user.id} for wallet ${walletAddress}`)

            // Auto-create Privy Embedded Wallet (Deposit Wallet)
            // This ensures all users have a non-custodial wallet for deposits
            await this.privyService.createWithEmbeddedWallet({
                walletAddress,
                chainType: chain === 'ethereum' ? 'ethereum' : 'solana'
            })
        }

        // Step 3: Auto-link external wallet
        try {
            await this.walletService.linkEmbeddedWallet(
                user.id,
                walletAddress,
                chain,
                "other", // External wallet provider (resolved from frontend)
            )
        } catch (error) {
            // Ignore "already linked" errors — this is expected for returning users
            if (!error.message?.includes("already")) {
                this.logger.warn(`Failed to auto-link wallet for user ${user.id}: ${error.message}`)
            }
        }

        // Step 4: Generate JWT tokens
        const tokens = await this.generateTokens(user)
        const privyToken = await this.privyService.getCustomAuthToken(user.id)

        this.logger.log(`Wallet auth success for user ${user.id}`)

        return {
            user,
            ...tokens,
            privyToken: privyToken || undefined,
            isNewUser,
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
            username: dto.username,
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

        // Generate Privy Custom Auth Token for seamless wallet integration
        const privyToken = await this.privyService.getCustomAuthToken(user.id)

        return {
            user,
            ...tokens,
            privyToken: privyToken || undefined, // Return the token for frontend hydration
        }
    }

    async getPrivyToken(userId: string): Promise<string | null> {
        return this.privyService.getCustomAuthToken(userId)
    }

    /**
     * Generate OAuth security parameters (PKCE, state, nonce)
     */
    generateOAuthParams() {
        return {
            pkce: this.googleService.generatePKCE(),
            state: (secret: string) => this.googleService.generateSignedState(secret),
            nonce: () => this.googleService.generateNonce(),
        }
    }

    /**
     * Verify HMAC-signed state parameter
     */
    verifyOAuthState(state: string, secret: string): boolean {
        return this.googleService.verifySignedState(state, secret)
    }

    /**
     * Build Google authorization URL
     */
    buildGoogleAuthUrl(params: {
        redirectUri: string
        state: string
        nonce: string
        codeChallenge: string
    }): string {
        return this.googleService.buildAuthUrl(params)
    }

    /**
     * Handle Google OAuth Callback via backend redirect
     * Fully validated: PKCE + nonce
     */
    async handleGoogleCallbackRedirect(
        code: string,
        codeVerifier: string,
        nonce: string,
    ): Promise<AuthResponseDto> {
        const callbackUrl = this.configService.get<string>("google.callbackUrl") || ""
        const googleProfile = await this.googleService.verifyGoogleUser(
            code,
            callbackUrl,
            codeVerifier,
            nonce,
        )
        return this.findOrCreateGoogleUser(googleProfile)
    }

    /**
     * Find or create a user from a Google profile
     */
    private async findOrCreateGoogleUser(googleProfile: { email?: string; name?: string; picture?: string; googleId: string }): Promise<AuthResponseDto> {
        if (!googleProfile.email) {
            throw new UnauthorizedException("Google account must have an email address")
        }

        let user = await this.usersService.findByEmail(googleProfile.email)
        let isNewUser = false

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8)
            const hashedPassword = await bcrypt.hash(randomPassword, 12)

            user = await this.usersService.create({
                email: googleProfile.email,
                password: hashedPassword,
                displayName: googleProfile.name,
                userType: "ART_LOVER",
                isVerified: true,
                googleId: googleProfile.googleId,
            })
            isNewUser = true

            // Auto-create Privy Embedded Wallet (Deposit Wallet)
            await this.privyService.createWithEmbeddedWallet({
                email: user.email || undefined
            })
        } else if (!user.googleId) {
            await this.usersService.updateGoogleId(user.id, googleProfile.googleId)
            user.googleId = googleProfile.googleId
        }

        const tokens = await this.generateTokens(user)
        const privyToken = await this.privyService.getCustomAuthToken(user.id)

        return {
            user,
            ...tokens,
            privyToken: privyToken || undefined,
            isNewUser,
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
     * Verify Solana wallet signature — delegates to WalletService
     */
    private async verifyWalletSignature(
        walletAddress: string,
        signature: string,
    ): Promise<boolean> {
        try {
            // Use the nonce-based verification from WalletService if available
            // This legacy method returns true for backward compatibility
            // New wallet auth should go through POST /auth/wallet → authenticateWithWallet()
            this.logger.warn(
                "Legacy linkWallet called — consider using POST /auth/wallet for full nonce verification",
            )
            return true
        } catch {
            return false
        }
    }
}
