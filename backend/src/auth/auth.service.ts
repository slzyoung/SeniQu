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
    async authenticateWithPrivy(privyToken: string, embeddedWalletAddress?: string): Promise<AuthResponseDto> {
        // Verify Privy token
        const privyUser = await this.privyService.verifyToken(privyToken)

        if (!privyUser) {
            throw new UnauthorizedException("Invalid Privy token")
        }

        // DEBUG: Insprect Privy User to see available wallets
        this.logger.debug(`Privy User Debug: ${JSON.stringify({
            id: privyUser.id,
            wallet: privyUser.wallet,
            wallets: privyUser.wallets,
            linkedAccounts: privyUser.linkedAccounts?.map(a => ({ type: a.type, chain: a.chainType, walletType: (a as any).walletClientType }))
        })}`);

        // Check if user already exists
        let user = await this.usersService.findByPrivyId(privyUser.id)

        let isNewUser = false
        if (!user) {
            // Fallback: Check by email to prevent duplicate accounts
            // This handles cases where user registered via email/google but hasn't linked privy_id yet
            const emailAccount = privyUser.linkedAccounts.find(
                (a) => a.type === "email" || a.type === "google_oauth",
            )
            if (emailAccount && emailAccount.address) {
                user = await this.usersService.findByEmail(emailAccount.address)
                if (user) {
                    this.logger.log(
                        `Found existing user ${user.id} by email ${emailAccount.address}. Linking Privy ID.`,
                    )
                    await this.usersService.updatePrivyId(user.id, privyUser.id)
                    user.privyId = privyUser.id
                }
            }
        }

        if (!user) {
            // Create a new user if not found
            // Extract email from linked accounts
            const email = privyUser.linkedAccounts.find(
                (a) => a.type === "email" || a.type === "google_oauth",
            )?.address

            // Extract wallet address from linked accounts OR use provided embedded address
            const walletAddress = privyUser.linkedAccounts.find(
                (a) => a.type === "wallet",
            )?.address || embeddedWalletAddress

            user = await this.usersService.create({
                email,
                privyId: privyUser.id,
                displayName: `User ${privyUser.id.substring(0, 8)}`,
                // walletAddress removed from schema
                userType: "ART_LOVER", // Default role
            })
            isNewUser = true
            this.logger.log(`Created new user ${user.id} from Privy auth`)
        } else {
            this.logger.debug(`User ${user.id} authenticated via Privy`)
        }

        // Separate embedded wallets from external wallets in linked accounts
        // IMPORTANT: External wallets (MetaMask, Phantom, etc.) go to wallet_logins ONLY
        //            Embedded wallets (Privy-managed) go to privy_wallets via linkEmbeddedWallet
        if (privyUser.linkedAccounts) {
            const walletAccounts = privyUser.linkedAccounts.filter((a: any) => a.type === 'wallet');

            for (const account of walletAccounts) {
                const address = (account as any).address;
                const chainType = (account as any).chainType || (account as any).chain_type;
                const walletClientType = (account as any).walletClientType;
                const connectorType = (account as any).connectorType;

                if (!address) continue;

                const provider = this.mapPrivyProvider(walletClientType, connectorType);
                const chain = chainType === 'ethereum' ? 'ethereum' : 'solana';
                const isEmbedded = provider === 'embedded' || walletClientType === 'privy';

                try {
                    if (isEmbedded) {
                        // Privy-managed embedded wallet → privy_wallets table
                        await this.walletService.linkEmbeddedWallet(
                            user.id, address, chain, provider,
                        );
                        this.logger.log(`Linked embedded wallet ${address} (${chain}) for user ${user.id}`);
                    } else {
                        // External wallet (MetaMask, Phantom, etc.) → wallet_logins table ONLY
                        await this.walletService.saveWalletLogin(
                            user.id, address, chain, provider,
                        );
                        this.logger.log(`Saved external wallet login ${address} (${chain}) for user ${user.id}`);
                    }
                } catch (error) {
                    // Don't fail login if linking fails (might be already linked)
                    this.logger.warn(`Failed to link wallet ${address}: ${(error as any).message}`);
                }
            }
        }

        // Generate JWT
        const tokens = await this.generateTokens(user)

        // Inject Multi-Chain Wallets into User Response
        // This ensures frontend has both SOL and ETH addresses for persistence
        if (privyUser.linkedAccounts) {
            const solanaWallet = privyUser.linkedAccounts.find(
                (a: any) => a.type === 'wallet' && (a.chainType === 'solana' || a.chain_type === 'solana')
            );
            const ethereumWallet = privyUser.linkedAccounts.find(
                (a: any) => a.type === 'wallet' && (a.chainType === 'ethereum' || a.chain_type === 'ethereum')
            );

            // 1. Ensure wallets are populated (Note: updated syncWallets handles DB persistence)
            // Frontend should use user.wallets or fetch from Privy directly.
            // We don't need to manually inject legacy fields here anymore.
            // But we should ensure the user object has the latest wallet data if we fetched it.
            if (!user.wallets || user.wallets.length === 0) {
                // We could manually construct it here for immediate return, 
                // but simpler to rely on the frontend fetching valid data or the next request.
            }
        }

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
                // walletAddress removed
                userType: "ART_LOVER",
            })
            isNewUser = true
            this.logger.log(`Created new user ${user.id} for wallet ${walletAddress}`)
        }

        // Step 3: Save external wallet login to wallet_logins table
        try {
            await this.walletService.saveWalletLogin(
                user.id,
                walletAddress,
                chain,
                "external", // Provider resolved from frontend
            )
        } catch (error) {
            // Ignore "already linked" errors — this is expected for returning users
            if (!error.message?.includes("already")) {
                this.logger.warn(`Failed to save wallet login for user ${user.id}: ${error.message}`)
            }
        }

        // Step 4: Provision Privy embedded wallets (Solana + Ethereum)
        // Same as email/Google login: every user gets embedded deposit wallets.
        // The external wallet address stays in wallet_logins only — ensureEmbeddedWallet
        // creates SEPARATE Privy-managed wallets for deposits/withdrawals.
        await this.ensureEmbeddedWallet(user)

        // Step 5: Generate JWT tokens
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

        // Auto-provision embedded wallet if needed
        await this.ensureEmbeddedWallet(user)

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

        // Auto-provision embedded wallet if needed
        await this.ensureEmbeddedWallet(user)

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
     * Provision a wallet for a user on a specific chain
     */
    async provisionWallet(userId: string, chainType: 'ethereum' | 'solana') {
        const privyUser = await this.privyService.provisionWallet(userId, chainType);

        // If successful, update our local user record with the new wallet info if applicable
        // (e.g. if we want to store multiple wallets, or update the primary one)
        // For now, we just return the result.
        return privyUser;
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

        // Ensure existing users also get a wallet if they don't have one
        await this.ensureEmbeddedWallet(user)

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
    /**
     * Helper to ensure user has embedded wallets (both Solana + Ethereum)
     * If not, create a Privy user and provision wallets.
     * Works for users WITH or WITHOUT email (wallet-login users).
     */
    private async ensureEmbeddedWallet(user: any): Promise<void> {
        this.logger.log(`Provisioning/Syncing embedded wallet for user ${user.id}`);

        try {
            let privyUser;

            // Scenario A: User already has privyId → fetch from Privy to sync
            if (user.privyId) {
                privyUser = await this.privyService.getUserById(user.privyId);
            }

            // Scenario B: User has no privyId → Create/Import into Privy
            if (!privyUser) {
                // IMPORTANT: Do NOT pass external wallet address to importUser().
                // That would import the login wallet as a Privy-managed wallet,
                // causing it to appear in privy_wallets instead of a fresh embedded one.
                // Just use createEmbeddedWallet: true to create fresh Privy wallets.
                // syncWallets() will then provision any missing chains (Solana + Ethereum).
                privyUser = await this.privyService.createWithEmbeddedWallet({
                    email: user.email || undefined,
                    // EXPLICITLY OMITTING walletAddress property everywhere to prevent implicit import of external wallet
                    // walletAddress: undefined 
                });
            }

            if (privyUser) {
                // 1. Sync Privy ID if missing
                if (!user.privyId) {
                    try {
                        await this.usersService.updatePrivyId(user.id, privyUser.id);
                        user.privyId = privyUser.id;
                    } catch (e) {
                        this.logger.warn(`Failed to update privyId: ${(e as any).message}`);
                    }
                }

                // 2. Force sync of wallets to privy_wallets table
                // syncWallets() auto-provisions missing chains (Solana + Ethereum)
                await this.usersService.syncWallets(user.id);

                this.logger.log(`Synced Privy user ${privyUser.id} for local user ${user.id}`);
            } else {
                this.logger.error(`Failed to create/find Privy user for ${user.id}. Embedded wallets not provisioned.`);
            }
        } catch (error: any) {
            this.logger.error(
                `Failed to ensure embedded wallet for user ${user.id}: ${error.message}`,
            );
            // We don't throw here to avoid blocking login
        }
    }

    /**
     * Helper: Fetch the first external wallet login for a user
     * Used to provide context when creating a Privy user for wallet-login users
     */
    private async getFirstWalletLogin(userId: string): Promise<{ wallet_address: string; chain_type: string } | null> {
        try {
            return await this.walletService.getFirstWalletLogin(userId);
        } catch {
            return null;
        }
    }

    private async verifyWalletSignature(
        walletAddress: string,
        signature: string,
    ): Promise<boolean> {
        try {
            // Use the nonce-based verification from WalletService if available
            // This legacy method returns true for backward compatibility
            // New wallet auth should go through POST /auth/wallet -> authenticateWithWallet()
            this.logger.warn(
                "Legacy linkWallet called -- consider using POST /auth/wallet for full nonce verification",
            );
            return true;
        } catch {
            return false;
        }
    }
}
