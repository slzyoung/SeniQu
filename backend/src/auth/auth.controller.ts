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
import { Response } from "express"
import { ConfigService } from "@nestjs/config"
import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { AuthResponseDto } from "./dto/auth-response.dto"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { PrivyGuard } from "./guards/privy.guard"
import { GetUser } from "./decorators/get-user.decorator"
import { Public } from "./decorators/public.decorator"
import { WalletLoginDto } from "./dto/wallet-login.dto"

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    private readonly logger = new Logger(AuthController.name)

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

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
        @Res() res: Response,
    ) {
        const cookieSecret = this.configService.get<string>("google.oauthCookieSecret") || "fallback-secret"
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

        res.cookie("__oauth_params", cookiePayload, {
            httpOnly: true,
            secure: isProduction, // Secure only in production (HTTPS)
            sameSite: isProduction ? "none" : "lax", // 'none' + secure allows cross-site cookie usage in all contexts (e.g. iframes or strict redirect flows)
            maxAge: 10 * 60 * 1000, // 10 minutes
            path: "/",
            signed: true,
        })

        this.logger.log("Google OAuth initiated — PKCE + signed state + nonce")
        return res.json({ authUrl })
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
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniquapp.netlify.app"
        const cookieSecret = this.configService.get<string>("google.oauthCookieSecret") || "fallback-secret"

        // Always clear the OAuth cookie after use
        const clearCookie = () => {
            const isProduction = this.configService.get("NODE_ENV") === "production"
            res.clearCookie("__oauth_params", {
                path: "/",
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax"
            })
        }

        // Handle OAuth error from Google
        if (error) {
            this.logger.warn(`Google OAuth error: ${error}`)
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent(error)}`
            )
        }

        if (!code || !state) {
            this.logger.warn("Google OAuth callback missing code or state")
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("missing_params")}`
            )
        }

        // Read the signed cookie
        const cookieRaw = req.signedCookies?.__oauth_params
        if (!cookieRaw) {
            this.logger.warn("Missing __oauth_params cookie (expired or tampered)")
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("session_expired")}`
            )
        }

        let oauthParams: { codeVerifier: string; state: string; nonce: string }
        try {
            oauthParams = JSON.parse(cookieRaw)
        } catch {
            this.logger.warn("Corrupted __oauth_params cookie")
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("invalid_session")}`
            )
        }

        // Validate state matches what we stored
        if (state !== oauthParams.state) {
            this.logger.warn("OAuth state mismatch")
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("state_mismatch")}`
            )
        }

        // Verify HMAC signature + timestamp freshness
        if (!this.authService.verifyOAuthState(state, cookieSecret)) {
            this.logger.warn("OAuth state signature invalid or expired")
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("state_invalid")}`
            )
        }

        try {
            const result = await this.authService.handleGoogleCallbackRedirect(
                code,
                oauthParams.codeVerifier,
                oauthParams.nonce,
            )

            // Build redirect URL with tokens in hash fragment
            const params = new URLSearchParams()
            params.set("access_token", result.accessToken)
            params.set("refresh_token", result.refreshToken)
            params.set("user", JSON.stringify(result.user))

            clearCookie()
            this.logger.log("Google OAuth success — PKCE + state + nonce verified")
            return res.redirect(`${frontendUrl}/auth/callback#${params.toString()}`)
        } catch (err) {
            this.logger.error(`Google OAuth callback error: ${err.message}`, err.stack)
            clearCookie()
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent(err.message || "auth_failed")}`
            )
        }
    }

    /**
     * Register new user
     */
    @Post("register")
    @Public()
    @ApiOperation({ summary: "Register new user" })
    @ApiResponse({ status: 201, type: AuthResponseDto })
    async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
        return this.authService.register(dto)
    }

    /**
     * Login with email/password
     */
    @Post("login")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login with email/password" })
    @ApiResponse({ status: 200, type: AuthResponseDto })
    async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(dto)
    }

    /**
     * Refresh access token
     */
    @Post("refresh")
    @Public()
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
     * @deprecated Use /privy-token instead
     */
    @Get("sync-privy")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get Privy custom auth token for session sync" })
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
}
