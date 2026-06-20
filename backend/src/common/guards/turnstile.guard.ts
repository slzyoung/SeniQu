/**
 * Cloudflare Turnstile Verification Guard
 * 
 * Validates Turnstile CAPTCHA tokens on protected endpoints (e.g., register, forgot-password).
 * Uses the Cloudflare Turnstile siteverify API to confirm the token is valid.
 * 
 * In development mode, the guard is lenient (warns but allows) if no secret key is configured.
 * In production, missing tokens or invalid tokens will be rejected.
 * 
 * Usage: Apply @UseTurnstile() decorator on controller methods.
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
    Logger,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Reflector } from "@nestjs/core"

export const TURNSTILE_KEY = "requireTurnstile"

/**
 * Decorator to mark an endpoint as requiring Turnstile verification
 */
import { SetMetadata } from "@nestjs/common"
export const UseTurnstile = () => SetMetadata(TURNSTILE_KEY, true)

interface TurnstileVerifyResponse {
    success: boolean
    "error-codes"?: string[]
    challenge_ts?: string
    hostname?: string
    action?: string
    cdata?: string
}

@Injectable()
export class TurnstileGuard implements CanActivate {
    private readonly logger = new Logger(TurnstileGuard.name)

    constructor(
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if this endpoint requires Turnstile verification
        const requiresTurnstile = this.reflector.getAllAndOverride<boolean>(TURNSTILE_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (!requiresTurnstile) {
            return true
        }

        const secretKey = this.configService.get<string>("security.turnstileSecretKey")
        const isDev = this.configService.get("NODE_ENV") !== "production"

        // In development without a secret key, allow requests with a warning
        if (!secretKey) {
            if (isDev) {
                this.logger.warn("Turnstile secret key not configured — skipping verification (dev mode)")
                return true
            }
            this.logger.error("TURNSTILE_SECRET_KEY not configured in production!")
            throw new BadRequestException("Security verification not configured")
        }

        const request = context.switchToHttp().getRequest()
        const turnstileToken = request.body?.turnstileToken

        if (!turnstileToken) {
            this.logger.warn(`Turnstile token missing from ${request.ip} — possible bot request`)
            throw new BadRequestException("Security verification required. Please complete the CAPTCHA challenge.")
        }

        // Verify token with Cloudflare
        try {
            const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    secret: secretKey,
                    response: turnstileToken,
                    remoteip: request.ip,
                }),
            })

            const result: TurnstileVerifyResponse = await verifyResponse.json()

            if (!result.success) {
                this.logger.warn(
                    `Turnstile verification failed from ${request.ip}: ${JSON.stringify(result["error-codes"])}`,
                )
                throw new BadRequestException("Security verification failed. Please try again.")
            }

            this.logger.debug(`Turnstile verified for ${request.ip} (hostname: ${result.hostname})`)
            return true
        } catch (error) {
            if (error instanceof BadRequestException) throw error

            this.logger.error(`Turnstile verification error: ${(error as any).message}`)
            
            // In development, allow on API errors
            if (isDev) {
                this.logger.warn("Turnstile API error in dev mode — allowing request")
                return true
            }
            
            throw new BadRequestException("Security verification service unavailable. Please try again later.")
        }
    }
}
