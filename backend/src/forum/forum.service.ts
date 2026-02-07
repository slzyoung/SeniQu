/**
 * Forum Service - Business Logic
 */

import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"
import { CreateThreadDto } from "./dto/create-thread.dto"
import { CreatePostDto } from "./dto/create-post.dto"

@Injectable()
export class ForumService {
    private readonly logger = new Logger(ForumService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    async getCategories() {
        const { data, error } = await this.supabase
            .from("forum_categories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })

        if (error) throw error
        return { data }
    }

    async getThreads(categorySlug?: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        let query = this.supabase
            .from("forum_threads")
            .select(`
                *,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role)
            `, { count: "exact" })

        if (categorySlug) {
            const { data: category } = await this.supabase
                .from("forum_categories")
                .select("id")
                .eq("slug", categorySlug)
                .single()

            if (category) {
                query = query.eq("category_id", category.id)
            }
        }

        const { data, error, count } = await query
            .order("is_pinned", { ascending: false })
            .order("last_reply_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

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

    async getThreadBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from("forum_threads")
            .select(`
                *,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role, is_verified)
            `)
            .eq("slug", slug)
            .single()

        if (error || !data) {
            throw new NotFoundException(`Thread not found`)
        }

        // Increment views
        await this.supabase
            .from("forum_threads")
            .update({ views: data.views + 1 })
            .eq("id", data.id)

        return { data }
    }

    async createThread(dto: CreateThreadDto, authorId: string) {
        const slug = this.generateSlug(dto.title)

        const { data, error } = await this.supabase
            .from("forum_threads")
            .insert({
                ...dto,
                author_id: authorId,
                slug,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create thread: ${error.message}`)
            throw error
        }

        // Update category thread count
        await this.supabase.rpc("increment_category_threads", { category_id: dto.category_id })

        return { data }
    }

    async getPosts(threadId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        const { data, error, count } = await this.supabase
            .from("forum_posts")
            .select(`
                *,
                author:users(id, display_name, avatar_url, role, is_verified)
            `, { count: "exact" })
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) throw error

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

    async createPost(threadId: string, dto: CreatePostDto, authorId: string) {
        // Check if thread is locked
        const { data: thread } = await this.supabase
            .from("forum_threads")
            .select("is_locked")
            .eq("id", threadId)
            .single()

        if (thread?.is_locked) {
            throw new BadRequestException("This thread is locked")
        }

        const { data, error } = await this.supabase
            .from("forum_posts")
            .insert({
                ...dto,
                thread_id: threadId,
                author_id: authorId,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create post: ${error.message}`)
            throw error
        }

        return { data }
    }

    async deletePost(postId: string, userId: string, userRole: string) {
        const { data: post } = await this.supabase
            .from("forum_posts")
            .select("author_id")
            .eq("id", postId)
            .single()

        if (!post) {
            throw new NotFoundException("Post not found")
        }

        // Only author or admin can delete
        const isAdmin = ["admin", "super_admin"].includes(userRole)
        if (post.author_id !== userId && !isAdmin) {
            throw new ForbiddenException("You cannot delete this post")
        }

        const { error } = await this.supabase
            .from("forum_posts")
            .delete()
            .eq("id", postId)

        if (error) throw error
        return { success: true }
    }

    async togglePin(threadId: string, pinned: boolean) {
        const { data, error } = await this.supabase
            .from("forum_threads")
            .update({ is_pinned: pinned })
            .eq("id", threadId)
            .select()
            .single()

        if (error) throw error
        return { data }
    }

    async toggleLock(threadId: string, locked: boolean) {
        const { data, error } = await this.supabase
            .from("forum_threads")
            .update({ is_locked: locked })
            .eq("id", threadId)
            .select()
            .single()

        if (error) throw error
        return { data }
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + "-" + Date.now().toString(36)
    }
}
