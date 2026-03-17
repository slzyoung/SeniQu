/**
 * Analytics Service - Business Intelligence
 */

import { Injectable, Logger } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"
import { TrackEventDto } from "./dto/track-event.dto"

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Get artist dashboard analytics
     */
    async getArtistAnalytics(artistId: string, period: string) {
        const days = this.periodToDays(period)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Get artwork stats
        const { data: artworks } = await this.supabase
            .from("artworks")
            .select("id, views, likes, status")
            .eq("artist_id", artistId)

        const totalViews = artworks?.reduce((sum, a) => sum + (a.views || 0), 0) || 0
        const totalLikes = artworks?.reduce((sum, a) => sum + (a.likes || 0), 0) || 0
        const publishedCount = artworks?.filter(a => a.status === "published").length || 0

        // Get sales data
        const { data: sales, count: salesCount } = await this.supabase
            .from("art_transactions")
            .select("price", { count: "exact" })
            .in("art_id", (artworks?.map(a => a.id) || []))
            .eq("transaction_type", "buy")
            .gte("created_at", startDate.toISOString())

        const totalRevenue = sales?.reduce((sum, s) => sum + parseFloat(s.price || 0), 0) || 0

        // Get follower count
        const { count: followers } = await this.supabase
            .from("follows")
            .select("id", { count: "exact" })
            .eq("following_id", artistId)

        return {
            data: {
                overview: {
                    totalArtworks: artworks?.length || 0,
                    publishedArtworks: publishedCount,
                    totalViews,
                    totalLikes,
                    totalSales: salesCount || 0,
                    totalRevenue,
                    followers: followers || 0,
                },
                period,
            },
        }
    }

    /**
     * Get per-artwork analytics
     */
    async getArtworkAnalytics(artistId: string) {
        const { data } = await this.supabase
            .from("artworks")
            .select("id, title, slug, primary_image_url, views, likes, status, created_at")
            .eq("artist_id", artistId)
            .order("views", { ascending: false })
            .limit(20)

        return { data }
    }

    /**
     * System-wide analytics for admins
     */
    async getSystemAnalytics(period: string) {
        const days = this.periodToDays(period)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const [users, artworks, museums, arts] = await Promise.all([
            this.supabase.from("users").select("id", { count: "exact" }),
            this.supabase.from("artworks").select("id", { count: "exact" }).eq("status", "published"),
            this.supabase.from("institutions").select("id", { count: "exact" }).eq("is_verified", true),
            this.supabase.from("arts").select("id", { count: "exact" }),
        ])

        // Recent signups
        const { count: recentSignups } = await this.supabase
            .from("users")
            .select("id", { count: "exact" })
            .gte("created_at", startDate.toISOString())

        return {
            data: {
                totalUsers: users.count || 0,
                totalArtworks: artworks.count || 0,
                totalMuseums: museums.count || 0,
                totalArts: arts.count || 0,
                recentSignups: recentSignups || 0,
                period,
            },
        }
    }

    /**
     * User growth analytics
     */
    async getUserGrowthAnalytics(period: string) {
        const days = this.periodToDays(period)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Get user role distribution
        const { data: roleData } = await this.supabase
            .from("users")
            .select("role")

        const roleDistribution = roleData?.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Premium users
        const { count: premiumCount } = await this.supabase
            .from("users")
            .select("id", { count: "exact" })
            .eq("is_premium", true)

        return {
            data: {
                roleDistribution,
                premiumUsers: premiumCount || 0,
            },
        }
    }

    /**
     * Content analytics
     */
    async getContentAnalytics() {
        // Artworks by status
        const { data: artworksByStatus } = await this.supabase
            .from("artworks")
            .select("status")

        const statusDistribution = artworksByStatus?.reduce((acc, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Top genres
        const { data: artworksWithGenres } = await this.supabase
            .from("artworks")
            .select("genres")
            .eq("status", "published")

        const genreCount: Record<string, number> = {}
        artworksWithGenres?.forEach(a => {
            (a.genres || []).forEach((genre: string) => {
                genreCount[genre] = (genreCount[genre] || 0) + 1
            })
        })

        const topGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([genre, count]) => ({ genre, count }))

        return {
            data: {
                statusDistribution,
                topGenres,
            },
        }
    }

    /**
     * Track analytics event
     */
    async trackEvent(dto: TrackEventDto) {
        const { error } = await this.supabase
            .from("analytics_events")
            .insert({
                event_type: dto.eventType,
                event_data: dto.eventData,
                user_id: dto.userId,
                page_url: dto.pageUrl,
                referrer: dto.referrer,
            })

        if (error) {
            this.logger.error(`Failed to track event: ${error.message}`)
        }

        return { success: !error }
    }

    private periodToDays(period: string): number {
        switch (period) {
            case "7d": return 7
            case "30d": return 30
            case "90d": return 90
            case "1y": return 365
            default: return 30
        }
    }
}
