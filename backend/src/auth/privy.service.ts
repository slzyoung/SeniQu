import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrivyClient } from "@privy-io/server-auth"
import * as jwt from 'jsonwebtoken';

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
        id?: string // Add wallet ID
        walletClientType?: string
        connectorType?: string
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
    /**
     * Create a Custom Auth Token for a user via Privy API
     * Allows the frontend to authenticate with Privy using our backend session
     */
    async getCustomAuthToken(userId: string): Promise<string | null> {
        if (!this.appId) {
            this.logger.error("Privy App ID not configured");
            return null;
        }

        try {
            // Read the private key from environment variable (preferred) or file system (fallback)
            let privateKey: string | undefined;
            const envKey = this.configService.get<string>("PRIVY_SIGNING_KEY")

            if (envKey) {
                // Remove surrounding quotes if they exist
                let key = envKey.replace(/^"|"$/g, '');
                // Handle both literal newlines and escaped "\n" strings
                privateKey = key.includes("\\n")
                    ? key.replace(/\\n/g, "\n")
                    : key;
            } else {
                try {
                    const privateKeyPath = process.cwd() + "/private.pem"
                    const fs = await import("fs")

                    if (fs.existsSync(privateKeyPath)) {
                        privateKey = fs.readFileSync(privateKeyPath, "utf8")
                    } else {
                        // Fallback try one level up if in dist
                        const upOne = process.cwd() + "/../private.pem"
                        if (fs.existsSync(upOne)) {
                            privateKey = fs.readFileSync(upOne, "utf8")
                        }
                    }
                } catch (fsError: any) {
                    this.logger.error(`Failed to read private key from file: ${fsError.message}`)
                }
            }

            if (!privateKey) {
                this.logger.error("PRIVY_SIGNING_KEY not found in env and private.pem not found. Cannot generate custom auth token.")
                return null
            }

            // Verify key header
            const keyHeader = privateKey.split('\n')[0];
            this.logger.debug(`Signing Privy token with App ID: ${this.appId} | Key Header: ${keyHeader}`);

            // Generate Custom Auth Token (JWT) locally using RS256
            // ISSUER: Must be the App ID
            // SUBJECT: The user's unique ID
            // AUDIENCE: 'privy.io'
            const payload = {
                sub: userId,
                iss: this.appId,
                aud: 'privy.io',
            };

            // Need to import jwt library
            const jwt = await import("jsonwebtoken");

            const token = jwt.sign(payload, privateKey, {
                algorithm: "RS256",
                expiresIn: "1h",
                keyid: "seniqu-auth-key-1",
                // Backdate iat slightly to allow for clock skew (1 minute)
                notBefore: "-1m",
            })

            this.logger.debug(`Generated custom auth token for user ${userId} (length: ${token.length})`);
            return token;
        } catch (error: any) {
            this.logger.error(`Failed to create custom auth token: ${error.message}`);
            return null;
        }
    }
    /**
     * Provision a wallet for a user on a specific chain
     * Used when frontend creation fails due to existing wallet on another chain
     */
    async provisionWallet(userId: string, chainType: 'ethereum' | 'solana'): Promise<PrivyUser | null> {
        if (!this.privyClient) {
            this.logger.error("Privy client not initialized");
            return null;
        }

        try {
            this.logger.log(`Provisioning ${chainType} wallet for user ${userId}...`);

            let createdWallet: any = null;

            try {
                // Create a server wallet (floating, as linking to DID via owner_id is not supported for Server Wallets)
                createdWallet = await (this.privyClient.walletApi as any).create({
                    chainType
                });
                this.logger.log(`[PrivyService] Successfully created ${chainType} wallet: ${JSON.stringify(createdWallet)}`);
            } catch (createErr: any) {
                // Ignore "already exists" errors, but log others
                if (!createErr.message?.includes('already exists') && !createErr.message?.includes('conflict')) {
                    this.logger.warn(`Provision create call failed (might be expected?): ${createErr.message}`);
                } else {
                    this.logger.log(`[PrivyService] Wallet already exists for ${chainType} (error: ${createErr.message})`);
                }
            }

            // Retry fetching user to allow for propagation
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                const user = await this.privyClient.getUser(userId);
                const parsed = this.parsePrivyUser(user);

                // Check if the specific EMBEDDED chain wallet is present
                const hasWallet = parsed.linkedAccounts.some(
                    (acc: any) => acc.type === 'wallet' &&
                        (acc.chainType === chainType || acc.chain_type === chainType) &&
                        (acc.walletClientType === 'privy' || acc.connectorType === 'embedded')
                );

                if (hasWallet) {
                    this.logger.log(`[PrivyService] Verified ${chainType} wallet in user profile.`);
                    return parsed;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }

            this.logger.warn(`[PrivyService] Provisioned ${chainType} wallet but could not verify it in user profile after ${maxAttempts} attempts. Merging manually.`);

            // If verification failed but we have a created wallet, merge it manually so the app can proceed
            const finalUserRaw = await this.privyClient.getUser(userId);
            const finalUser = this.parsePrivyUser(finalUserRaw);

            if (createdWallet && createdWallet.address) {
                this.logger.log(`[PrivyService] Manually merging created wallet ${createdWallet.address} into user profile.`);
                const newWalletAccount: any = {
                    type: 'wallet',
                    address: createdWallet.address,
                    chainType: createdWallet.chainType || chainType,
                    verifiedAt: new Date().toISOString(),
                    walletClientType: 'privy_server',
                    connectorType: 'server',
                    id: createdWallet.id // Include the Critical ID
                };

                finalUser.linkedAccounts.push(newWalletAccount);

                // Also update the convenience arrays/objects
                if (finalUser.wallets) {
                    finalUser.wallets.push({
                        address: createdWallet.address,
                        chainType: createdWallet.chainType || chainType,
                        walletClientType: 'privy_server',
                        connectorType: 'server'
                    });
                }

                if (!finalUser.wallet && chainType === 'solana') {
                    finalUser.wallet = {
                        address: createdWallet.address,
                        chainType: createdWallet.chainType || chainType,
                        walletClientType: 'privy_server',
                        connectorType: 'server'
                    };
                }
            }

            return finalUser;

        } catch (error: any) {
            this.logger.error(`Failed to provision wallet: ${error.message}`);
            return null;
        }
    }
}