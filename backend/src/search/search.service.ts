/**
 * Search Service - Full-text and geo search
 */

import { Injectable, Logger } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"

interface ArtworkSearchParams {
    query?: string
    genre?: string
    medium?: string
    priceMin?: number
    priceMax?: number
    isNft?: boolean
    page: number
    limit: number
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Global search across multiple entities
     */
    async search(query: string, type: string, limit: number) {
        const results: Record<string, any[]> = {}
        const searchTerm = `%${query}%`

        // Search Artworks
        if (type === "all" || type === "artworks") {
            const { data: artworks } = await this.supabase
                .from("artworks")
                .select("id, title, slug, primary_image_url, artist:users(display_name)")
                .eq("status", "published")
                .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(limit)

            results.artworks = artworks || []
        }

        // Search Museums
        if (type === "all" || type === "museums") {
            const { data: museums } = await this.supabase
                .from("institutions")
                .select("id, name, slug, logo_url, city, type")
                .eq("is_verified", true)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(limit)

            results.museums = museums || []
        }

        // Search Artists
        if (type === "all" || type === "artists") {
            const { data: artists } = await this.supabase
                .from("users")
                .select("id, display_name, username, avatar_url")
                .in("role", ["artist", "institution"])
                .or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
                .limit(limit)

            results.artists = artists || []
        }

        return { data: results }
    }

    /**
     * Advanced artwork search with filters
     */
    async searchArtworks(params: ArtworkSearchParams) {
        const { query, genre, medium, priceMin, priceMax, isNft, page, limit } = params
        const offset = (page - 1) * limit

        let queryBuilder = this.supabase
            .from("artworks")
            .select(`
                *,
                artist:users(id, display_name, avatar_url, is_verified),
                institution:institutions(id, name, slug)
            `, { count: "exact" })
            .eq("status", "published")

        // Text search
        if (query) {
            queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        }

        // Genre filter
        if (genre) {
            queryBuilder = queryBuilder.contains("genres", [genre])
        }

        // Medium filter
        if (medium) {
            queryBuilder = queryBuilder.eq("medium", medium)
        }

        // Price range
        if (priceMin !== undefined) {
            queryBuilder = queryBuilder.gte("price", priceMin)
        }
        if (priceMax !== undefined) {
            queryBuilder = queryBuilder.lte("price", priceMax)
        }

        // NFT filter
        if (isNft !== undefined) {
            queryBuilder = queryBuilder.eq("is_nft", isNft)
        }

        const { data, error, count } = await queryBuilder
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Artwork search failed: ${error.message}`)
            throw error
        }

        return {
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    /**
     * Geolocation-based search
     */
    async searchNearby(lat: number, lng: number, radiusKm: number) {
        // Use PostGIS function for accurate distance calculation
        const { data, error } = await this.supabase.rpc("find_nearby_institutions", {
            lat,
            lng,
            radius_km: radiusKm,
        })

        if (error) {
            this.logger.error(`Nearby search failed: ${error.message}`)
            // Fallback to simple lat/lng range query
            return this.fallbackNearbySearch(lat, lng, radiusKm)
        }

        return { data }
    }

    private async fallbackNearbySearch(lat: number, lng: number, radiusKm: number) {
        // Approximate degree conversion
        const latDelta = radiusKm / 111
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))

        const { data } = await this.supabase
            .from("institutions")
            .select("*")
            .eq("is_verified", true)
            // This is a simplified bounding box query
            .gte("ST_Y(location::geometry)", lat - latDelta)
            .lte("ST_Y(location::geometry)", lat + latDelta)
            .limit(20)

        return { data: data || [] }
    }

    /**
     * Autocomplete suggestions
     */
    async getSuggestions(query: string) {
        const searchTerm = `${query}%`

        const [artworks, museums, artists] = await Promise.all([
            this.supabase
                .from("artworks")
                .select("id, title")
                .eq("status", "published")
                .ilike("title", searchTerm)
                .limit(5),
            this.supabase
                .from("institutions")
                .select("id, name")
                .eq("is_verified", true)
                .ilike("name", searchTerm)
                .limit(5),
            this.supabase
                .from("users")
                .select("id, display_name")
                .in("role", ["artist", "institution"])
                .ilike("display_name", searchTerm)
                .limit(5),
        ])

        return {
            data: {
                artworks: (artworks.data || []).map(a => ({ type: "artwork", ...a })),
                museums: (museums.data || []).map(m => ({ type: "museum", ...m })),
                artists: (artists.data || []).map(a => ({ type: "artist", ...a })),
            },
        }
    }
}
