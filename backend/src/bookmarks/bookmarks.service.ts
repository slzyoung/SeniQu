/**
 * Bookmarks Service - Business Logic
 */

import { Injectable, ConflictException, Logger } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class BookmarksService {
    private readonly logger = new Logger(BookmarksService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    async findByUser(userId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        const { data, error, count } = await this.supabase
            .from("bookmarks")
            .select(`
                id,
                created_at,
                artwork:artworks(
                    id, title, slug, primary_image_url, price, is_art,
                    artist:users!artist_id(id, display_name, avatar_url)
                )
            `, { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Failed to fetch bookmarks: ${error.message}`)
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

    async create(userId: string, artworkId: string) {
        // Check if already bookmarked
        const { data: existing } = await this.supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", userId)
            .eq("artwork_id", artworkId)
            .single()

        if (existing) {
            throw new ConflictException("Artwork already bookmarked")
        }

        const { data, error } = await this.supabase
            .from("bookmarks")
            .insert({ user_id: userId, artwork_id: artworkId })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create bookmark: ${error.message}`)
            throw error
        }

        // Increment artwork likes count
        await this.supabase.rpc("increment_artwork_likes", { artwork_id: artworkId })

        return { data, message: "Artwork bookmarked" }
    }

    async remove(userId: string, artworkId: string) {
        const { error } = await this.supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("artwork_id", artworkId)

        if (error) {
            this.logger.error(`Failed to remove bookmark: ${error.message}`)
            throw error
        }

        // Decrement artwork likes count
        await this.supabase.rpc("decrement_artwork_likes", { artwork_id: artworkId })

        return { success: true }
    }

    async isBookmarked(userId: string, artworkId: string) {
        const { data, error } = await this.supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", userId)
            .eq("artwork_id", artworkId)
            .single()

        return { isBookmarked: !!data && !error }
    }
}
