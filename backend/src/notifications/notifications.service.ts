/**
 * Notifications Service
 */

import { Injectable, Logger, ForbiddenException } from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"

type NotificationType = "system" | "artwork" | "art" | "forum" | "follow" | "sale" | "alert"

interface CreateNotificationDto {
    userId: string
    type: NotificationType
    title: string
    message?: string
    referenceId?: string
    referenceType?: string
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Create a notification
     */
    async create(dto: CreateNotificationDto) {
        const { error } = await this.supabase
            .from("notifications")
            .insert({
                user_id: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                reference_id: dto.referenceId,
                reference_type: dto.referenceType,
            })

        if (error) {
            this.logger.error(`Failed to create notification: ${error.message}`)
        }
    }

    /**
     * Get user notifications
     */
    async findByUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
        const offset = (page - 1) * limit

        let query = this.supabase
            .from("notifications")
            .select("*", { count: "exact" })
            .eq("user_id", userId)

        if (unreadOnly) {
            query = query.eq("is_read", false)
        }

        const { data, error, count } = await query
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

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string) {
        const { count, error } = await this.supabase
            .from("notifications")
            .select("id", { count: "exact" })
            .eq("user_id", userId)
            .eq("is_read", false)

        if (error) throw error
        return { count: count || 0 }
    }

    /**
     * Mark as read
     */
    async markAsRead(notificationId: string, userId: string) {
        const { data, error } = await this.supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", notificationId)
            .eq("user_id", userId)
            .select()
            .single()

        if (error) throw error
        return { data }
    }

    /**
     * Mark all as read
     */
    async markAllAsRead(userId: string) {
        const { error } = await this.supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("is_read", false)

        if (error) throw error
        return { success: true }
    }

    /**
     * Delete notification
     */
    async delete(notificationId: string, userId: string) {
        // Verify ownership
        const { data: notif } = await this.supabase
            .from("notifications")
            .select("user_id")
            .eq("id", notificationId)
            .single()

        if (notif?.user_id !== userId) {
            throw new ForbiddenException("Cannot delete this notification")
        }

        const { error } = await this.supabase
            .from("notifications")
            .delete()
            .eq("id", notificationId)

        if (error) throw error
        return { success: true }
    }

    // ===========================================
    // HELPER METHODS FOR AUTO-NOTIFICATIONS
    // ===========================================

    async notifyNewFollower(followedUserId: string, followerName: string) {
        await this.create({
            userId: followedUserId,
            type: "follow",
            title: "New Follower",
            message: `${followerName} started following you`,
        })
    }

    async notifyArtworkSold(artistId: string, artworkTitle: string, price: number) {
        await this.create({
            userId: artistId,
            type: "sale",
            title: "Artwork Sold! 🎉",
            message: `Your artwork "${artworkTitle}" was sold for ${price} ETH`,
        })
    }

    async notifyNewComment(userId: string, artworkTitle: string, commenterName: string) {
        await this.create({
            userId,
            type: "artwork",
            title: "New Comment",
            message: `${commenterName} commented on "${artworkTitle}"`,
        })
    }
}
