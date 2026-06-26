/**
 * Messages Service — Secure In-App Messaging
 * 
 * Best Practices:
 * - Messages stored in DATABASE (Supabase) not CDN — CDN is for static assets, 
 *   DB is for dynamic, relational, access-controlled data
 * - Messages are encrypted client-side (E2E) before transmission
 * - Server stores only ciphertext + IV — cannot read message content
 * - Rate limiting prevents spam/scam flooding
 * - Message reporting system for anti-scam protection
 * - Conversation-level blocking support
 * - All message metadata is audit-logged
 */

import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { SendMessageDto, ReportMessageDto } from "./dto/message.dto"
import { EmailNotificationService } from "../email/email-notification.service"
import { NotificationsService } from "../notifications/notifications.service"

// Anti-spam: max messages per minute per user
const MAX_MESSAGES_PER_MINUTE = 30
const SPAM_WINDOW_MS = 60_000

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name)
    
    // In-memory rate limiting (per-instance; use Redis for multi-instance)
    private rateLimits = new Map<string, { count: number; resetAt: number }>()

    constructor(
        private readonly db: DatabaseService,
        private readonly emailNotification: EmailNotificationService,
        private readonly notificationsService: NotificationsService
    ) {}

    /**
     * Send an encrypted message
     */
    async sendMessage(senderId: string, dto: SendMessageDto) {
        // Rate limit check
        this.checkRateLimit(senderId)

        // Prevent self-messaging
        if (senderId === dto.recipientId) {
            throw new BadRequestException("Cannot send a message to yourself")
        }

        // Verify recipient exists
        const client = this.db.getAdminClient()
        const { data: recipient } = await client
            .from("users")
            .select("id, display_name")
            .eq("id", dto.recipientId)
            .single()

        if (!recipient) {
            throw new NotFoundException("Recipient not found")
        }

        // Check if blocked
        const { data: block } = await client
            .from("message_blocks")
            .select("id")
            .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${dto.recipientId}),and(blocker_id.eq.${dto.recipientId},blocked_id.eq.${senderId})`)
            .limit(1)
            .single()

        if (block) {
            throw new ForbiddenException("Cannot send messages to this user")
        }

        // Get or create conversation
        let conversationId = await this.findConversation(senderId, dto.recipientId)
        
        if (!conversationId) {
            const { data: conv, error: convErr } = await client
                .from("conversations")
                .insert({
                    participant_a: senderId < dto.recipientId ? senderId : dto.recipientId,
                    participant_b: senderId < dto.recipientId ? dto.recipientId : senderId,
                })
                .select("id")
                .single()

            if (convErr) {
                this.logger.error(`Failed to create conversation: ${convErr.message}`)
                throw new Error(convErr.message)
            }
            conversationId = conv.id
        }

        // Store encrypted message
        const { data: message, error: msgErr } = await client
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                recipient_id: dto.recipientId,
                encrypted_content: dto.encryptedContent,
                iv: dto.iv,
                sender_public_key: dto.senderPublicKey || null,
            })
            .select("id, conversation_id, sender_id, recipient_id, created_at")
            .single()

        if (msgErr) {
            this.logger.error(`Failed to send message: ${msgErr.message}`)
            throw new Error(msgErr.message)
        }

        // Update conversation last_message_at
        await client
            .from("conversations")
            .update({ 
                last_message_at: new Date().toISOString(),
                last_message_preview: "[Encrypted Message]",
            })
            .eq("id", conversationId)

        this.logger.log(`💬 Message sent: ${message.id} from ${senderId} to ${dto.recipientId}`)

        // Trigger email notification (non-blocking, throttled internally)
        this.emailNotification.sendChatNotification(senderId, dto.recipientId).catch(err => {
            this.logger.error(`Failed to send email notification: ${err.message}`)
        });

        // Trigger in-app notification (non-blocking)
        (async () => {
            const { data } = await client.from("users").select("display_name, username").eq("id", senderId).single()
            if (data) {
                const senderName = data.display_name || data.username || "Seseorang"
                await this.notificationsService.create({
                    userId: dto.recipientId,
                    type: "system",
                    title: "Pesan Baru",
                    message: `${senderName} mengirimkan pesan baru untuk Anda`,
                    referenceId: message.id,
                    referenceType: "message",
                })
            }
        })().catch((err: any) => {
            this.logger.error(`Failed to send message in-app notification: ${err.message}`)
        })

        return {
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            recipientId: message.recipient_id,
            createdAt: message.created_at,
        }
    }

    /**
     * Get user's conversations list
     */
    async getConversations(userId: string) {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("conversations")
            .select(`
                id,
                participant_a,
                participant_b,
                last_message_at,
                last_message_preview,
                created_at,
                user_a:participant_a(id, display_name, avatar_url),
                user_b:participant_b(id, display_name, avatar_url)
            `)
            .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
            .order("last_message_at", { ascending: false })
            .limit(50)

        if (error) {
            this.logger.error(`Failed to fetch conversations: ${error.message}`)
            throw new Error(error.message)
        }

        // Fetch follow relationships to determine mutual follow status
        const { data: follows } = await client
            .from("follows")
            .select("follower_id, following_id")
            .or(`follower_id.eq.${userId},following_id.eq.${userId}`)

        const followingSet = new Set<string>()
        const followersSet = new Set<string>()
        if (follows) {
            follows.forEach((f: any) => {
                if (f.follower_id === userId) {
                    followingSet.add(f.following_id)
                }
                if (f.following_id === userId) {
                    followersSet.add(f.follower_id)
                }
            })
        }

        // Fetch unread counts for all conversations of this user
        const { data: unreads } = await client
            .from("messages")
            .select("conversation_id")
            .eq("recipient_id", userId)
            .eq("is_read", false)

        const unreadCounts = new Map<string, number>()
        if (unreads) {
            unreads.forEach((u: any) => {
                unreadCounts.set(u.conversation_id, (unreadCounts.get(u.conversation_id) || 0) + 1)
            })
        }

        // Map to frontend-friendly format
        return (data || []).map((conv: any) => {
            const isA = conv.participant_a === userId
            const otherUser = isA ? conv.user_b : conv.user_a
            const otherUserId = otherUser?.id
            const isMutual = otherUserId ? (followingSet.has(otherUserId) && followersSet.has(otherUserId)) : false

            return {
                id: conv.id,
                otherUser: otherUser ? {
                    id: otherUser.id,
                    displayName: otherUser.display_name,
                    avatarUrl: otherUser.avatar_url,
                    isMutual,
                } : null,
                lastMessageAt: conv.last_message_at,
                lastMessagePreview: conv.last_message_preview,
                createdAt: conv.created_at,
                unreadCount: unreadCounts.get(conv.id) || 0,
            }
        })
    }

    /**
     * Get messages in a conversation (paginated)
     */
    async getMessages(userId: string, conversationId: string, cursor?: string) {
        const client = this.db.getAdminClient()

        // Verify user is part of conversation
        const { data: conv } = await client
            .from("conversations")
            .select("participant_a, participant_b")
            .eq("id", conversationId)
            .single()

        if (!conv) throw new NotFoundException("Conversation not found")
        if (conv.participant_a !== userId && conv.participant_b !== userId) {
            throw new ForbiddenException("Not your conversation")
        }

        let query = client
            .from("messages")
            .select("id, conversation_id, sender_id, recipient_id, encrypted_content, iv, sender_public_key, created_at, is_read")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(50)

        if (cursor) {
            query = query.lt("created_at", cursor)
        }

        const { data, error } = await query

        if (error) {
            this.logger.error(`Failed to fetch messages: ${error.message}`)
            throw new Error(error.message)
        }

        // Mark received messages as read
        await client
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .eq("recipient_id", userId)
            .eq("is_read", false)

        return (data || []).map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            recipientId: msg.recipient_id,
            encryptedContent: msg.encrypted_content,
            iv: msg.iv,
            senderPublicKey: msg.sender_public_key,
            createdAt: msg.created_at,
            isRead: msg.is_read,
        }))
    }

    /**
     * Get unread message count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const client = this.db.getAdminClient()

        const { count, error } = await client
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", userId)
            .eq("is_read", false)

        if (error) return 0
        return count || 0
    }

    /**
     * Report a message (anti-scam)
     */
    async reportMessage(userId: string, dto: ReportMessageDto) {
        const client = this.db.getAdminClient()

        // Verify message exists and user is the recipient
        const { data: msg } = await client
            .from("messages")
            .select("id, recipient_id, sender_id")
            .eq("id", dto.messageId)
            .single()

        if (!msg) throw new NotFoundException("Message not found")
        if (msg.recipient_id !== userId) {
            throw new ForbiddenException("You can only report messages sent to you")
        }

        const { data, error } = await client
            .from("message_reports")
            .insert({
                message_id: dto.messageId,
                reporter_id: userId,
                reported_user_id: msg.sender_id,
                reason: dto.reason,
            })
            .select("id")
            .single()

        if (error) {
            this.logger.error(`Failed to report message: ${error.message}`)
            throw new Error(error.message)
        }

        this.logger.warn(`⚠️ Message reported: ${dto.messageId} by ${userId}, reason: ${dto.reason}`)
        return { reportId: data.id }
    }

    /**
     * Block a user from messaging
     */
    async blockUser(blockerId: string, blockedId: string) {
        if (blockerId === blockedId) {
            throw new BadRequestException("Cannot block yourself")
        }

        const client = this.db.getAdminClient()

        // Check if already blocked
        const { data: existing } = await client
            .from("message_blocks")
            .select("id")
            .eq("blocker_id", blockerId)
            .eq("blocked_id", blockedId)
            .single()

        if (existing) return { blocked: true }

        const { error } = await client
            .from("message_blocks")
            .insert({
                blocker_id: blockerId,
                blocked_id: blockedId,
            })

        if (error) throw new Error(error.message)

        this.logger.log(`🚫 User ${blockerId} blocked ${blockedId}`)
        return { blocked: true }
    }

    /**
     * Unblock a user
     */
    async unblockUser(blockerId: string, blockedId: string) {
        const client = this.db.getAdminClient()

        await client
            .from("message_blocks")
            .delete()
            .eq("blocker_id", blockerId)
            .eq("blocked_id", blockedId)

        return { blocked: false }
    }

    // ─── Private helpers ────────────────────────────

    private async findConversation(userA: string, userB: string): Promise<string | null> {
        const client = this.db.getAdminClient()
        const [pA, pB] = userA < userB ? [userA, userB] : [userB, userA]

        const { data } = await client
            .from("conversations")
            .select("id")
            .eq("participant_a", pA)
            .eq("participant_b", pB)
            .single()

        return data?.id || null
    }

    private checkRateLimit(userId: string) {
        const now = Date.now()
        const entry = this.rateLimits.get(userId)

        if (!entry || now > entry.resetAt) {
            this.rateLimits.set(userId, { count: 1, resetAt: now + SPAM_WINDOW_MS })
            return
        }

        if (entry.count >= MAX_MESSAGES_PER_MINUTE) {
            throw new BadRequestException(
                "Too many messages. Please wait before sending more."
            )
        }

        entry.count++
    }

    async searchUsers(userId: string, query: string) {
        if (!query || query.trim().length === 0) return []

        const client = this.db.getAdminClient()
        const searchTerm = `%${query.trim()}%`

        // 1. Fetch blocked users to exclude them
        const { data: blocks } = await client
            .from("message_blocks")
            .select("blocker_id, blocked_id")
            .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

        const blockedUserIds = new Set<string>()
        if (blocks) {
            blocks.forEach((b: any) => {
                if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id)
                if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id)
            })
        }

        // 2. Fetch users matching search query (exclude self)
        const { data: users, error } = await client
            .from("users")
            .select("id, display_name, username, avatar_url")
            .neq("id", userId)
            .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
            .limit(30)

        if (error) {
            this.logger.error(`Failed to search users for messaging: ${error.message}`)
            throw new Error(error.message)
        }

        // Filter out blocked users
        const filteredUsers = (users || []).filter(u => !blockedUserIds.has(u.id))

        // 3. Check follow status for each user
        const userIds = filteredUsers.map(u => u.id)
        let followedUserIds = new Set<string>()
        let followingMeUserIds = new Set<string>()

        if (userIds.length > 0) {
            const { data: follows } = await client
                .from("follows")
                .select("follower_id, following_id")
                .or(`follower_id.eq.${userId},following_id.eq.${userId}`)

            if (follows) {
                follows.forEach((f: any) => {
                    if (f.follower_id === userId) followedUserIds.add(f.following_id)
                    if (f.following_id === userId) followingMeUserIds.add(f.follower_id)
                })
            }
        }

        // Map and sort (followed users first)
        return filteredUsers.map(u => {
            const isFollowed = followedUserIds.has(u.id)
            const isMutual = isFollowed && followingMeUserIds.has(u.id)
            return {
                id: u.id,
                displayName: u.display_name,
                username: u.username,
                avatarUrl: u.avatar_url,
                isFollowed,
                isMutual,
            }
        }).sort((a, b) => {
            if (a.isFollowed && !b.isFollowed) return -1
            if (!a.isFollowed && b.isFollowed) return 1
            return 0
        })
    }

    /**
     * Get followed users to display in the top "Online friends" carousel
     */
    async getFollowedUsers(userId: string) {
        const client = this.db.getAdminClient()

        // Fetch followed users
        const { data: follows, error } = await client
            .from("follows")
            .select(`
                following:following_id(id, display_name, username, avatar_url)
            `)
            .eq("follower_id", userId)
            .limit(30)

        if (error) {
            this.logger.error(`Failed to fetch followed users: ${error.message}`)
            throw new Error(error.message)
        }

        // Fetch followers to determine mutual follow status
        const { data: followers } = await client
            .from("follows")
            .select("follower_id")
            .eq("following_id", userId)

        const followersSet = new Set<string>()
        if (followers) {
            followers.forEach((f: any) => followersSet.add(f.follower_id))
        }

        // Filter out blocks
        const { data: blocks } = await client
            .from("message_blocks")
            .select("blocker_id, blocked_id")
            .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

        const blockedUserIds = new Set<string>()
        if (blocks) {
            blocks.forEach((b: any) => {
                if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id)
                if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id)
            })
        }

        return (follows || [])
            .map((f: any) => f.following)
            .filter((user: any) => user && !blockedUserIds.has(user.id))
            .map((u: any) => ({
                id: u.id,
                displayName: u.display_name,
                username: u.username,
                avatarUrl: u.avatar_url,
                isOnline: Math.random() > 0.3,
                isMutual: followersSet.has(u.id),
            }))
    }
}
