import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as nodemailer from "nodemailer"

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name)
    private transporter: nodemailer.Transporter

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>("smtp.host")
        const port = this.configService.get<number>("smtp.port")
        const user = this.configService.get<string>("smtp.user")
        const pass = this.configService.get<string>("smtp.key")

        if (!host || !user || !pass) {
            this.logger.warn("SMTP not configured — emails will be logged to console only")
            return
        }

        this.transporter = nodemailer.createTransport({
            host,
            port: port || 587,
            secure: false,
            auth: { user, pass },
        })

        this.logger.log(`✅ SMTP configured via ${host}:${port}`)
    }

    /**
     * Send email verification link after registration
     */
    async sendVerificationEmail(email: string, token: string): Promise<boolean> {
        const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"
        const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(255,215,0,0.15);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#b8860b,#daa520);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#000;font-size:28px;font-weight:700;letter-spacing:1px;">SeniQu</h1>
      <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:13px;letter-spacing:2px;">INDONESIAN ART HERITAGE</p>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">Verify Your Email</h2>
      <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Welcome to SeniQu! Please verify your email address to activate your account and start exploring Indonesian art heritage.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#daa520);color:#000;font-weight:700;font-size:16px;padding:14px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
          Verify Email
        </a>
      </div>
      <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;">
        This link expires in <strong style="color:#daa520;">24 hours</strong>.<br>
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">© ${new Date().getFullYear()} SeniQu — Preserving Heritage Through Technology</p>
    </div>
  </div>
</body>
</html>`

        return this.sendMail(email, "Verify Your SeniQu Account", html)
    }

    /**
     * Send OTP code for login or password change verification
     */
    async sendOtpEmail(email: string, otp: string, context: "login" | "change-password" = "login"): Promise<boolean> {
        const isLogin = context === "login";
        const headerText = isLogin ? "SECURE LOGIN" : "SECURITY ALERT";
        const titleText = isLogin ? "Your Login Code" : "Password Change Request";
        const instructionText = isLogin 
            ? "Enter this code to complete your sign-in:" 
            : "Enter this code to authorize changing your account password:";
        const subjectText = isLogin 
            ? `${otp} — Your SeniQu Login Code`
            : `${otp} — SeniQu Password Change Verification`;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(255,215,0,0.15);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#b8860b,#daa520);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#000;font-size:28px;font-weight:700;letter-spacing:1px;">SeniQu</h1>
      <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:13px;letter-spacing:2px;">${headerText}</p>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;text-align:center;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">${titleText}</h2>
      <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
        ${instructionText}
      </p>
      <!-- OTP Code -->
      <div style="background:rgba(0,0,0,0.4);border:2px solid rgba(218,165,32,0.4);border-radius:16px;padding:24px;margin:20px auto;max-width:280px;">
        <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#daa520;font-family:'Courier New',monospace;">
          ${otp}
        </div>
      </div>
      <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;">
        This code expires in <strong style="color:#daa520;">5 minutes</strong>.<br>
        If you didn't request this, please secure your account immediately.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">© ${new Date().getFullYear()} SeniQu — Preserving Heritage Through Technology</p>
    </div>
  </div>
</body>
</html>`

        return this.sendMail(email, subjectText, html)
    }

    /**
     * Send Welcome Email to newly provisioned Admin/Artist
     */
    async sendWelcomeAdminEmail(email: string, plainPassword: string, roleName: string, institutionName: string | null): Promise<boolean> {
        const frontendUrl = this.configService.get<string>("frontendUrl") || "https://seniqu.art"
        const loginUrl = `${frontendUrl}/auth/login`

        const roleText = institutionName 
            ? `${roleName} for ${institutionName}`
            : roleName;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(255,215,0,0.15);">
    <div style="background:linear-gradient(135deg,#b8860b,#daa520);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#000;font-size:28px;font-weight:700;letter-spacing:1px;">SeniQu</h1>
      <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:13px;letter-spacing:2px;">ENTERPRISE ADMIN</p>
    </div>
    <div style="padding:40px 32px;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">Welcome to SeniQu!</h2>
      <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Your account has been officially provisioned as <strong>${roleText}</strong>. 
        <br><br>
        We have auto-generated a secure password for your initial login. You can change this later in your profile settings.
      </p>
      <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin:0 0 28px;">
        <p style="color:#fff;font-size:14px;margin:0 0 8px;"><strong>Your Login Credentials:</strong></p>
        <p style="color:#a0a0a0;font-size:14px;line-height:1.6;margin:0 0 8px;">
          Email: <strong>${email}</strong><br>
          Password: <strong style="color:#daa520;font-family:monospace;font-size:16px;">${plainPassword}</strong>
        </p>
        <p style="color:#a0a0a0;font-size:13px;line-height:1.6;margin:0;">
          <em>Note: If the system prompts for an OTP code after you enter your password, please check your inbox for the 6-digit code.</em>
        </p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#daa520);color:#000;font-weight:700;font-size:16px;padding:14px 48px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
          Log In Now
        </a>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">© ${new Date().getFullYear()} SeniQu — Preserving Heritage Through Technology</p>
    </div>
  </div>
</body>
</html>`

        return this.sendMail(email, "Welcome to SeniQu — Your Account is Ready", html)
    }

    /**
     * Core send method with fallback to console logging
     */
    private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
        const from = this.configService.get<string>("smtp.from") || "SeniQu <noreply@seniqu.com>"

        if (!this.transporter) {
            this.logger.warn(`[SMTP Not Configured] Would send to ${to}: ${subject}`)
            return true // Don't block flow in dev
        }

        try {
            const info = await this.transporter.sendMail({ from, to, subject, html })
            this.logger.log(`Email sent to ${to} (${subject}) — messageId: ${info.messageId}`)
            return true
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`)
            return false
        }
    }
}
