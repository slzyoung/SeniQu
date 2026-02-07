import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"

export interface User {
    id: string
    email: string
    password?: string
    displayName?: string
    userType: string
    adminRole?: string
    adminLevel?: number
    privyId?: string
    googleId?: string
    walletAddress?: string
    createdAt: Date
    updatedAt: Date
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name)

    constructor(private readonly db: DatabaseService) { }

    async create(dto: CreateUserDto): Promise<User> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .insert({
                email: dto.email,
                password_hash: dto.password,
                display_name: dto.displayName,
                role: this.mapUserTypeToRole(dto.userType || "ART_LOVER"),
                privy_id: dto.privyId,
                google_id: dto.googleId,
                wallet_address: dto.walletAddress,
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
        const client = this.db.getClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("id", id)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToUser(data)
    }

    async findByEmail(email: string): Promise<User | null> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("email", email)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToUser(data)
    }

    async findByPrivyId(privyId: string): Promise<User | null> {
        const client = this.db.getClient()

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
        const client = this.db.getClient()

        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("wallet_address", walletAddress)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToUser(data)
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .update({
                display_name: dto.displayName,
                role: dto.userType ? this.mapUserTypeToRole(dto.userType) : undefined,
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
        const client = this.db.getAdminClient()

        const { error } = await client
            .from("users")
            .update({
                wallet_address: walletAddress,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId)

        if (error) {
            throw new Error(error.message)
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
            displayName: data.display_name,
            userType: this.mapRoleToUserType(data.role),
            adminRole: data.admin_role,
            adminLevel: data.admin_level,
            privyId: data.privy_id,
            googleId: data.google_id,
            walletAddress: data.wallet_address,
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
        const client = this.db.getClient()

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
}
