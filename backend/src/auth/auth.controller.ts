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

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    private readonly logger = new Logger(AuthController.name)

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

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
    ): Promise<AuthResponseDto> {
        return this.authService.authenticateWithPrivy(privyToken)
    }

    /**
     * Handle Google OAuth Callback (legacy POST - from frontend)
     */
    @Post("callback")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Handle Google OAuth Callback (legacy POST)" })
    @ApiResponse({ status: 200, type: AuthResponseDto })
    async handleGoogleCallback(
        @Body("code") code: string,
        @Body("redirectUri") redirectUri: string,
        @Body("codeVerifier") codeVerifier?: string,
    ): Promise<AuthResponseDto> {
        return this.authService.handleGoogleCallback(code, redirectUri, codeVerifier)
    }

    /**
     * Handle Google OAuth Callback (server-side redirect)
     * Google redirects directly to this endpoint with ?code=xxx&state=yyy
     * We exchange the code, generate JWT tokens, and redirect to the frontend.
     */
    @Get("google/callback")
    @Public()
    @ApiOperation({ summary: "Handle Google OAuth server-side callback" })
    async handleGoogleOAuthCallback(
        @Query("code") code: string,
        @Query("state") state: string,
        @Query("error") error: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniquapp.netlify.app"

        // Handle OAuth error from Google
        if (error) {
            this.logger.warn(`Google OAuth error: ${error}`)
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent(error)}`
            )
        }

        if (!code) {
            this.logger.warn("Google OAuth callback missing code parameter")
            return res.redirect(
                `${frontendUrl}/auth/callback#error=${encodeURIComponent("missing_code")}`
            )
        }

        try {
            const result = await this.authService.handleGoogleCallbackRedirect(code)

            // Build redirect URL with tokens in hash fragment (never sent to server)
            const params = new URLSearchParams()
            params.set("access_token", result.accessToken)
            params.set("refresh_token", result.refreshToken)
            params.set("user", JSON.stringify(result.user))

            const redirectUrl = `${frontendUrl}/auth/callback#${params.toString()}`

            this.logger.log(`Google OAuth success, redirecting to frontend`)
            return res.redirect(redirectUrl)
        } catch (err) {
            this.logger.error(`Google OAuth callback error: ${err.message}`, err.stack)
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
