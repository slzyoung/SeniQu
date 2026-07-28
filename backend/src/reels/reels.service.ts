/**
 * Reels Service — Short-form video content management
 * Instagram-style engagement: likes, comments, shares, reshares
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { EmailNotificationService } from "../email/email-notification.service"
import { NotificationsService } from "../notifications/notifications.service"

@Injectable()
export class ReelsService {
    private readonly logger = new Logger(ReelsService.name)
    private supabase: SupabaseClient

    constructor(
        private readonly configService: ConfigService,
        private readonly emailNotification: EmailNotificationService,
        private readonly notificationsService: NotificationsService
    ) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL") || "",
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY") || "",
        )
    }

    // ==========================================
    // FEED
    // ==========================================

    async getFeed(page = 1, limit = 10, userId?: string, creatorId?: string) {
        const offset = (page - 1) * limit

        let query = this.supabase
            .from("reels")
            .select(`
                *,
                user:users!reels_user_id_fkey(id, display_name, avatar_url, role)
            `, { count: "exact" })
            .eq("status", "active")

        if (creatorId) {
            query = query.eq("user_id", creatorId)
        }

        query = query.order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        const { data, count, error } = await query

        if (error) {
            this.logger.error(`Feed error: ${error.message}`)
            throw new BadRequestException("Failed to load reels feed")
        }

        // Check if current user liked/reshared each reel, and follows the creator
        let enriched = data || []
        if (userId && enriched.length > 0) {
            const reelIds = enriched.map(r => r.id)
            const creatorIds = enriched.map(r => r.user_id).filter(Boolean)

            const [likesRes, resharesRes, followsRes] = await Promise.all([
                this.supabase.from("reel_likes").select("reel_id").eq("user_id", userId).in("reel_id", reelIds),
                this.supabase.from("reel_reshares").select("reel_id").eq("user_id", userId).in("reel_id", reelIds),
                this.supabase.from("follows").select("following_id").eq("follower_id", userId).in("following_id", creatorIds),
            ])

            const likedIds = new Set((likesRes.data || []).map(l => l.reel_id))
            const resharedIds = new Set((resharesRes.data || []).map(r => r.reel_id))
            const followedCreatorIds = new Set((followsRes.data || []).map(f => f.following_id))

            enriched = enriched.map(r => ({
                ...r,
                isLiked: likedIds.has(r.id),
                isReshared: resharedIds.has(r.id),
                isFollowing: followedCreatorIds.has(r.user_id),
            }))
        }

        return {
            data: enriched,
            meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        }
    }

    async getReelById(id: string, userId?: string) {
        const { data, error } = await this.supabase
            .from("reels")
            .select(`*, user:users!reels_user_id_fkey(id, display_name, avatar_url, role)`)
            .eq("id", id)
            .eq("status", "active")
            .single()

        if (error || !data) throw new NotFoundException("Reel not found")

        if (userId) {
            const [likeRes, reshareRes, followRes] = await Promise.all([
                this.supabase.from("reel_likes").select("id").eq("reel_id", id).eq("user_id", userId).maybeSingle(),
                this.supabase.from("reel_reshares").select("id").eq("reel_id", id).eq("user_id", userId).maybeSingle(),
                this.supabase.from("follows").select("id").eq("follower_id", userId).eq("following_id", data.user_id).maybeSingle(),
            ])
            return { ...data, isLiked: !!likeRes.data, isReshared: !!reshareRes.data, isFollowing: !!followRes.data }
        }

        return data
    }

    // ==========================================
    // CREATE REEL
    // ==========================================

    async createReel(userId: string, data: {
        videoUrl: string; videoKey: string; thumbnailUrl?: string; thumbnailKey?: string;
        caption?: string; hashtags?: string[];
        duration?: number; width?: number; height?: number; fileSize?: number; aspectRatio?: string;
        audioMetadata?: any; locationName?: string; locationLat?: number; locationLng?: number;
    }) {
        const { data: reel, error } = await this.supabase
            .from("reels")
            .insert({
                user_id: userId,
                video_url: data.videoUrl,
                video_key: data.videoKey,
                thumbnail_url: data.thumbnailUrl || null,
                thumbnail_key: data.thumbnailKey || null,
                caption: data.caption || null,
                hashtags: data.hashtags || [],
                duration: data.duration || 0,
                width: data.width || 0,
                height: data.height || 0,
                file_size: data.fileSize || 0,
                aspect_ratio: data.aspectRatio || "9:16",
                audio_metadata: data.audioMetadata || {},
                location_name: data.locationName || null,
                location_lat: data.locationLat ?? null,
                location_lng: data.locationLng ?? null,
                status: "active",
            })
            .select(`*, user:users!reels_user_id_fkey(id, display_name, avatar_url, role)`)
            .single()

        if (error) {
            this.logger.error(`Create reel error: ${error.message}`)
            throw new BadRequestException("Failed to create reel")
        }

        this.logger.log(`🎬 Reel created: ${reel.id} by ${userId}`)
        return reel
    }

    async deleteReel(id: string, userId: string, role: string) {
        const { data: reel } = await this.supabase.from("reels").select("user_id").eq("id", id).single()
        if (!reel) throw new NotFoundException("Reel not found")
        if (reel.user_id !== userId && !["admin", "super_admin"].includes(role)) {
            throw new ForbiddenException("Not authorized")
        }

        await this.supabase.from("reels").update({ status: "deleted" }).eq("id", id)
        return { message: "Reel deleted" }
    }

    /**
     * Update reel metadata after async compression completes.
     * Called by the upload status polling endpoint when compression is done.
     */
    async updateReelMetadata(reelId: string, metadata: {
        duration?: number
        width?: number
        height?: number
        fileSize?: number
        aspectRatio?: string
    }) {
        const updateData: any = {}
        if (metadata.duration !== undefined) updateData.duration = metadata.duration
        if (metadata.width !== undefined) updateData.width = metadata.width
        if (metadata.height !== undefined) updateData.height = metadata.height
        if (metadata.fileSize !== undefined) updateData.file_size = metadata.fileSize
        if (metadata.aspectRatio !== undefined) updateData.aspect_ratio = metadata.aspectRatio

        if (Object.keys(updateData).length === 0) return

        const { error } = await this.supabase
            .from("reels")
            .update(updateData)
            .eq("id", reelId)

        if (error) {
            this.logger.error(`Failed to update reel metadata for ${reelId}: ${error.message}`)
        } else {
            this.logger.log(`📊 Updated reel metadata: ${reelId}`)
        }
    }

    // ==========================================
    // LIKES
    // ==========================================

    async toggleLike(reelId: string, userId: string) {
        const { data: existing } = await this.supabase
            .from("reel_likes").select("id").eq("reel_id", reelId).eq("user_id", userId).maybeSingle()

        if (existing) {
            await this.supabase.from("reel_likes").delete().eq("id", existing.id)
            return { liked: false }
        } else {
            await this.supabase.from("reel_likes").insert({ reel_id: reelId, user_id: userId })

            // Trigger like email notification (non-blocking)
            this.triggerReelLikeNotification(userId, reelId).catch(err => {
                this.logger.error(`Failed to send reel like notification: ${err.message}`)
            })

            return { liked: true }
        }
    }

    // ==========================================
    // COMMENTS
    // ==========================================

    async getComments(reelId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit
        const { data, count, error } = await this.supabase
            .from("reel_comments")
            .select(`*, user:users!reel_comments_user_id_fkey(id, display_name, avatar_url)`, { count: "exact" })
            .eq("reel_id", reelId)
            .is("parent_id", null)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw new BadRequestException("Failed to load comments")

        // Enrich each top-level comment with reply_count
        const enriched = await Promise.all((data || []).map(async (comment) => {
            const { count: replyCount } = await this.supabase
                .from("reel_comments")
                .select("id", { count: "exact", head: true })
                .eq("parent_id", comment.id)
            return { ...comment, reply_count: replyCount || 0 }
        }))

        return {
            data: enriched,
            meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        }
    }

    async getReplies(commentId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit
        const { data, count, error } = await this.supabase
            .from("reel_comments")
            .select(`*, user:users!reel_comments_user_id_fkey(id, display_name, avatar_url)`, { count: "exact" })
            .eq("parent_id", commentId)
            .order("created_at", { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) throw new BadRequestException("Failed to load replies")

        return {
            data: data || [],
            meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        }
    }

    async toggleCommentLike(commentId: string, userId: string) {
        const { data: existing } = await this.supabase
            .from("reel_comment_likes")
            .select("id")
            .eq("comment_id", commentId)
            .eq("user_id", userId)
            .maybeSingle()

        if (existing) {
            await this.supabase.from("reel_comment_likes").delete().eq("id", existing.id)
            return { liked: false }
        } else {
            // Try inserting — table may not exist yet, so gracefully handle
            const { error } = await this.supabase
                .from("reel_comment_likes")
                .insert({ comment_id: commentId, user_id: userId })
            if (error) {
                this.logger.warn(`Comment like insert failed (table may not exist): ${error.message}`)
                // Fallback: return liked true anyway to not break UX
            }
            return { liked: true }
        }
    }

    async createComment(reelId: string, userId: string, content: string, parentId?: string) {
        const { data, error } = await this.supabase
            .from("reel_comments")
            .insert({ reel_id: reelId, user_id: userId, content, parent_id: parentId || null })
            .select(`*, user:users!reel_comments_user_id_fkey(id, display_name, avatar_url)`)
            .single()

        if (error) throw new BadRequestException("Failed to post comment")

        // Trigger comment email notification (non-blocking)
        this.triggerReelCommentNotification(userId, reelId, content).catch(err => {
            this.logger.error(`Failed to send reel comment notification: ${err.message}`)
        })

        return data
    }

    async deleteComment(commentId: string, userId: string, role: string) {
        const { data } = await this.supabase.from("reel_comments").select("user_id").eq("id", commentId).single()
        if (!data) throw new NotFoundException("Comment not found")
        if (data.user_id !== userId && !["admin", "super_admin"].includes(role)) {
            throw new ForbiddenException("Not authorized")
        }
        // Also delete all replies to this comment
        await this.supabase.from("reel_comments").delete().eq("parent_id", commentId)
        await this.supabase.from("reel_comments").delete().eq("id", commentId)
        return { message: "Comment deleted" }
    }

    // ==========================================
    // RESHARES
    // ==========================================

    async toggleReshare(reelId: string, userId: string, caption?: string) {
        const { data: existing } = await this.supabase
            .from("reel_reshares").select("id").eq("reel_id", reelId).eq("user_id", userId).maybeSingle()

        if (existing) {
            await this.supabase.from("reel_reshares").delete().eq("id", existing.id)
            return { reshared: false }
        } else {
            await this.supabase.from("reel_reshares").insert({ reel_id: reelId, user_id: userId, caption })
            return { reshared: true }
        }
    }

    // ==========================================
    // VIEWS
    // ==========================================

    async recordView(reelId: string, userId?: string, watchDuration?: number, completed?: boolean) {
        await this.supabase.from("reel_views").insert({
            reel_id: reelId,
            user_id: userId || null,
            watch_duration: watchDuration || 0,
            completed: completed || false,
        })
        // Increment view count
        try {
            const { error } = await this.supabase.rpc("increment_reel_view_count", { reel_id_input: reelId })
            if (error) throw error
        } catch (err) {
            // Fallback: direct update
            const { data } = await this.supabase.from("reels").select("view_count").eq("id", reelId).single()
            if (data) {
                await this.supabase.from("reels").update({ view_count: (data.view_count || 0) + 1 }).eq("id", reelId)
            }
        }
    }

    // ==========================================
    // SAVED REELS (user's bookmarked/reshared)
    // ==========================================

    async getSavedReels(userId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        // Get reel IDs that the user has reshared/saved
        const { data: reshares, count, error } = await this.supabase
            .from("reel_reshares")
            .select("reel_id, created_at", { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Saved reels error: ${error.message}`)
            throw new BadRequestException("Failed to load saved reels")
        }

        if (!reshares || reshares.length === 0) {
            return {
                data: [],
                meta: { total: count || 0, page, limit, totalPages: 0 },
            }
        }

        const reelIds = reshares.map(r => r.reel_id)

        // Fetch full reel data with user info
        const { data: reels } = await this.supabase
            .from("reels")
            .select(`
                *,
                user:users!reels_user_id_fkey(id, display_name, avatar_url, role)
            `)
            .in("id", reelIds)
            .eq("status", "active")

        // Maintain the saved order
        const reelMap = new Map((reels || []).map(r => [r.id, r]))
        const ordered = reelIds.map(id => reelMap.get(id)).filter(Boolean).map(r => ({
            ...r,
            isLiked: false,
            isReshared: true, // all saved reels are reshared by definition
        }))

        // Check likes and follows
        if (ordered.length > 0) {
            const creatorIds = ordered.map(r => r.user_id).filter(Boolean)
            const [likes, followsRes] = await Promise.all([
                this.supabase.from("reel_likes").select("reel_id").eq("user_id", userId).in("reel_id", reelIds),
                this.supabase.from("follows").select("following_id").eq("follower_id", userId).in("following_id", creatorIds),
            ])

            const likedIds = new Set((likes.data || []).map(l => l.reel_id))
            const followedCreatorIds = new Set((followsRes.data || []).map(f => f.following_id))
            ordered.forEach(r => { 
                (r as any).isLiked = likedIds.has(r.id);
                (r as any).isFollowing = followedCreatorIds.has(r.user_id);
            })
        }

        return {
            data: ordered,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    private async triggerReelLikeNotification(likerId: string, reelId: string) {
        try {
            const [likerRes, reelRes] = await Promise.all([
                this.supabase.from("users").select("display_name, username").eq("id", likerId).single(),
                this.supabase.from("reels").select("user_id, caption").eq("id", reelId).single()
            ])

            if (likerRes.data && reelRes.data && reelRes.data.user_id) {
                const likerName = likerRes.data.display_name || likerRes.data.username || "Seseorang"
                const reel = reelRes.data

                if (reel.user_id !== likerId) {
                    await this.notificationsService.create({
                        userId: reel.user_id,
                        type: "artwork",
                        title: "Sukai Baru di Reels",
                        message: `${likerName} menyukai Reels Anda`,
                        referenceId: reelId,
                        referenceType: "reel"
                    }).catch(err => {
                        this.logger.error(`Failed to create reel like in-app notification: ${err.message}`)
                    })
                }

                await this.emailNotification.sendLikeNotification(
                    likerId,
                    reel.user_id,
                    "reel",
                    reelId,
                    reel.caption || "Reels"
                )
            }
        } catch (err: any) {
            this.logger.error(`Error in triggerReelLikeNotification: ${err.message}`)
        }
    }

    private async triggerReelCommentNotification(commenterId: string, reelId: string, content: string) {
        try {
            const [commenterRes, reelRes] = await Promise.all([
                this.supabase.from("users").select("display_name, username").eq("id", commenterId).single(),
                this.supabase.from("reels").select("user_id, caption").eq("id", reelId).single()
            ])

            if (commenterRes.data && reelRes.data && reelRes.data.user_id) {
                const commenterName = commenterRes.data.display_name || commenterRes.data.username || "Seseorang"
                const reel = reelRes.data

                if (reel.user_id !== commenterId) {
                    await this.notificationsService.create({
                        userId: reel.user_id,
                        type: "artwork",
                        title: "Komentar Baru di Reels",
                        message: `${commenterName} mengomentari Reels Anda: "${reel.caption || 'Reels'}"`,
                        referenceId: reelId,
                        referenceType: "reel"
                    }).catch(err => {
                        this.logger.error(`Failed to create reel comment in-app notification: ${err.message}`)
                    })
                }

                await this.emailNotification.sendCommentNotification(
                    commenterId,
                    reel.user_id,
                    "reel",
                    reelId,
                    reel.caption || "Reels",
                    content
                )
            }
        } catch (err: any) {
            this.logger.error(`Error in triggerReelCommentNotification: ${err.message}`)
        }
    }
}
