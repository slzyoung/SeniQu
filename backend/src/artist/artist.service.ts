/**
 * Artist Service - Backend
 * Business logic for artist-specific operations including stats, analytics, and profile
 * Fixed: Column names aligned with actual database schema (migrations/001_initial_schema.sql)
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
    isArt: boolean
    price?: number
    isForSale?: boolean
    artworkType?: string
    poaCertificate?: any
}

@Injectable()
export class ArtistService {
    private readonly logger = new Logger(ArtistService.name)

    constructor(private readonly db: DatabaseService) { }

    // ============================================
    // ARTIST STATS & DASHBOARD
    // ============================================

    async getArtistStats(artistId: string): Promise<ArtistStats> {
        const client = this.db.getAdminClient()

        // Get artwork counts
        const [total, published, drafts] = await Promise.all([
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId),
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId).eq("status", "published"),
            client.from("artworks").select("*", { count: "exact", head: true }).eq("artist_id", artistId).eq("status", "draft"),
        ])

        // Get aggregated stats from artworks — schema uses 'views' and 'likes' columns
        const { data: artworkStats } = await client
            .from("artworks")
            .select("views, likes")
            .eq("artist_id", artistId)

        const totalViews = artworkStats?.reduce((sum, a) => sum + (a.views || 0), 0) || 0
        const totalLikes = artworkStats?.reduce((sum, a) => sum + (a.likes || 0), 0) || 0

        // Get followers count
        const { count: followersCount } = await client
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", artistId)

        // Get NFT sales stats — schema uses transaction_type and from_address/to_address
        const { data: artworkIds } = await client
            .from("artworks")
            .select("id")
            .eq("artist_id", artistId)
            .eq("is_art", true)

        let totalSales = 0
        let totalRevenue = 0

        if (artworkIds && artworkIds.length > 0) {
            const ids = artworkIds.map(a => a.id)
            const { data: artRecords } = await client
                .from("arts")
                .select("id")
                .in("artwork_id", ids)

            if (artRecords && artRecords.length > 0) {
                const artIds = artRecords.map(n => n.id)
                const { data: artSales } = await client
                    .from("art_transactions")
                    .select("price")
                    .in("art_id", artIds)
                    .eq("transaction_type", "buy")

                totalSales = artSales?.length || 0
                totalRevenue = artSales?.reduce((sum, t) => sum + parseFloat(t.price || "0"), 0) || 0
            }
        }

        return {
            totalArtworks: total.count || 0,
            publishedArtworks: published.count || 0,
            draftArtworks: drafts.count || 0,
            totalViews,
            totalLikes,
            totalSales,
            totalRevenue,
            totalFollowers: followersCount || 0,
            averageRating: 0, // No rating system in schema yet
        }
    }

    async getArtistAnalytics(artistId: string, period = "30d"): Promise<ArtistAnalytics> {
        // Return empty arrays — analytics_events table exists, but no artwork-level time series
        // This is honest rather than returning fake random numbers
        return {
            views: [],
            likes: [],
            sales: [],
            revenue: [],
        }
    }

    async getArtistPerformance(artistId: string): Promise<ArtistPerformance> {
        const client = this.db.getAdminClient()

        // Get top artworks by views — schema column is 'views'
        const { data: topArtworks } = await client
            .from("artworks")
            .select("id, title, views, likes")
            .eq("artist_id", artistId)
            .eq("status", "published")
            .order("views", { ascending: false })
            .limit(5)

        const stats = await this.getArtistStats(artistId)

        return {
            topArtworks: (topArtworks || []).map(a => ({
                id: a.id,
                title: a.title,
                views: a.views || 0,
                likes: a.likes || 0,
                sales: 0,
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
        const client = this.db.getAdminClient()
        const safeLimit = Math.min(Math.max(limit, 1), 100)
        const offset = (page - 1) * safeLimit

        let query = client
            .from("artworks")
            .select("*", { count: "exact" })
            .eq("artist_id", artistId)

        if (filters?.status) {
            query = query.eq("status", filters.status.toLowerCase())
        }
        if (filters?.category) {
            // Schema uses genres TEXT[] for categories
            query = query.contains("genres", [filters.category])
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + safeLimit - 1)

        if (error) throw error

        return {
            data: (data || []).map(this.mapArtworkToDto),
            meta: {
                total: count || 0,
                page,
                pageSize: safeLimit,
                totalPages: Math.ceil((count || 0) / safeLimit),
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
        price?: number
        isForSale?: boolean
        artworkType?: string
        poaCertificate?: any
    }) {
        const client = this.db.getAdminClient()

        // Generate slug from title
        const slug = this.generateSlug(dto.title)

        const imagesJson = {
            artwork_type: dto.artworkType || 'physical',
            poa_certificate: dto.poaCertificate || null,
            additional_images: []
        }

        // Map DTO fields to actual schema columns from 001_initial_schema.sql
        const { data, error } = await client
            .from("artworks")
            .insert({
                title: dto.title,
                slug,
                description: dto.description,
                artist_id: artistId,
                category: dto.category || null,                  // schema: category VARCHAR(100)
                genres: dto.category ? [dto.category] : [],       // schema: genres TEXT[]
                medium: dto.medium || null,                        // schema: medium VARCHAR(100)
                style: dto.region || null,                         // map region to style
                period: dto.era || null,                           // map era to period
                dimensions: dto.dimensions || null,                // schema: dimensions VARCHAR(100)
                primary_image_url: dto.imageUrl,                   // schema: primary_image_url TEXT NOT NULL
                price: dto.price !== undefined ? dto.price : null,
                is_for_sale: dto.isForSale !== undefined ? dto.isForSale : false,
                currency: "SOL",
                status: dto.status ? dto.status.toLowerCase() : "draft",
                images: JSON.stringify(imagesJson),
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

        // Build update object — only include defined fields
        const updateData: Record<string, any> = {}
        if (dto.title !== undefined) updateData.title = dto.title
        if (dto.description !== undefined) updateData.description = dto.description
        if (dto.category !== undefined) {
            updateData.category = dto.category
            updateData.genres = [dto.category]
        }
        if (dto.medium !== undefined) updateData.medium = dto.medium
        if (dto.region !== undefined) updateData.style = dto.region
        if (dto.era !== undefined) updateData.period = dto.era
        if (dto.imageUrl !== undefined) updateData.primary_image_url = dto.imageUrl
        if (dto.dimensions !== undefined) updateData.dimensions = dto.dimensions
        if (dto.price !== undefined) updateData.price = dto.price
        if (dto.isForSale !== undefined) updateData.is_for_sale = dto.isForSale
        if (dto.status !== undefined) updateData.status = dto.status.toLowerCase()
        updateData.updated_at = new Date().toISOString()

        const { data, error } = await client
            .from("artworks")
            .update(updateData)
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
        const client = this.db.getAdminClient()

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

        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }
        if (dto.displayName !== undefined) updateData.display_name = dto.displayName
        if (dto.bio !== undefined) updateData.bio = dto.bio
        if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl

        const { data, error } = await client
            .from("users")
            .update(updateData)
            .eq("id", artistId)
            .select()
            .single()

        if (error) throw error

        // Handle social links separately if provided
        if (dto.socialLinks) {
            const socialClient = this.db.getAdminClient()
            for (const [platform, url] of Object.entries(dto.socialLinks)) {
                if (url !== undefined) {
                    await socialClient
                        .from("user_social_links")
                        .upsert(
                            { user_id: artistId, platform, url },
                            { onConflict: "user_id,platform" }
                        )
                }
            }
        }

        return data
    }

    // ============================================
    // ENGAGEMENT
    // ============================================

    async getFollowers(artistId: string, page = 1, limit = 20) {
        const client = this.db.getAdminClient()
        const safeLimit = Math.min(Math.max(limit, 1), 100)
        const offset = (page - 1) * safeLimit

        const { data, error, count } = await client
            .from("follows")
            .select("follower:users!follower_id(id, display_name, avatar_url)", { count: "exact" })
            .eq("following_id", artistId)
            .range(offset, offset + safeLimit - 1)

        if (error) throw error

        return {
            data: data || [],
            meta: {
                total: count || 0,
                page,
                pageSize: safeLimit,
                totalPages: Math.ceil((count || 0) / safeLimit),
            },
        }
    }

    async getRecentActivity(artistId: string, limit = 10) {
        const client = this.db.getAdminClient()
        const safeLimit = Math.min(Math.max(limit, 1), 50)

        const { data: notifications } = await client
            .from("notifications")
            .select("*")
            .eq("user_id", artistId)
            .order("created_at", { ascending: false })
            .limit(safeLimit)

        return notifications || []
    }

    // ============================================
    // HELPERS
    // ============================================

    private mapArtworkToDto(data: any): ArtworkWithStats {
        let artworkType = 'physical';
        let poaCertificate = null;
        if (data.images) {
            try {
                const imgData = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
                if (imgData && typeof imgData === 'object' && !Array.isArray(imgData)) {
                    artworkType = imgData.artwork_type || artworkType;
                    poaCertificate = imgData.poa_certificate || poaCertificate;
                }
            } catch (e) {}
        }

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            imageUrl: data.primary_image_url,     // schema: primary_image_url
            thumbnailUrl: data.primary_image_url, // no separate thumbnail in schema
            category: data.genres?.[0] || data.category || "",      // schema: genres TEXT[]
            status: data.status,
            views: data.views || 0,                // schema: views INTEGER
            likes: data.likes || 0,                // schema: likes INTEGER
            createdAt: data.created_at,
            isArt: data.is_art || false,           // schema: is_art BOOLEAN
            price: data.price,
            isForSale: data.is_for_sale,
            artworkType,
            poaCertificate
        }
    }

    private generateSlug(title: string): string {
        const base = title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 250)

        // Add timestamp to ensure uniqueness (slug is UNIQUE NOT NULL)
        return `${base}-${Date.now()}`
    }
}
