import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Headers,
    Req,
    Res,
    Query,
    HttpCode,
    HttpStatus,
    Logger,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import { Response } from "express"
import { ConfigService } from "@nestjs/config"
import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { AuthResponseDto } from "./dto/auth-response.dto"
import { VerifyEmailDto } from "./dto/verify-email.dto"
import { VerifyOtpDto, ResendOtpDto } from "./dto/verify-otp.dto"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { PrivyGuard } from "./guards/privy.guard"
import { GetUser } from "./decorators/get-user.decorator"
import { Public } from "./decorators/public.decorator"
import { BypassSecurity } from "../common/decorators/bypass-security.decorator"
import { WalletLoginDto } from "./dto/wallet-login.dto"

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    private readonly logger = new Logger(AuthController.name)

    /**
     * Server-side fallback store for OAuth params.
     * Mobile browsers (Safari ITP, Chrome) block cross-domain cookies
     * between api.seniqu.art and seniquapp.netlify.app, so we also store
     * the PKCE params server-side, keyed by the state parameter.
     * Entries auto-expire after 10 minutes.
     */
    private readonly oauthParamsStore = new Map<string, { codeVerifier: string; state: string; nonce: string; expiresAt: number }>()

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            const now = Date.now()
            for (const [key, value] of this.oauthParamsStore) {
                if (now > value.expiresAt) {
                    this.oauthParamsStore.delete(key)
                }
            }
        }, 5 * 60 * 1000).unref()
    }

    /**
     * Authenticate with wallet signature (manual — no Privy)
     * User sends { walletAddress, signature, nonce, chain }
     * Backend verifies and returns JWT tokens
     */
    @Post("wallet")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Authenticate with wallet signature" })
    @ApiResponse({ status: 200, type: AuthResponseDto })
    async authenticateWithWallet(
        @Body() dto: WalletLoginDto,
    ): Promise<AuthResponseDto> {
        return this.authService.authenticateWithWallet(
            dto.walletAddress,
            dto.signature,
            dto.nonce,
            dto.chain || "solana",
        )
    }

    /**
     * Authenticate with Privy token
     */
    @Post("privy")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Authenticate with Privy token" })
    @ApiResponse({ status: 200, type: AuthResponseDto })
    async authenticateWithPrivy(
        @Headers("x-privy-token") privyToken: string,
        @Body() body: { embeddedWalletAddress?: string },
    ): Promise<AuthResponseDto> {
        return this.authService.authenticateWithPrivy(privyToken, body.embeddedWalletAddress)
    }

    /**
     * Initiate Google OAuth flow (server-side)
     * Generates PKCE, state, nonce — stores them in a signed httpOnly cookie.
     * Returns the Google authorization URL.
     */
    @Get("google/initiate")
    @Public()
    @ApiOperation({ summary: "Initiate Google OAuth (server-side security params)" })
    async initiateGoogleOAuth(
        @Req() req: any,
        @Res() res: any,
    ) {
        const cookieSecret = this.configService.get<string>("google.oauthCookieSecret")
        if (!cookieSecret) {
            this.logger.error("OAUTH_COOKIE_SECRET not configured")
            return res.status(500).send({ error: "Server configuration error" })
        }
        const callbackUrl = this.configService.get<string>("google.callbackUrl") || ""

        // Generate security parameters
        const { codeVerifier, codeChallenge } = this.authService.generateOAuthParams().pkce
        const state = this.authService.generateOAuthParams().state(cookieSecret)
        const nonce = this.authService.generateOAuthParams().nonce()

        // Build the Google auth URL
        const authUrl = this.authService.buildGoogleAuthUrl({
            redirectUri: callbackUrl,
            state,
            nonce,
            codeChallenge,
        })

        // Store in signed httpOnly cookie (client JS cannot access)
        const cookiePayload = JSON.stringify({ codeVerifier, state, nonce })
        const isProduction = this.configService.get("NODE_ENV") === "production"

        // Use Fastify-native setCookie (maxAge in SECONDS for @fastify/cookie)
        const raw = res.raw ? res : req.res // Get Fastify reply
        raw.setCookie("__oauth_params", cookiePayload, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 10 * 60, // 10 minutes in SECONDS (Fastify convention)
            path: "/",
            signed: true,
        })

        // MOBILE FALLBACK: Also store server-side keyed by state.
        // This ensures mobile browsers that block cross-domain cookies
        // can still complete the OAuth flow.
        this.oauthParamsStore.set(state, {
            codeVerifier,
            state,
            nonce,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        })

        this.logger.log(`Google OAuth initiated — PKCE + signed state + nonce (callbackUrl: ${callbackUrl})`)
        return res.send({ authUrl })
    }

    /**
     * Handle Google OAuth Callback (server-side redirect)
     * Google redirects here with ?code=xxx&state=yyy
     * Validates cookie, state signature, exchanges code with PKCE, verifies nonce.
     */
    @Get("google/callback")
    @Public()
    @ApiOperation({ summary: "Handle Google OAuth callback (hardened)" })
    async handleGoogleOAuthCallback(
        @Query("code") code: string,
        @Query("state") state: string,
        @Query("error") error: string,
        @Req() req: any,
        @Res() res: any,
    ) {
        const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniquapp.netlify.app"

        // SAFETY NET: Outer try-catch guarantees a redirect is ALWAYS sent
        // This prevents the blank page issue where the backend hangs
        try {
            const cookieSecret = this.configService.get<string>("google.oauthCookieSecret")
            const isProduction = this.configService.get("NODE_ENV") === "production"

            if (!cookieSecret) {
                this.logger.error("OAUTH_COOKIE_SECRET not configured")
                return res.status(302).redirect(`${frontendUrl}/auth/callback#error=server_error`)
            }

            // Use Fastify-native clearCookie (must match options used when setting)
            const raw = res.raw ? res : req.res
            const clearOAuthCookie = () => {
                try {
                    raw.clearCookie("__oauth_params", {
                        path: "/",
                        httpOnly: true,
                        secure: isProduction,
                        sameSite: isProduction ? "none" : "lax",
                        signed: true,
                    })
                } catch (e) {
                    this.logger.warn(`clearCookie fallback: ${(e as any).message}`)
                }
            }

            // Handle OAuth error from Google
            if (error) {
                this.logger.warn(`Google OAuth error from Google: ${error}`)
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent(error)}`
                )
            }

            if (!code || !state) {
                this.logger.warn("Google OAuth callback missing code or state")
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent("missing_params")}`
                )
            }

            // Debug: Log available cookies
            const allCookieKeys = req.cookies ? Object.keys(req.cookies) : []
            this.logger.debug(`[OAuth CB] Available cookies: [${allCookieKeys.join(", ")}]`)

            // ── Strategy: Try cookie first, then fall back to server-side store ──
            // Mobile browsers often block cross-domain cookies, so we need both.
            let oauthParams: { codeVerifier: string; state: string; nonce: string } | null = null
            let paramsSource = "none"

            // 1) Try reading from the signed cookie (works on desktop browsers)
            const signedCookie = req.cookies?.__oauth_params
            if (signedCookie) {
                try {
                    const unsigned = req.unsignCookie(signedCookie)
                    if (unsigned.valid && unsigned.value) {
                        const parsed = JSON.parse(unsigned.value)
                        if (parsed.codeVerifier && parsed.state && parsed.nonce) {
                            oauthParams = parsed
                            paramsSource = "cookie"
                        }
                    } else {
                        this.logger.warn("[OAuth CB] Cookie signature invalid — trying server-side fallback")
                    }
                } catch (e) {
                    this.logger.warn(`[OAuth CB] Cookie parse failed: ${(e as any).message} — trying server-side fallback`)
                }
            }

            // 2) Fallback: retrieve from server-side in-memory store (mobile browsers)
            if (!oauthParams && state) {
                const stored = this.oauthParamsStore.get(state)
                if (stored && Date.now() <= stored.expiresAt) {
                    oauthParams = { codeVerifier: stored.codeVerifier, state: stored.state, nonce: stored.nonce }
                    paramsSource = "server-store"
                    this.logger.log(`[OAuth CB] ✅ Retrieved OAuth params from server-side store (mobile fallback)`)
                } else if (stored) {
                    this.logger.warn(`[OAuth CB] Server-side store entry expired`)
                    this.oauthParamsStore.delete(state)
                }
            }

            // 3) Both methods failed — session truly expired
            if (!oauthParams) {
                this.logger.warn(`[OAuth CB] No OAuth params found via cookie OR server store. Cookie keys: [${allCookieKeys.join(", ")}]. This is likely a mobile browser blocking cross-domain cookies and the server entry expired.`)
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent("session_expired")}`
                )
            }

            this.logger.debug(`[OAuth CB] OAuth params retrieved via: ${paramsSource}`)

            // Clean up server-side store entry (one-time use)
            this.oauthParamsStore.delete(state)

            // Validate state matches what we stored
            if (state !== oauthParams.state) {
                this.logger.warn(`[OAuth CB] State mismatch — URL: ${state.substring(0,20)}..., Cookie: ${oauthParams.state.substring(0,20)}...`)
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent("state_mismatch")}`
                )
            }

            // Verify HMAC signature + timestamp freshness
            if (!this.authService.verifyOAuthState(state, cookieSecret)) {
                this.logger.warn("[OAuth CB] OAuth state HMAC signature invalid or timestamp expired")
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent("state_invalid")}`
                )
            }

            try {
                this.logger.log("[OAuth CB] All validations passed — exchanging code for tokens...")

                const result = await this.authService.handleGoogleCallbackRedirect(
                    code,
                    oauthParams.codeVerifier,
                    oauthParams.nonce,
                )

                // Build redirect URL with tokens in hash fragment
                // SECURITY: Strip sensitive fields (password hash, privyId, etc.)
                // before sending user data to frontend via URL
                const safeUser = {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    displayName: result.user.displayName,
                    bio: result.user.bio,
                    avatar: result.user.avatar,
                    userType: result.user.userType,
                    adminRole: result.user.adminRole,
                    isVerified: result.user.isEmailVerified || false,
                    isEmailVerified: result.user.isEmailVerified || false,
                    isPremium: false,
                    wallets: (result.user.wallets || []).map((w: any) => ({
                        chainType: w.chainType,
                        address: w.address,
                        verifiedAt: w.verifiedAt,
                    })),
                    socialLinks: result.user.socialLinks,
                    createdAt: result.user.createdAt,
                    updatedAt: result.user.updatedAt,
                }
                const params = new URLSearchParams()
                params.set("access_token", result.accessToken)
                params.set("refresh_token", result.refreshToken)
                params.set("user", JSON.stringify(safeUser))

                clearOAuthCookie()
                this.logger.log(`[OAuth CB] ✅ Google OAuth success for user ${result.user?.email || result.user?.id}. Redirecting to ${frontendUrl}/auth/callback`)
                return res.status(302).redirect(`${frontendUrl}/auth/callback#${params.toString()}`)
            } catch (err) {
                this.logger.error(`[OAuth CB] ❌ Token exchange/user creation failed: ${err.message}`, err.stack)
                clearOAuthCookie()
                return res.status(302).redirect(
                    `${frontendUrl}/auth/callback#error=${encodeURIComponent(err.message || "auth_failed")}`
                )
            }
        } catch (fatalError) {
            // ABSOLUTE SAFETY NET: If anything above throws unexpectedly,
            // still redirect the user instead of showing a blank page
            this.logger.error(`[OAuth CB] 🔥 FATAL unhandled error in Google callback: ${(fatalError as any).message}`, (fatalError as any).stack)
            try {
                return res.status(302).redirect(`${frontendUrl}/auth/callback#error=${encodeURIComponent("unexpected_error")}`)
            } catch {
                // Last resort: send raw HTML redirect if Fastify redirect fails
                this.logger.error("[OAuth CB] 🔥🔥 Even redirect failed. Sending raw HTML redirect.")
                return res.status(200).type("text/html").send(
                    `<html><head><meta http-equiv="refresh" content="0;url=${frontendUrl}/auth/callback#error=server_error"></head><body>Redirecting...</body></html>`
                )
            }
        }
    }

    /**
     * Register new user (sends verification email)
     */
    @Post("register")
    @Public()
    @BypassSecurity()
    @ApiOperation({ summary: "Register a new user" })
    @ApiResponse({ status: 201, description: "Verification email sent" })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto)
    }

    /**
     * Login with email/password (sends OTP)
     */
    @Post("login")
    @Public()
    @BypassSecurity()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login with email/password (sends OTP)" })
    @ApiResponse({ status: 200, description: "OTP sent to email" })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto)
    }

    /**
     * Verify email from registration link
     */
    @Post("verify-email")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify email address" })
    async verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.token)
    }

    /**
     * Verify OTP and complete login
     */
    @Post("verify-otp")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify OTP code and complete login" })
    @ApiResponse({ status: 200, type: AuthResponseDto })
    async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
        return this.authService.verifyOtp(dto.email, dto.otp)
    }

    /**
     * Resend OTP code
     */
    @Post("resend-otp")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Resend OTP code" })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOtp(dto.email)
    }

    /**
     * Refresh access token
     */
    @Post("refresh")
    @Public()
    @SkipThrottle()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Refresh access token" })
    async refreshToken(@Body("refreshToken") refreshToken: string) {
        return this.authService.refreshToken(refreshToken)
    }

    /**
     * Link wallet to existing account
     */
    @Post("link-wallet")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Link Solana wallet to account" })
    async linkWallet(
        @GetUser("id") userId: string,
        @Body("walletAddress") walletAddress: string,
        @Body("signature") signature: string,
    ) {
        await this.authService.linkWallet(userId, walletAddress, signature)
        return { message: "Wallet linked successfully" }
    }

    /**
     * Provision a new wallet for specific chain
     * Fallback for when frontend creation fails
     */
    @Post("wallet/provision")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Provision a new wallet for specific chain" })
    async provisionWallet(
        @GetUser("id") userId: string,
        @Body("chainType") chainType: 'ethereum' | 'solana',
    ) {
        if (!chainType || !['ethereum', 'solana'].includes(chainType)) {
            throw new Error("Invalid chain type");
        }
        return this.authService.provisionWallet(userId, chainType);
    }

    /**
     * Get Privy Custom Auth Token
     */
    @Get("privy-token")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get Privy custom auth token" })
    async getPrivyToken(@GetUser("id") userId: string) {
        const token = await this.authService.getPrivyToken(userId);
        return { token };
    }

    /**
     * Get Privy Sync Token for Wallet Auto-Sync
     * @deprecated THIS IS FOR SESSION HYDRATION ONLY. DOES NOT SYNC WALLETS TO DB.
     * Use POST /users/me/sync-wallets for database persistence.
     */
    @Get("sync-privy")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get Privy custom auth token for session sync (DEPRECATED for DB usage)" })
    async getPrivySyncToken(@GetUser("id") userId: string) {
        const token = await this.authService.getPrivyToken(userId);
        return { privyToken: token };
    }

    /**
     * Get current user profile
     */
    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get current user profile" })
    async getProfile(@GetUser() user: any) {
        return user
    }

    /**
     * Request password change (Step 1: verify current password, send OTP)
     */
    @Post("change-password/request")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Request user password change" })
    async requestPasswordChange(
        @GetUser("id") userId: string,
        @Body() body: { currentPassword: string },
    ) {
        return this.authService.requestPasswordChange(userId, body.currentPassword)
    }

    /**
     * Verify password change (Step 2: verify OTP, set new password)
     */
    @Post("change-password/verify")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify and set new password" })
    async verifyPasswordChange(
        @GetUser("id") userId: string,
        @Body() body: { otp: string; newPassword: string },
    ) {
        return this.authService.verifyPasswordChange(userId, body.otp, body.newPassword)
    }

    /**
     * Request forgot password OTP (Forgot Password Step 1)
     */
    @Post("forgot-password/request")
    @Public()
    @BypassSecurity()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Request forgot password OTP" })
    async requestForgotPassword(
        @Body() body: { email: string },
    ) {
        return this.authService.requestForgotPassword(body.email)
    }

    /**
     * Verify forgot password and reset password (Forgot Password Step 2)
     */
    @Post("forgot-password/verify")
    @Public()
    @BypassSecurity()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify forgot password OTP and reset password" })
    async verifyForgotPassword(
        @Body() body: { email: string; otp: string; newPassword: string },
    ) {
        return this.authService.verifyForgotPassword(body.email, body.otp, body.newPassword)
    }
}
