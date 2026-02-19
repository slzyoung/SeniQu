import { Injectable, NotFoundException, Logger, Inject, forwardRef } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { PrivyService } from "../auth/privy.service"

export interface User {
    id: string
    email: string | null
    password?: string
    username?: string
    displayName?: string
    userType: string
    adminRole?: string
    adminLevel?: number
    privyId?: string
    googleId?: string
    // REMOVED LEGACY COLUMNS: walletAddress, embeddedWalletAddress
    wallets?: { chainType: string; address: string; verifiedAt: Date; isEmbedded: boolean }[]
    notificationPrefs?: Record<string, boolean>
    isTwoFactorEnabled: boolean
    loginAlertsEnabled: boolean
    createdAt: Date
    updatedAt: Date
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name)

    constructor(
        private readonly db: DatabaseService,
        @Inject(forwardRef(() => PrivyService))
        private readonly privyService: PrivyService
    ) { }

    async create(dto: CreateUserDto): Promise<User> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .insert({
                email: dto.email,
                password_hash: dto.password,
                username: dto.username,
                display_name: dto.displayName,
                role: this.mapUserTypeToRole(dto.userType || "ART_LOVER"),
                privy_id: dto.privyId,
                google_id: dto.googleId,
                // wallet_address removed
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create user: ${error.message}`)
            throw new Error(error.message)
        }

        return this.mapToUser(data)
    }

    async findById(id: string): Promise<User | null> {
        // Use admin client to bypass RLS for internal user lookups
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("id", id)
            .single()

        if (error || !data) {
            if (error) this.logger.warn(`findById error for ${id}: ${error.message}`);
            return null
        }

        const user = this.mapToUser(data);
        user.wallets = [];
        const seenAddresses = new Set<string>();

        // 1. Fetch embedded wallets from privy_wallets
        const { data: privyWallets } = await client
            .from("privy_wallets")
            .select("wallet_address, chain_type, created_at, updated_at")
            .eq("user_id", id);

        if (privyWallets && privyWallets.length > 0) {
            // this.logger.log(`[findById] Found ${privyWallets.length} privy wallets for user ${id}`);
            for (const w of privyWallets) {
                seenAddresses.add(w.wallet_address);
                user.wallets.push({
                    chainType: w.chain_type?.toLowerCase(),
                    address: w.wallet_address,
                    verifiedAt: new Date(w.updated_at || w.created_at || Date.now()),
                    isEmbedded: true
                });
            }
        } else {
            this.logger.warn(`[findById] No privy wallets found for user ${id}`);
        }

        // 2. Fetch external login wallets from wallet_logins (deduplicate)
        const { data: loginWallets } = await client
            .from("wallet_logins")
            .select("wallet_address, chain_type, last_login_at")
            .eq("user_id", id)
            .order("last_login_at", { ascending: false });

        if (loginWallets && loginWallets.length > 0) {
            for (const lw of loginWallets) {
                if (!seenAddresses.has(lw.wallet_address)) {
                    seenAddresses.add(lw.wallet_address);
                    user.wallets.push({
                        chainType: lw.chain_type,
                        address: lw.wallet_address,
                        verifiedAt: new Date(lw.last_login_at || Date.now()),
                        isEmbedded: false
                    });
                }
            }
        }

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("email", email)
            .single()

        if (error || !data) {
            return null
        }

        const user = this.mapToUser(data)
        // Note: We might want to populate wallets here too, but findById is usually the primary detail getter.
        return user
    }

    async findByPrivyId(privyId: string): Promise<User | null> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("privy_id", privyId)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToUser(data)
    }

    async findByWallet(walletAddress: string): Promise<User | null> {
        const client = this.db.getAdminClient()

        // 1. Check wallet_logins first (external wallets — Phantom, MetaMask, etc.)
        const { data: loginWallet } = await client
            .from("wallet_logins")
            .select("user_id")
            .eq("wallet_address", walletAddress)
            .limit(1)
            .single()

        if (loginWallet) {
            return this.findById(loginWallet.user_id)
        }

        // 2. Fallback: Check privy_wallets (embedded wallets)
        const { data: privyWallet } = await client
            .from("privy_wallets")
            .select("user_id")
            .eq("wallet_address", walletAddress)
            .single()

        if (privyWallet) {
            return this.findById(privyWallet.user_id)
        }

        return null
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .update({
                ...(dto.username !== undefined && { username: dto.username }),
                ...(dto.displayName !== undefined && { display_name: dto.displayName }),
                ...(dto.userType && { role: this.mapUserTypeToRole(dto.userType) }),
                ...(dto.bio !== undefined && { bio: dto.bio }),
                ...(dto.avatarUrl !== undefined && { avatar_url: dto.avatarUrl }),
                ...(dto.notificationPrefs && { notification_prefs: dto.notificationPrefs }),
                ...(dto.isTwoFactorEnabled !== undefined && { is_two_factor_enabled: dto.isTwoFactorEnabled }),
                ...(dto.loginAlertsEnabled !== undefined && { login_alerts_enabled: dto.loginAlertsEnabled }),
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return this.mapToUser(data)
    }

    async updateGoogleId(userId: string, googleId: string): Promise<void> {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("users")
            .update({
                google_id: googleId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId)

        if (error) {
            this.logger.error(`Failed to update Google ID: ${error.message}`)
            // Don't throw error here to allow login to proceed even if linking fails
        }
    }

    async updateWallet(userId: string, walletAddress: string): Promise<void> {
        this.logger.warn(`[DEPRECATED] updateWallet called for ${userId}. Use syncWallets instead.`);
        // No-op or call syncWallets
    }

    async updatePrivyId(userId: string, privyId: string): Promise<void> {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("users")
            .update({
                privy_id: privyId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId)

        if (error) {
            this.logger.error(`Failed to update Privy ID: ${error.message}`)
            // Don't throw error here to allow flow to proceed
        }
    }

    async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        const { data, error, count } = await client
            .from("users")
            .select("*", { count: "exact" })
            .range(offset, offset + limit - 1)
            .order("created_at", { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        return {
            users: (data || []).map(this.mapToUser),
            total: count || 0,
        }
    }

    private mapToUser(data: any): User {
        return {
            id: data.id,
            email: data.email,
            password: data.password_hash,
            username: data.username,
            displayName: data.display_name,
            userType: this.mapRoleToUserType(data.role),
            adminRole: data.admin_role,
            adminLevel: data.admin_level,
            privyId: data.privy_id,
            googleId: data.google_id,
            // walletAddress: REMOVED
            notificationPrefs: data.notification_prefs,
            isTwoFactorEnabled: data.is_two_factor_enabled || false,
            loginAlertsEnabled: data.login_alerts_enabled !== false, // Default true
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        }
    }

    private mapUserTypeToRole(userType: string): string {
        switch (userType) {
            case "ARTIST":
                return "artist"
            case "COLLECTOR":
                return "collector"
            case "INSTITUTION":
                return "institution"
            case "ART_LOVER":
            default:
                return "user"
        }
    }

    private mapRoleToUserType(role: string): string {
        switch (role) {
            case "artist":
                return "ARTIST"
            case "collector":
                return "COLLECTOR"
            case "institution":
                return "INSTITUTION"
            case "user":
            default:
                return "ART_LOVER"
        }
    }

    // ============================================
    // USER STATS
    // ============================================

    async getUserStats(userId: string): Promise<{
        viewsCount: number
        bookmarksCount: number
        collectionsCount: number
        nftCount: number
        likesCount: number
    }> {
        const client = this.db.getAdminClient()

        // Get bookmarks count
        const { count: bookmarksCount } = await client
            .from("bookmarks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)

        // Get collections count
        const { count: collectionsCount } = await client
            .from("collections")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)

        // For now, return placeholder values for views, nfts, and likes
        // These can be implemented when the corresponding tables exist
        return {
            viewsCount: 0,
            bookmarksCount: bookmarksCount || 0,
            collectionsCount: collectionsCount || 0,
            nftCount: 0,
            likesCount: 0,
        }
    }

    // ============================================
    // RECENT ACTIVITY
    // ============================================

    async getRecentActivity(userId: string, limit = 10): Promise<any[]> {
        // For now, return empty array - can be implemented with activity tracking table
        return []
    }

    // ============================================
    // BOOKMARKS
    // ============================================

    async getBookmarks(userId: string, page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        const { data, error, count } = await client
            .from("bookmarks")
            .select(`
                *,
                artwork:artworks(*)
            `, { count: "exact" })
            .eq("user_id", userId)
            .range(offset, offset + limit - 1)
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to get bookmarks: ${error.message}`)
            return { data: [], total: 0 }
        }

        return {
            data: data || [],
            total: count || 0,
        }
    }

    async addBookmark(userId: string, artworkId: string): Promise<void> {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("bookmarks")
            .insert({
                user_id: userId,
                artwork_id: artworkId,
            })

        if (error) {
            this.logger.error(`Failed to add bookmark: ${error.message}`)
            throw new Error(error.message)
        }
    }

    async removeBookmark(userId: string, artworkId: string): Promise<void> {
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("artwork_id", artworkId)

        if (error) {
            this.logger.error(`Failed to remove bookmark: ${error.message}`)
            throw new Error(error.message)
        }
    }

    // ============================================
    // COLLECTIONS
    // ============================================

    async getCollections(userId: string, page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        const { data, error, count } = await client
            .from("collections")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .range(offset, offset + limit - 1)
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to get collections: ${error.message}`)
            return { data: [], total: 0 }
        }

        return {
            data: data || [],
            total: count || 0,
        }
    }

    async createCollection(
        userId: string,
        dto: { name: string; description?: string; isPublic?: boolean }
    ): Promise<any> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("collections")
            .insert({
                user_id: userId,
                name: dto.name,
                description: dto.description,
                is_public: dto.isPublic ?? true,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create collection: ${error.message}`)
            throw new Error(error.message)
        }

        return data
    }

    // ============================================
    // WALLET SYNC
    // ============================================

    async syncWallets(userId: string): Promise<any> {
        const client = this.db.getAdminClient()
        // this.logger.log(`[syncWallets] Starting sync for user ${userId}`);

        // 1. Get User to find Privy ID
        const { data: user, error: userError } = await client
            .from("users")
            .select("privy_id")
            .eq("id", userId)
            .single()

        if (userError || !user?.privy_id) {
            this.logger.warn(`Cannot sync wallets: User ${userId} has no linked Privy ID`)
            return { success: false, reason: "No Privy ID found" }
        }

        // 2. Fetch authoritative data from Privy
        let privyUser = await this.privyService.getUserById(user.privy_id)

        if (!privyUser) {
            this.logger.error(`Privy user not found for ID: ${user.privy_id}`)
            return { success: false, reason: "Privy user not found" }
        }

        // 3. Extract ONLY embedded wallets (Solana & Ethereum)
        // Defense-in-depth: Exclude external wallet addresses that may have
        // been accidentally imported into Privy. Cross-reference wallet_logins
        // to detect external wallets.
        const { data: externalLogins } = await client
            .from("wallet_logins")
            .select("wallet_address")
            .eq("user_id", userId);

        const externalAddresses = new Set(
            (externalLogins || []).map((wl: any) => wl.wallet_address.toLowerCase())
        );

        const allWallets = privyUser.linkedAccounts.filter(
            (acc: any) => acc.type === "wallet"
        );

        // Filter: only keep wallets that are NOT in wallet_logins (i.e., embedded wallets)
        // Also accept wallets explicitly marked as embedded (walletClientType = 'privy')
        const wallets = allWallets.filter((w: any) => {
            const addr = (w.address || '').toLowerCase();
            const isEmbedded = w.walletClientType === 'privy' || w.connectorType === 'embedded';
            const isExternal = externalAddresses.has(addr);

            // Strict check: if it's external, skip it UNLESS it's explicitly marked as privy embedded
            // (which shouldn't happen normally for external wallets)
            if (isExternal && !isEmbedded) {
                // this.logger.warn(`[syncWallets] Skipping external wallet ${addr.slice(0, 10)}... (found in wallet_logins)`);
                return false;
            }
            return true;
        });

        let solanaWallet = wallets.find((w: any) => (w.chainType === "solana" || w.chain_type === "solana"))
        let ethereumWallet = wallets.find((w: any) => (w.chainType === "ethereum" || w.chain_type === "ethereum"))

        const updates = []

        // AUTO-PROVISIONING: If wallet is missing, try to create it via Privy
        let userUpdated = false;

        if (!solanaWallet) {
            // Check if we ALREADY have a wallet in DB. If so, TRUST IT and DO NOT PROVISION A NEW ONE.
            const { data: existingSol } = await client
                .from("privy_wallets")
                .select("wallet_address")
                .eq("user_id", userId)
                .eq("chain_type", "solana")
                .single();

            if (existingSol) {
                this.logger.log(`[syncWallets] User ${userId} has Solana wallet in DB (${existingSol.wallet_address}) but missing in Privy links. Skipping provision to prevent loop.`);
                // We could optionally try to "heal" the link here if Privy supported it, but for now we just avoid overwriting.
            } else {
                this.logger.warn(`[syncWallets] User ${userId} missing Solana embedded wallet. Provisioning...`);
                try {
                    const updatedUser = await this.privyService.provisionWallet(privyUser.id, 'solana');
                    if (updatedUser) {
                        privyUser = updatedUser;
                        userUpdated = true;
                    }
                } catch (err) {
                    this.logger.error(`[syncWallets] Failed to provision Solana wallet: ${err.message}`);
                }
            }
        }

        if (!ethereumWallet) {
            // Check if we ALREADY have a wallet in DB. If so, TRUST IT and DO NOT PROVISION A NEW ONE.
            const { data: existingEth } = await client
                .from("privy_wallets")
                .select("wallet_address")
                .eq("user_id", userId)
                .eq("chain_type", "ethereum")
                .single();

            if (existingEth) {
                this.logger.log(`[syncWallets] User ${userId} has Ethereum wallet in DB (${existingEth.wallet_address}) but missing in Privy links. Skipping provision to prevent loop.`);
            } else {
                this.logger.warn(`[syncWallets] User ${userId} missing Ethereum embedded wallet. Provisioning...`);
                try {
                    const updatedUser = await this.privyService.provisionWallet(privyUser.id, 'ethereum');
                    if (updatedUser) {
                        privyUser = updatedUser;
                        userUpdated = true;
                    }
                } catch (err) {
                    this.logger.error(`[syncWallets] Failed to provision Ethereum wallet: ${err.message}`);
                }
            }
        }

        if (userUpdated) {
            const newWallets = privyUser.linkedAccounts.filter(
                (acc: any) => acc.type === "wallet"
            ).filter((w: any) => {
                const addr = (w.address || '').toLowerCase();
                const isEmbedded = w.walletClientType === 'privy' || w.connectorType === 'embedded';
                return !externalAddresses.has(addr) || isEmbedded;
            });
            solanaWallet = newWallets.find((w: any) => (w.chainType === "solana" || w.chain_type === "solana"))
            ethereumWallet = newWallets.find((w: any) => (w.chainType === "ethereum" || w.chain_type === "ethereum"))
        }

        if (!solanaWallet) this.logger.warn(`[syncWallets] User ${userId} missing Solana wallet (even after provision attempt).`);
        if (!ethereumWallet) this.logger.warn(`[syncWallets] User ${userId} missing Ethereum wallet (even after provision attempt).`);

        // 4. Sync Solana Wallet - STRICT UPSERT
        if (solanaWallet) {
            // this.logger.log(`[syncWallets] syncing Solana wallet: ${solanaWallet.address}`);
            const { error } = await client
                .from("privy_wallets")
                .upsert(
                    {
                        user_id: userId,
                        chain_type: "solana",
                        wallet_address: solanaWallet.address,
                        // Save the Privy Wallet ID if available (critical for signing)
                        ...((solanaWallet as any).id ? { privy_wallet_id: (solanaWallet as any).id } : {}),
                        last_verified_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id, chain_type" } // This creates/updates the single allowed entry
                )

            if (error) this.logger.error(`Failed to sync Solana wallet: ${error.message}`)
            else updates.push("solana")
        }

        // 5. Sync Ethereum Wallet - STRICT UPSERT
        if (ethereumWallet) {
            // this.logger.log(`[syncWallets] syncing Ethereum wallet: ${ethereumWallet.address}`);
            const { error } = await client
                .from("privy_wallets")
                .upsert(
                    {
                        user_id: userId,
                        chain_type: "ethereum",
                        wallet_address: ethereumWallet.address,
                        // Save the Privy Wallet ID if available
                        ...((ethereumWallet as any).id ? { privy_wallet_id: (ethereumWallet as any).id } : {}),
                        last_verified_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id, chain_type" } // This creates/updates the single allowed entry
                )

            if (error) this.logger.error(`Failed to sync Ethereum wallet: ${error.message}`)
            else updates.push("ethereum")
        }

        return { success: true, synced: updates }
    }

    // ============================================
    // MARKETPLACE HISTORY
    // ============================================

    async getMarketplaceHistory(userId: string, limit = 5): Promise<any[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("marketplace_transactions")
            .select("*")
            .or(`user_id.eq.${userId},seller_id.eq.${userId}`) // Get where user is buyer OR seller
            .order("created_at", { ascending: false })
            .limit(limit)

        if (error) {
            this.logger.error(`Failed to get marketplace history: ${error.message}`)
            return [] // Return empty on error to prevent crashing UI
        }

        return data || []
    }
}
