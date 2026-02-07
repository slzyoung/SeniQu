/**
 * Artist Service - Backend
 * Business logic for artist-specific operations including stats, analytics, and profile
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"

// ============================================
// TYPES
// ============================================

export interface ArtistStats {
    totalArtworks: number
    publishedArtworks: number
    draftArtworks: number
    totalViews: number
    totalLikes: number
    totalSales: number
    totalRevenue: number
    totalFollowers: number
    averageRating: number
}

export interface ArtistAnalytics {
    views: { date: string; value: number }[]
    likes: { date: string; value: number }[]
    sales: { date: string; value: number }[]
    revenue: { date: string; value: number }[]
}

export interface ArtistPerformance {
    topArtworks: {
        id: string
        title: string
        views: number
        likes: number
        sales: number
    }[]
    engagementRate: number
    conversionRate: number
    averageViewsPerArtwork: number
}

export interface ArtworkWithStats {
    id: string
    title: string
    description: string
    imageUrl: string
    thumbnailUrl?: string
    category: string
    status: string
    views: number
    likes: number
    createdAt: string
    isNFT: boolean
}

@Injectable()
export class ArtistService {
    private readonly logger = new Logger(ArtistService.name)

    constructor(private readonly db: DatabaseService) { }

    // ============================================
    // ARTIST STATS & DASHBOARD
    // ============================================

    async getArtistStats(artistId: string): Promise<ArtistStats> {
        const client = this.db.getClient()

        // Get artwork counts
        const [total, published, drafts] = await Promise.all([
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId),
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId).eq("status", "published"),
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId).eq("status", "draft"),
        ])

        // Get aggregated stats from artworks
        const { data: artworkStats } = await client
            .from("artworks")
            .select("views_count, likes_count")
            .eq("artist_id", artistId)

        const totalViews = artworkStats?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0
        const totalLikes = artworkStats?.reduce((sum, a) => sum + (a.likes_count || 0), 0) || 0

        // Get followers count
        const { count: followersCount } = await client
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", artistId)

        // Get NFT sales stats
        const { data: nftSales } = await client
            .from("nft_transactions")
            .select("price")
            .eq("seller_id", artistId)
            .eq("type", "sale")

        const totalSales = nftSales?.length || 0
        const totalRevenue = nftSales?.reduce((sum, t) => sum + (t.price || 0), 0) || 0

        return {
            totalArtworks: total.count || 0,
            publishedArtworks: published.count || 0,
            draftArtworks: drafts.count || 0,
            totalViews,
            totalLikes,
            totalSales,
            totalRevenue,
            totalFollowers: followersCount || 0,
            averageRating: 4.5, // Placeholder - calculate from reviews
        }
    }

    async getArtistAnalytics(artistId: string, period = "30d"): Promise<ArtistAnalytics> {
        const client = this.db.getClient()
        const days = parseInt(period) || 30
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // For now, return simulated time series data
        // In production, this would query artwork_analytics or similar table
        const generateTimeSeries = (baseValue: number) => {
            const data = []
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate)
                date.setDate(date.getDate() + i)
                data.push({
                    date: date.toISOString().split('T')[0],
                    value: Math.floor(baseValue * (0.8 + Math.random() * 0.4)),
                })
            }
            return data
        }

        return {
            views: generateTimeSeries(50),
            likes: generateTimeSeries(10),
            sales: generateTimeSeries(2),
            revenue: generateTimeSeries(100),
        }
    }

    async getArtistPerformance(artistId: string): Promise<ArtistPerformance> {
        const client = this.db.getClient()

        // Get top artworks by views
        const { data: topArtworks } = await client
            .from("artworks")
            .select("id, title, views_count, likes_count")
            .eq("artist_id", artistId)
            .eq("status", "published")
            .order("views_count", { ascending: false })
            .limit(5)

        const stats = await this.getArtistStats(artistId)

        return {
            topArtworks: (topArtworks || []).map(a => ({
                id: a.id,
                title: a.title,
                views: a.views_count || 0,
                likes: a.likes_count || 0,
                sales: 0, // Would need to join with NFT sales
            })),
            engagementRate: stats.totalViews > 0 ? (stats.totalLikes / stats.totalViews) * 100 : 0,
            conversionRate: stats.totalViews > 0 ? (stats.totalSales / stats.totalViews) * 100 : 0,
            averageViewsPerArtwork: stats.publishedArtworks > 0 ? stats.totalViews / stats.publishedArtworks : 0,
        }
    }

    // ============================================
    // ARTIST ARTWORKS MANAGEMENT
    // ============================================

    async getArtistArtworks(
        artistId: string,
        page = 1,
        limit = 20,
        filters?: { status?: string; category?: string }
    ) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client
            .from("artworks")
            .select("*", { count: "exact" })
            .eq("artist_id", artistId)

        if (filters?.status) {
            query = query.eq("status", filters.status.toLowerCase()) // Convert to lowercase for consistency
        }
        if (filters?.category) {
            query = query.eq("category", filters.category)
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: (data || []).map(this.mapArtworkToDto),
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async createArtwork(artistId: string, dto: {
        title: string
        description: string
        category: string
        region?: string
        era?: string
        medium?: string
        dimensions?: string
        imageUrl: string
        status?: string
    }) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("artworks")
            .insert({
                title: dto.title,
                description: dto.description,
                artist_id: artistId,
                category: dto.category,
                region: dto.region,
                era: dto.era,
                medium: dto.medium,
                dimensions: dto.dimensions,
                image_url: dto.imageUrl,
                status: dto.status ? dto.status.toLowerCase() : "draft", // Ensure status is lowercase
                is_verified: false,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create artwork: ${error.message}`)
            throw error
        }

        this.logger.log(`Artwork created: ${data.id} by artist ${artistId}`)
        return this.mapArtworkToDto(data)
    }

    async updateArtwork(artworkId: string, artistId: string, dto: any) {
        const client = this.db.getAdminClient()

        // Verify ownership
        const { data: existing } = await client
            .from("artworks")
            .select("artist_id")
            .eq("id", artworkId)
            .single()

        if (!existing) throw new NotFoundException("Artwork not found")
        if (existing.artist_id !== artistId) throw new ForbiddenException("You can only edit your own artworks")

        const { data, error } = await client
            .from("artworks")
            .update({
                title: dto.title,
                description: dto.description,
                category: dto.category,
                region: dto.region,
                era: dto.era,
                medium: dto.medium,
                dimensions: dto.dimensions,
                image_url: dto.imageUrl,
                status: dto.status ? dto.status.toLowerCase() : undefined, // Ensure status is lowercase
                updated_at: new Date().toISOString(),
            })
            .eq("id", artworkId)
            .select()
            .single()

        if (error) throw error
        return this.mapArtworkToDto(data)
    }

    async deleteArtwork(artworkId: string, artistId: string) {
        const client = this.db.getAdminClient()

        // Verify ownership
        const { data: existing } = await client
            .from("artworks")
            .select("artist_id")
            .eq("id", artworkId)
            .single()

        if (!existing) throw new NotFoundException("Artwork not found")
        if (existing.artist_id !== artistId) throw new ForbiddenException("You can only delete your own artworks")

        const { error } = await client
            .from("artworks")
            .delete()
            .eq("id", artworkId)

        if (error) throw error
        this.logger.warn(`Artwork deleted: ${artworkId} by artist ${artistId}`)
    }

    async publishArtwork(artworkId: string, artistId: string) {
        const client = this.db.getAdminClient()

        // Verify ownership
        const { data: existing } = await client
            .from("artworks")
            .select("artist_id, status")
            .eq("id", artworkId)
            .single()

        if (!existing) throw new NotFoundException("Artwork not found")
        if (existing.artist_id !== artistId) throw new ForbiddenException("You can only publish your own artworks")

        const { data, error } = await client
            .from("artworks")
            .update({ status: "published", updated_at: new Date().toISOString() })
            .eq("id", artworkId)
            .select()
            .single()

        if (error) throw error
        return this.mapArtworkToDto(data)
    }

    // ============================================
    // ARTIST PROFILE
    // ============================================

    async getArtistProfile(artistId: string) {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("users")
            .select("id, email, display_name, bio, avatar_url, role, is_verified, is_premium, wallet_address, created_at")
            .eq("id", artistId)
            .single()

        if (error || !data) throw new NotFoundException("Artist not found")

        const stats = await this.getArtistStats(artistId)

        return {
            ...data,
            stats,
        }
    }

    async updateArtistProfile(artistId: string, dto: {
        displayName?: string
        bio?: string
        avatarUrl?: string
        socialLinks?: { twitter?: string; instagram?: string; website?: string }
    }) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("users")
            .update({
                display_name: dto.displayName,
                bio: dto.bio,
                avatar_url: dto.avatarUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", artistId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    // ============================================
    // ENGAGEMENT
    // ============================================

    async getFollowers(artistId: string, page = 1, limit = 20) {
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        const { data, error, count } = await client
            .from("follows")
            .select("follower:users!follower_id(id, display_name, avatar_url)", { count: "exact" })
            .eq("following_id", artistId)
            .range(offset, offset + limit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    async getRecentActivity(artistId: string, limit = 10) {
        const client = this.db.getClient()

        // Combine notifications and recent interactions
        const { data: notifications } = await client
            .from("notifications")
            .select("*")
            .eq("user_id", artistId)
            .order("created_at", { ascending: false })
            .limit(limit)

        return notifications || []
    }

    // ============================================
    // HELPERS
    // ============================================

    private mapArtworkToDto(data: any): ArtworkWithStats {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            imageUrl: data.image_url,
            thumbnailUrl: data.thumbnail_url,
            category: data.category,
            status: data.status,
            views: data.views_count || 0,
            likes: data.likes_count || 0,
            createdAt: data.created_at,
            isNFT: !!data.nft_token_id,
        }
    }
}
