/**
 * Museums Service - Business Logic
 * Handles museum/gallery CRUD with geolocation queries
 */

import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    Logger,
} from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"
import { CreateMuseumDto } from "./dto/create-museum.dto"
import { UpdateMuseumDto } from "./dto/update-museum.dto"
import { SearchMuseumDto } from "./dto/search-museum.dto"

@Injectable()
export class MuseumsService {
    private readonly logger = new Logger(MuseumsService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Find all museums with filtering and pagination
     */
    async findAll(query: SearchMuseumDto) {
        const { page = 1, limit = 20, city, type, search, verified } = query
        const offset = (page - 1) * limit

        let queryBuilder = this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url)", { count: "exact" })

        // Filters
        if (city) {
            queryBuilder = queryBuilder.ilike("city", `%${city}%`)
        }
        if (type) {
            queryBuilder = queryBuilder.eq("type", type)
        }
        if (verified !== undefined) {
            queryBuilder = queryBuilder.eq("is_verified", verified)
        }
        if (search) {
            queryBuilder = queryBuilder.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // Only show verified by default for public queries
        queryBuilder = queryBuilder.eq("is_verified", true)

        // Pagination
        const { data, error, count } = await queryBuilder
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Failed to fetch museums: ${error.message}`)
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
     * Find museums near a geographic location
     */
    async findNearby(lat: number, lng: number, radiusKm: number) {
        // Using PostGIS ST_DWithin function via RPC
        const { data, error } = await this.supabase.rpc("find_nearby_institutions", {
            lat,
            lng,
            radius_km: radiusKm,
        })

        if (error) {
            this.logger.error(`Nearby search failed: ${error.message}`)
            // Fallback: return all in same city
            return { data: [], error: error.message }
        }

        return { data }
    }

    /**
     * Find pending museums (not verified)
     */
    async findPending() {
        // Build query
        const { data, error } = await this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url)")
            .eq("is_verified", false)
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to fetch pending museums: ${error.message}`)
            throw error
        }

        return data || []
    }

    /**
     * Find museum by slug
     */
    async findBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url, is_verified)")
            .eq("slug", slug)
            .single()

        if (error || !data) {
            throw new NotFoundException(`Museum '${slug}' not found`)
        }

        // Increment visitor count
        await this.supabase
            .from("institutions")
            .update({ total_visitors: data.total_visitors + 1 })
            .eq("id", data.id)

        return { data }
    }

    /**
     * Get artworks belonging to a museum
     */
    async getMuseumArtworks(museumId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        const { data, error, count } = await this.supabase
            .from("artworks")
            .select("*, artist:users!artworks_artist_id_fkey(id, display_name, avatar_url)", { count: "exact" })
            .eq("institution_id", museumId)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Failed to fetch museum artworks: ${error.message}`)
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
     * Create a new museum/gallery
     */
    async create(dto: CreateMuseumDto, ownerId: string) {
        // Generate unique slug
        const slug = this.generateSlug(dto.name)

        // Check slug uniqueness
        const { data: existing } = await this.supabase
            .from("institutions")
            .select("id")
            .eq("slug", slug)
            .single()

        if (existing) {
            throw new ConflictException("A museum with this name already exists")
        }

        const { data, error } = await this.supabase
            .from("institutions")
            .insert({
                ...dto,
                owner_id: ownerId,
                slug,
                is_verified: false, // Requires admin approval
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create museum: ${error.message}`)
            throw error
        }

        this.logger.log(`Museum created: ${data.name} by user ${ownerId}`)
        return { data, message: "Museum created successfully. Pending verification." }
    }

    /**
     * Update museum details
     */
    async update(id: string, dto: UpdateMuseumDto, userId: string) {
        // Check ownership
        const { data: museum } = await this.supabase
            .from("institutions")
            .select("owner_id")
            .eq("id", id)
            .single()

        if (!museum) {
            throw new NotFoundException("Museum not found")
        }

        if (museum.owner_id !== userId) {
            throw new ForbiddenException("You can only update your own museum")
        }

        const { data, error } = await this.supabase
            .from("institutions")
            .update(dto)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to update museum: ${error.message}`)
            throw error
        }

        return { data }
    }

    /**
     * Delete a museum (Admin only)
     */
    async remove(id: string) {
        const { error } = await this.supabase
            .from("institutions")
            .delete()
            .eq("id", id)

        if (error) {
            this.logger.error(`Failed to delete museum: ${error.message}`)
            throw error
        }

        this.logger.warn(`Museum deleted: ${id}`)
        return { success: true }
    }

    /**
     * Verify a museum (Admin only)
     */
    async verify(id: string) {
        const { data, error } = await this.supabase
            .from("institutions")
            .update({ is_verified: true })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw error
        }

        this.logger.log(`Museum verified: ${id}`)
        return { data, message: "Museum verified successfully" }
    }

    /**
     * Set featured status
     */
    async setFeatured(id: string, featured: boolean) {
        const { data, error } = await this.supabase
            .from("institutions")
            .update({ is_featured: featured })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw error
        }

        return { data }
    }

    /**
     * Generate URL-friendly slug
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + "-" + Date.now().toString(36)
    }
}
