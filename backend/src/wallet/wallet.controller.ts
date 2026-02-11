import {
    Controller,
    Post,
    Delete,
    Get,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    Logger,
} from "@nestjs/common"
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { WalletService } from "./wallet.service"
import { GenerateNonceDto } from "./dto/generate-nonce.dto"
import { VerifySignatureDto } from "./dto/verify-signature.dto"
import { LinkWalletDto } from "./dto/link-wallet.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { Public } from "../auth/decorators/public.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"

/**
 * Wallet Controller — Enterprise Grade
 *
 * REST endpoints for wallet management with:
 * - Per-endpoint rate limiting (tighter than global)
 * - OWASP-compliant nonce-based auth
 * - Audit logging
 * - Swagger documentation
 */
@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
    private readonly logger = new Logger(WalletController.name)

    constructor(private readonly walletService: WalletService) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    /**
     * Generate a nonce for wallet signature verification
     * Public endpoint — any wallet can request a nonce
     */
    @Post("nonce")
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({
        summary: "Generate wallet auth nonce",
        description:
            "Generates a single-use nonce that the wallet must sign to prove ownership. " +
            "Nonces expire after 5 minutes. Rate limited to 10 requests per minute.",
    })
    @ApiResponse({ status: 200, description: "Nonce generated successfully" })
    @ApiResponse({ status: 400, description: "Invalid wallet address" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async generateNonce(
        @Body() dto: GenerateNonceDto,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress
        const userAgent = req.headers?.["user-agent"]

        this.logger.log(
            `Nonce requested for ${dto.walletAddress.slice(0, 8)}... on ${dto.chain}`,
        )

        const result = await this.walletService.generateNonce(
            dto.walletAddress,
            dto.chain,
            ip,
            userAgent,
        )

        return {
            nonce: result.nonce,
            message: result.message,
            expiresAt: result.expiresAt,
        }
    }

    /**
     * Verify a wallet signature
     * Public endpoint — verifies wallet ownership
     */
    @Post("verify")
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({
        summary: "Verify wallet signature",
        description:
            "Verifies that the wallet signed the nonce message. " +
            "Used to prove wallet ownership before linking. " +
            "Rate limited to 5 requests per minute.",
    })
    @ApiResponse({ status: 200, description: "Signature verified" })
    @ApiResponse({ status: 401, description: "Invalid signature" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async verifySignature(
        @Body() dto: VerifySignatureDto,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress

        return this.walletService.verifySignature(
            dto.walletAddress,
            dto.signature,
            dto.nonce,
            dto.chain,
            ip,
        )
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    /**
     * Link a wallet to the authenticated user's account
     */
    @Post("link")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { ttl: 300000, limit: 3 } })
    @ApiOperation({
        summary: "Link wallet to account",
        description:
            "Links a verified external wallet to the authenticated user's account. " +
            "Requires a valid signature and nonce. Rate limited to 3 per 5 minutes.",
    })
    @ApiResponse({ status: 201, description: "Wallet linked successfully" })
    @ApiResponse({ status: 401, description: "Unauthorized or invalid signature" })
    @ApiResponse({ status: 409, description: "Wallet already linked" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async linkWallet(
        @GetUser("id") userId: string,
        @Body() dto: LinkWalletDto,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress
        const userAgent = req.headers?.["user-agent"]
        const fingerprint = req.headers?.["x-client-fingerprint"]

        this.logger.log(
            `Linking wallet ${dto.walletAddress.slice(0, 8)}... to user ${userId.slice(0, 8)}...`,
        )

        const wallet = await this.walletService.linkWallet(
            userId,
            dto.walletAddress,
            dto.chain,
            dto.provider,
            dto.signature,
            dto.nonce,
            {
                label: dto.label,
                isPrimary: dto.isPrimary,
                isEmbedded: dto.isEmbedded,
                ip,
                userAgent,
                fingerprint,
            },
        )

        return {
            message: "Wallet linked successfully",
            wallet,
        }
    }

    /**
     * Link an embedded wallet (created by Privy)
     */
    @Post("link/embedded")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: "Link Privy embedded wallet",
        description:
            "Links a Privy-created embedded wallet to the user's account. " +
            "No signature required as the wallet is verified by Privy.",
    })
    @ApiResponse({ status: 201, description: "Embedded wallet linked" })
    async linkEmbeddedWallet(
        @GetUser("id") userId: string,
        @Body("walletAddress") walletAddress: string,
        @Body("chain") chain: string,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress

        const wallet = await this.walletService.linkEmbeddedWallet(
            userId,
            walletAddress,
            chain || "solana",
            ip,
        )

        return {
            message: "Embedded wallet linked successfully",
            wallet,
        }
    }

    /**
     * Unlink a wallet from the user's account
     */
    @Delete("link/:walletId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 300000, limit: 5 } })
    @ApiOperation({
        summary: "Unlink wallet from account",
        description:
            "Removes a wallet connection. Cannot unlink embedded wallets. " +
            "Rate limited to 5 per 5 minutes.",
    })
    @ApiResponse({ status: 200, description: "Wallet unlinked" })
    @ApiResponse({ status: 404, description: "Wallet connection not found" })
    async unlinkWallet(
        @GetUser("id") userId: string,
        @Param("walletId") walletId: string,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress

        await this.walletService.unlinkWallet(userId, walletId, ip)

        return { message: "Wallet unlinked successfully" }
    }

    /**
     * Get all connected wallets for the authenticated user
     */
    @Get("connections")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({
        summary: "Get connected wallets",
        description:
            "Returns all active wallet connections for the authenticated user.",
    })
    @ApiResponse({ status: 200, description: "List of connected wallets" })
    async getConnections(@GetUser("id") userId: string) {
        const wallets = await this.walletService.getConnectedWallets(userId)

        return {
            wallets,
            total: wallets.length,
        }
    }
    /**
     * Get aggregated portfolio for the authenticated user
     */
    @Get("portfolio")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({
        summary: "Get user portfolio",
        description:
            "Returns aggregated balance and assets across all connected wallets (Embedded + External).",
    })
    @ApiResponse({ status: 200, description: "Portfolio data" })
    async getPortfolio(@GetUser("id") userId: string) {
        return this.walletService.getPortfolio(userId)
    }

    /**
     * Get transaction history
     */
    @Get("transactions")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({
        summary: "Get transaction history",
        description: "Returns recent wallet transactions (deposits, withdrawals).",
    })
    @ApiResponse({ status: 200, description: "Transaction history" })
    async getTransactions(@GetUser("id") userId: string) {
        return this.walletService.getTransactions(userId)
    }

    /**
     * Create a withdrawal request
     */
    @Post("withdraw")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { ttl: 60000, limit: 2 } }) // Strict rate limit for withdrawals
    @ApiOperation({
        summary: "Withdraw funds",
        description: "Initiates a withdrawal from the user's wallet.",
    })
    @ApiResponse({ status: 201, description: "Withdrawal initiated" })
    @ApiResponse({ status: 400, description: "Insufficient funds or invalid address" })
    async withdraw(
        @GetUser("id") userId: string,
        @Body("amount") amount: number,
        @Body("token") token: string,
        @Body("destination") destination: string,
        @Req() req: any,
    ) {
        const ip = req.ip || req.connection?.remoteAddress

        return this.walletService.createWithdrawal(
            userId,
            amount,
            token,
            destination,
            ip
        )
    }
}
