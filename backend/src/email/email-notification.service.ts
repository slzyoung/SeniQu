import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DatabaseService } from "../database/database.service"
import { EmailService } from "./email.service"

interface EmailTemplateOptions {
    title: string
    preheader: string
    greeting: string
    body: string
    buttonText: string
    buttonUrl: string
}

@Injectable()
export class EmailNotificationService {
    private readonly logger = new Logger(EmailNotificationService.name)

    // In-memory throttle map to prevent spamming: key -> timestamp
    private readonly throttleMap = new Map<string, number>()

    constructor(
        private readonly db: DatabaseService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Send email notification when a new message/chat is sent
     */
    async sendChatNotification(senderId: string, recipientId: string) {
        const throttleKey = `chat:${senderId}:${recipientId}`
        const fifteenMinutes = 15 * 60 * 1000

        if (this.isThrottled(throttleKey, fifteenMinutes)) {
            return
        }

        try {
            const client = this.db.getAdminClient()
            
            // Fetch sender and recipient details
            const [senderRes, recipientRes] = await Promise.all([
                client.from("users").select("display_name, username").eq("id", senderId).single(),
                client.from("users").select("email, display_name, notification_prefs").eq("id", recipientId).single()
            ])

            if (senderRes.error || recipientRes.error || !recipientRes.data?.email) {
                return
            }

            const sender = senderRes.data
            const recipient = recipientRes.data

            // Check notification preference
            const emailPref = recipient.notification_prefs?.email_messages !== false // default true
            if (!emailPref) {
                return
            }

            const senderName = sender.display_name || sender.username || "Seseorang"
            const subject = `💬 Pesan Baru dari ${senderName} di SeniQu`
            const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"

            const html = this.buildTemplate({
                title: "Pesan Baru Diterima",
                preheader: `Anda menerima pesan baru dari ${senderName}.`,
                greeting: `Halo ${recipient.display_name || "Pengguna SeniQu"},`,
                body: `<strong>${senderName}</strong> mengirimkan pesan baru untuk Anda. Silakan klik tombol di bawah untuk membaca dan membalas pesan.`,
                buttonText: "Buka Pesan",
                buttonUrl: `${frontendUrl}/messages`
            })

            await this.emailService.sendMail(recipient.email, subject, html)
            this.throttleMap.set(throttleKey, Date.now())
        } catch (err: any) {
            this.logger.error(`Error sending chat notification email: ${err.message}`)
        }
    }

    /**
     * Send email notification when a user follows another user
     */
    async sendFollowNotification(followerId: string, followedId: string) {
        const throttleKey = `follow:${followerId}:${followedId}`
        const oneHour = 60 * 60 * 1000

        if (this.isThrottled(throttleKey, oneHour)) {
            return
        }

        try {
            const client = this.db.getAdminClient()
            
            const [followerRes, followedRes] = await Promise.all([
                client.from("users").select("display_name, username").eq("id", followerId).single(),
                client.from("users").select("email, display_name, notification_prefs").eq("id", followedId).single()
            ])

            if (followerRes.error || followedRes.error || !followedRes.data?.email) {
                return
            }

            const follower = followerRes.data
            const followed = followedRes.data

            const emailPref = followed.notification_prefs?.email_follows !== false // default true
            if (!emailPref) {
                return
            }

            const followerName = follower.display_name || follower.username || "Seseorang"
            const subject = `👤 ${followerName} Mulai Mengikuti Anda di SeniQu`
            const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"

            const html = this.buildTemplate({
                title: "Pengikut Baru",
                preheader: `${followerName} sekarang mengikuti Anda.`,
                greeting: `Halo ${followed.display_name || "Pengguna SeniQu"},`,
                body: `<strong>${followerName}</strong> sekarang mengikuti Anda di SeniQu. Temukan karya seni, postingan, dan koleksi terbaru mereka.`,
                buttonText: "Lihat Profil",
                buttonUrl: `${frontendUrl}/profile/${follower.username || followerId}`
            })

            await this.emailService.sendMail(followed.email, subject, html)
            this.throttleMap.set(throttleKey, Date.now())
        } catch (err: any) {
            this.logger.error(`Error sending follow notification email: ${err.message}`)
        }
    }

    /**
     * Send email notification when someone likes user's content
     */
    async sendLikeNotification(
        likerId: string, 
        recipientId: string, 
        contentType: "artwork" | "thread" | "post" | "reel", 
        contentId: string, 
        contentTitle: string
    ) {
        if (likerId === recipientId) return

        const throttleKey = `like:${likerId}:${recipientId}:${contentType}:${contentId}`
        const thirtyMinutes = 30 * 60 * 1000

        if (this.isThrottled(throttleKey, thirtyMinutes)) {
            return
        }

        try {
            const client = this.db.getAdminClient()
            
            const [likerRes, recipientRes] = await Promise.all([
                client.from("users").select("display_name, username").eq("id", likerId).single(),
                client.from("users").select("email, display_name, notification_prefs").eq("id", recipientId).single()
            ])

            if (likerRes.error || recipientRes.error || !recipientRes.data?.email) {
                return
            }

            const liker = likerRes.data
            const recipient = recipientRes.data

            const emailPref = recipient.notification_prefs?.email_likes !== false // default true
            if (!emailPref) {
                return
            }

            const likerName = liker.display_name || liker.username || "Seseorang"
            const typeLabel = this.getTypeLabel(contentType)
            const subject = `❤️ ${likerName} menyukai ${typeLabel} Anda di SeniQu`
            const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"

            let buttonUrl = `${frontendUrl}/`
            if (contentType === "artwork") buttonUrl = `${frontendUrl}/marketplace/artwork/${contentId}`
            else if (contentType === "thread" || contentType === "post") buttonUrl = `${frontendUrl}/forum/thread/${contentId}`
            else if (contentType === "reel") buttonUrl = `${frontendUrl}/reels`

            const html = this.buildTemplate({
                title: "Sukai Baru Diterima",
                preheader: `${likerName} menyukai ${typeLabel} Anda: "${contentTitle}"`,
                greeting: `Halo ${recipient.display_name || "Pengguna SeniQu"},`,
                body: `<strong>${likerName}</strong> menyukai ${typeLabel} Anda: <strong>"${contentTitle}"</strong>.`,
                buttonText: `Buka ${typeLabel}`,
                buttonUrl
            })

            await this.emailService.sendMail(recipient.email, subject, html)
            this.throttleMap.set(throttleKey, Date.now())
        } catch (err: any) {
            this.logger.error(`Error sending like notification email: ${err.message}`)
        }
    }

    /**
     * Send email notification when someone comments on user's content
     */
    async sendCommentNotification(
        commenterId: string, 
        recipientId: string, 
        contentType: "artwork" | "thread" | "post" | "reel", 
        contentId: string, 
        contentTitle: string,
        commentSnippet: string
    ) {
        if (commenterId === recipientId) return

        const throttleKey = `comment:${commenterId}:${recipientId}:${contentType}:${contentId}`
        const fiveMinutes = 5 * 60 * 1000

        if (this.isThrottled(throttleKey, fiveMinutes)) {
            return
        }

        try {
            const client = this.db.getAdminClient()
            
            const [commenterRes, recipientRes] = await Promise.all([
                client.from("users").select("display_name, username").eq("id", commenterId).single(),
                client.from("users").select("email, display_name, notification_prefs").eq("id", recipientId).single()
            ])

            if (commenterRes.error || recipientRes.error || !recipientRes.data?.email) {
                return
            }

            const commenter = commenterRes.data
            const recipient = recipientRes.data

            const emailPref = recipient.notification_prefs?.email_comments !== false // default true
            if (!emailPref) {
                return
            }

            const commenterName = commenter.display_name || commenter.username || "Seseorang"
            const typeLabel = this.getTypeLabel(contentType)
            const subject = `💬 ${commenterName} mengomentari ${typeLabel} Anda di SeniQu`
            const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"

            let buttonUrl = `${frontendUrl}/`
            if (contentType === "artwork") buttonUrl = `${frontendUrl}/marketplace/artwork/${contentId}`
            else if (contentType === "thread" || contentType === "post") buttonUrl = `${frontendUrl}/forum/thread/${contentId}`
            else if (contentType === "reel") buttonUrl = `${frontendUrl}/reels`

            const cleanSnippet = commentSnippet.length > 80 ? commentSnippet.substring(0, 80) + "..." : commentSnippet

            const html = this.buildTemplate({
                title: "Komentar Baru Diterima",
                preheader: `${commenterName} mengomentari ${typeLabel} Anda: "${contentTitle}"`,
                greeting: `Halo ${recipient.display_name || "Pengguna SeniQu"},`,
                body: `<strong>${commenterName}</strong> memberikan komentar pada ${typeLabel} Anda: <strong>"${contentTitle}"</strong>.<br><br>
                <div style="background:rgba(255,255,255,0.05); border-left: 3px solid #daa520; padding:12px 16px; margin: 16px 0; border-radius:4px; font-style:italic; color:#d0d0d0;">
                    "${cleanSnippet}"
                </div>`,
                buttonText: `Balas Komentar`,
                buttonUrl
            })

            await this.emailService.sendMail(recipient.email, subject, html)
            this.throttleMap.set(throttleKey, Date.now())
        } catch (err: any) {
            this.logger.error(`Error sending comment notification email: ${err.message}`)
        }
    }

    // ===========================================
    // HELPERS & TEMPLATES
    // ===========================================

    private isThrottled(key: string, durationMs: number): boolean {
        const lastSent = this.throttleMap.get(key)
        if (lastSent && Date.now() - lastSent < durationMs) {
            this.logger.log(`📧 Throttled notification for key: ${key}`)
            return true
        }
        return false
    }

    private getTypeLabel(type: "artwork" | "thread" | "post" | "reel"): string {
        switch (type) {
            case "artwork": return "karya seni"
            case "thread": return "utas forum"
            case "post": return "postingan forum"
            case "reel": return "reels"
            default: return "konten"
        }
    }

    private buildTemplate(options: EmailTemplateOptions): string {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(255,215,0,0.15);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#b8860b,#daa520);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#000;font-size:28px;font-weight:700;letter-spacing:1px;">SeniQu</h1>
      <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:13px;letter-spacing:2px;">INDONESIAN ART HERITAGE</p>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">${options.title}</h2>
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        ${options.greeting}
      </p>
      <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
        ${options.body}
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${options.buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#daa520);color:#000;font-weight:700;font-size:16px;padding:14px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
          ${options.buttonText}
        </a>
      </div>
      <p style="color:#666;font-size:12px;line-height:1.5;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
        Anda menerima email ini karena Anda mengaktifkan notifikasi di akun SeniQu Anda. Anda dapat mengubah pengaturan notifikasi kapan saja di Profil > Pengaturan Akun.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">© ${new Date().getFullYear()} SeniQu — Preserving Heritage Through Technology</p>
    </div>
  </div>
</body>
</html>`
    }
}
