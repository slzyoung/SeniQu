import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Headers,
    Req,
    HttpCode,
    HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
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
    constructor(private readonly authService: AuthService) { }

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
