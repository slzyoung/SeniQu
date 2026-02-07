import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

/**
 * Privy User Response
 */
interface PrivyUser {
    id: string
    createdAt: string
    linkedAccounts: Array<{
        type: string
        address?: string
        email?: string
        verifiedAt?: string
    }>
    email?: { address: string }
    wallet?: { address: string; chainType: string }
}

/**
 * Privy Service
 * Handles Privy authentication token verification
 */
@Injectable()
export class PrivyService {
    private readonly logger = new Logger(PrivyService.name)
    private readonly appId: string
    private readonly appSecret: string
    private readonly verificationKey: string

    constructor(private readonly configService: ConfigService) {
        this.appId = this.configService.get<string>("privy.appId") || ""
        this.appSecret = this.configService.get<string>("privy.appSecret") || ""
        this.verificationKey = this.configService.get<string>("privy.verificationKey") || ""
    }

    /**
     * Verify Privy authentication token
     */
    async verifyToken(token: string): Promise<PrivyUser | null> {
        try {
            // Using Privy's server-side verification
            // In production, use @privy-io/server-auth package

            const response = await fetch("https://auth.privy.io/api/v1/users/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "privy-app-id": this.appId,
                },
            })

            if (!response.ok) {
                this.logger.warn(`Privy token verification failed: ${response.status}`)
                return null
            }

            const data = await response.json()

            return this.parsePrivyUser(data)
        } catch (error) {
            this.logger.error("Privy token verification error:", error)
            return null
        }
    }

    /**
     * Get user by Privy ID
     */
    async getUserById(privyId: string): Promise<PrivyUser | null> {
        try {
            const response = await fetch(
                `https://auth.privy.io/api/v1/users/${privyId}`,
                {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appSecret}`).toString("base64")}`,
                        "privy-app-id": this.appId,
                    },
                },
            )

            if (!response.ok) {
                return null
            }

            const data = await response.json()
            return this.parsePrivyUser(data)
        } catch (error) {
            this.logger.error("Privy get user error:", error)
            return null
        }
    }

    /**
     * Parse Privy user response
     */
    private parsePrivyUser(data: any): PrivyUser {
        const emailAccount = data.linked_accounts?.find(
            (acc: any) => acc.type === "email",
        )
        const walletAccount = data.linked_accounts?.find(
            (acc: any) => acc.type === "wallet",
        )

        return {
            id: data.id,
            createdAt: data.created_at,
            linkedAccounts: data.linked_accounts || [],
            email: emailAccount ? { address: emailAccount.address } : undefined,
            wallet: walletAccount
                ? { address: walletAccount.address, chainType: walletAccount.chain_type }
                : undefined,
        }
    }
}
