import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrivyClient } from "@privy-io/server-auth"

/**
 * Privy User Response
 */
export interface PrivyUser {
    id: string
    createdAt: string
    linkedAccounts: Array<{
        type: string
        address?: string
        email?: string
        verifiedAt?: string
        chainType?: string
    }>
    email?: { address: string }
    wallet?: {
        address: string
        chainType: string
        walletClientType?: string
        connectorType?: string
    }
    wallets?: Array<{
        address: string
        chainType: string
        walletClientType?: string
        connectorType?: string
    }>
}

/**
 * Privy Service — SDK-Based
 *
 * Uses @privy-io/server-auth SDK for proper JWT verification
 * with automatic JWKS key rotation, claim validation, and
 * built-in rate limiting awareness.
 *
 * Replaces the previous raw fetch() implementation.
 */
@Injectable()
export class PrivyService implements OnModuleInit {
    private readonly logger = new Logger(PrivyService.name)
    private privyClient: PrivyClient
    private readonly appId: string
    private readonly appSecret: string

    constructor(private readonly configService: ConfigService) {
        this.appId = this.configService.get<string>("privy.appId") || ""
        this.appSecret = this.configService.get<string>("privy.appSecret") || ""
    }

    onModuleInit() {
        if (!this.appId || !this.appSecret) {
            this.logger.warn(
                "Privy credentials not configured. Privy authentication will not work.",
            )
            return
        }

        this.privyClient = new PrivyClient(this.appId, this.appSecret)
        this.logger.log("Privy SDK client initialized successfully")
    }

    /**
     * Verify Privy authentication token using SDK
     *
     * The SDK handles:
     * - JWKS key fetching and rotation
     * - JWT claim validation (iss, aud, exp, nbf)
     * - Token format validation
     */
    async verifyToken(token: string): Promise<PrivyUser | null> {
        if (!this.privyClient) {
            this.logger.error("Privy client not initialized")
            return null
        }

        try {
            // Verify the auth token — SDK validates JWT claims automatically
            const verifiedClaims = await this.privyClient.verifyAuthToken(token)

            if (!verifiedClaims || !verifiedClaims.userId) {
                this.logger.warn("Privy token verification returned no user ID")
                return null
            }

            // Fetch full user data using the verified user ID
            const user = await this.privyClient.getUser(verifiedClaims.userId)

            if (!user) {
                this.logger.warn(
                    `User not found for Privy ID: ${verifiedClaims.userId}`,
                )
                return null
            }

            return this.parsePrivyUser(user)
        } catch (error: any) {
            // Handle specific Privy errors
            if (error.message?.includes("expired")) {
                this.logger.warn("Privy token has expired")
            } else if (error.message?.includes("invalid")) {
                this.logger.warn("Invalid Privy token format")
            } else {
                this.logger.error(`Privy token verification error: ${error.message}`)
            }
            return null
        }
    }

    /**
     * Get user by Privy ID using SDK
     */
    async getUserById(privyId: string): Promise<PrivyUser | null> {
        if (!this.privyClient) {
            this.logger.error("Privy client not initialized")
            return null
        }

        try {
            const user = await this.privyClient.getUser(privyId)

            if (!user) {
                return null
            }

            return this.parsePrivyUser(user)
        } catch (error: any) {
            this.logger.error(`Privy get user error: ${error.message}`)
            return null
        }
    }

    /**
     * Get user by wallet address using SDK
     */
    async getUserByWallet(walletAddress: string): Promise<PrivyUser | null> {
        if (!this.privyClient) {
            this.logger.error("Privy client not initialized")
            return null
        }

        try {
            const user = await this.privyClient.getUserByWalletAddress(walletAddress)

            if (!user) {
                return null
            }

            return this.parsePrivyUser(user)
        } catch (error: any) {
            this.logger.error(`Privy get user by wallet error: ${error.message}`)
            return null
        }
    }

    /**
     * Parse Privy user response into our standard format
     * Handles both SDK response format and API response format
     */
    private parsePrivyUser(data: any): PrivyUser {
        // The SDK returns linked_accounts with type-specific fields
        const linkedAccounts = (data.linked_accounts || data.linkedAccounts || []).map(
            (acc: any) => ({
                type: acc.type,
                address: acc.address,
                email: acc.email || acc.address,
                verifiedAt: acc.verified_at || acc.verifiedAt,
                chainType: acc.chain_type || acc.chainType,
                walletClientType: acc.walletClientType || acc.wallet_client_type,
                connectorType: acc.connectorType || acc.connector_type,
            }),
        )

        // Find email account
        const emailAccount = linkedAccounts.find(
            (acc: any) => acc.type === "email",
        )

        // Find all wallet accounts
        const walletAccounts = linkedAccounts.filter(
            (acc: any) => acc.type === "wallet",
        )

        // Primary wallet (first one)
        const primaryWallet = walletAccounts[0]

        return {
            id: data.id,
            createdAt: data.created_at || data.createdAt,
            linkedAccounts,
            email: emailAccount ? { address: emailAccount.address || emailAccount.email } : undefined,
            wallet: primaryWallet
                ? {
                    address: primaryWallet.address,
                    chainType: primaryWallet.chainType || "solana",
                    walletClientType: primaryWallet.walletClientType,
                    connectorType: primaryWallet.connectorType,
                }
                : undefined,
            wallets: walletAccounts.map((w: any) => ({
                address: w.address,
                chainType: w.chainType || "solana",
                walletClientType: w.walletClientType,
                connectorType: w.connectorType,
            })),
        }
    }
    /**
     * Create a Privy user with an embedded wallet
     * Used for auto-provisioning deposit wallets for new users
     */
    async createWithEmbeddedWallet(params: {
        email?: string
        walletAddress?: string
        chainType?: "ethereum" | "solana"
    }): Promise<PrivyUser | null> {
        if (!this.privyClient) {
            this.logger.error("Privy client not initialized")
            return null
        }

        try {
            const linkedAccounts: any[] = []

            if (params.email) {
                linkedAccounts.push({
                    type: "email",
                    address: params.email,
                    verified_at: new Date().toISOString(), // Trust our own auth
                })
            }

            if (params.walletAddress) {
                linkedAccounts.push({
                    type: "wallet",
                    address: params.walletAddress,
                    chain_type: params.chainType || "solana",
                    verified_at: new Date().toISOString(), // Trust our own auth
                })
            }

            // Create user in Privy with embedded wallet
            const user = await this.privyClient.importUser({
                linkedAccounts,
                createEmbeddedWallet: true,
            })

            this.logger.log(`Created Privy user ${user.id} with embedded wallet`)

            return this.parsePrivyUser(user)
        } catch (error: any) {
            this.logger.error(`Failed to create Privy user: ${error.message}`)
            // Don't throw, just log. We don't want to block registration if Privy is down.
            return null
        }
    }
}
