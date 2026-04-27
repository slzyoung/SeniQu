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
            .select("*, forum_threads(count)")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })

        if (error) throw error

        const mappedData = data.map((cat: any) => ({
            ...cat,
            threadCount: cat.forum_threads?.[0]?.count || 0,
            thread_count: cat.forum_threads?.[0]?.count || 0,
        }))

        return { data: mappedData }
    }

    async getThreads(categoryId?: string, page = 1, limit = 20, sortBy: "latest" | "popular" | "views" = "latest") {
        const offset = (page - 1) * limit

        let query = this.supabase
            .from("forum_threads")
            .select(`
                *,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role)
            `, { count: "exact" })

        if (categoryId) {
            query = query.eq("category_id", categoryId)
        }

        // Apply sorting based on frontend choice
        if (sortBy === "popular") {
            query = query.order("is_pinned", { ascending: false }).order("likes", { ascending: false }).order("created_at", { ascending: false })
        } else if (sortBy === "views") {
            query = query.order("is_pinned", { ascending: false }).order("views", { ascending: false }).order("created_at", { ascending: false })
        } else {
            // Default: Latest
            query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false })
        }

        const { data, error, count } = await query
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

    async getThreadById(id: string) {
        const { data, error } = await this.supabase
            .from("forum_threads")
            .select(`
                *,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role, is_verified)
            `)
            .eq("id", id)
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

    async getPosts(threadId: string, page: any = 1, limit: any = 20) {
        let p = parseInt(page, 10);
        let l = parseInt(limit, 10);
        if (isNaN(p) || p < 1) p = 1;
        if (isNaN(l) || l < 1) l = 20;

        const offset = (p - 1) * l;

        this.logger.debug(`Fetching posts for thread ${threadId}: page=${p}, limit=${l}, offset=${offset}`);

        const { data, error, count } = await this.supabase
            .from("forum_posts")
            .select(`
                *,
                author:users(id, username, display_name, avatar_url, role, is_verified)
            `, { count: "exact" })
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true })
            .range(offset, offset + l - 1);

        if (error) {
            this.logger.error("Error fetching posts:", error);
            throw error;
        }

        this.logger.debug(`Found ${count} posts, mapping data: ${data?.length} records`);

        return {
            data,
            meta: {
                total: count,
                page: p,
                limit: l,
                totalPages: Math.ceil((count || 0) / l),
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

    async toggleLike(targetId: string, userId: string, type: 'forum_thread' | 'forum_post', isLike: boolean) {
        const tableName = type === 'forum_thread' ? 'forum_threads' : 'forum_posts'

        if (isLike) {
            // Check if already liked using a safe method
            const { error: insertError } = await this.supabase
                .from('likes')
                .insert({ user_id: userId, target_type: type, target_id: targetId })

            // Only increment count if insert was successful (meaning they haven't liked it yet)
            if (!insertError) {
                const { data } = await this.supabase.from(tableName).select('likes').eq('id', targetId).single()
                if (data) {
                    await this.supabase.from(tableName).update({ likes: (data.likes || 0) + 1 }).eq('id', targetId)
                }
            }
            return { success: true, liked: true }
        } else {
            // Delete like
            const { error: deleteError, count } = await this.supabase
                .from('likes')
                .delete({ count: 'exact' })
                .eq('user_id', userId)
                .eq('target_type', type)
                .eq('target_id', targetId)

            // Decrement if one was deleted
            if (!deleteError && count && count > 0) {
                const { data } = await this.supabase.from(tableName).select('likes').eq('id', targetId).single()
                if (data && data.likes > 0) {
                    await this.supabase.from(tableName).update({ likes: data.likes - 1 }).eq('id', targetId)
                }
            }
            return { success: true, liked: false }
        }
    }

    /**
     * Get trending threads — sorted by engagement (likes + views) in the last 7 days
     */
    async getTrending(limit = 10) {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await this.supabase
            .from("forum_threads")
            .select(`
                id, title, slug, views, likes, reply_count, created_at,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role)
            `)
            .gte("created_at", sevenDaysAgo.toISOString())
            .order("likes", { ascending: false })
            .order("views", { ascending: false })
            .limit(limit)

        if (error) {
            this.logger.warn(`Trending query error: ${error.message}`)
            // Fallback: return latest threads if trending query fails
            const fallback = await this.supabase
                .from("forum_threads")
                .select(`
                    id, title, slug, views, likes, reply_count, created_at,
                    category:forum_categories(id, name, slug),
                    author:users(id, display_name, avatar_url, role)
                `)
                .order("created_at", { ascending: false })
                .limit(limit)

            return { data: fallback.data || [] }
        }

        // If no trending in last 7 days, fallback to all-time popular
        if (!data || data.length === 0) {
            const { data: allTime } = await this.supabase
                .from("forum_threads")
                .select(`
                    id, title, slug, views, likes, reply_count, created_at,
                    category:forum_categories(id, name, slug),
                    author:users(id, display_name, avatar_url, role)
                `)
                .order("likes", { ascending: false })
                .order("views", { ascending: false })
                .limit(limit)

            return { data: allTime || [] }
        }

        return { data }
    }

    /**
     * Get featured threads — pinned or explicitly featured threads with media
     */
    async getFeatured() {
        const { data, error } = await this.supabase
            .from("forum_threads")
            .select(`
                id, title, slug, content, media_url, media_type, views, likes, reply_count, is_pinned, is_featured, created_at,
                category:forum_categories(id, name, slug),
                author:users(id, display_name, avatar_url, role)
            `)
            .or("is_featured.eq.true,is_pinned.eq.true")
            .order("created_at", { ascending: false })
            .limit(5)

        if (error) {
            this.logger.warn(`Featured query error: ${error.message}`)
            return { data: [] }
        }

        return { data: data || [] }
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + "-" + Date.now().toString(36)
    }
}
