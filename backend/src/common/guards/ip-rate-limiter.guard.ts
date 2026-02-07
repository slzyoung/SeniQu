/**
 * IP Rate Limiter by User
 * OWASP: Enhanced rate limiting per user and IP
 */

import { Injectable, ExecutionContext } from "@nestjs/common"
import { ThrottlerGuard, ThrottlerException } from "@nestjs/throttler"
import { Request } from "express"

@Injectable()
export class IpRateLimiterGuard extends ThrottlerGuard {
    protected async getTracker(req: Request): Promise<string> {
        // Use combination of IP and user ID for rate limiting
        const ip = this.getIpAddress(req)
        const userId = (req as any).user?.id || "anonymous"

        return `${ip}-${userId}`
    }

    private getIpAddress(req: Request): string {
        // Handle various proxy scenarios
        const forwardedFor = req.headers["x-forwarded-for"]
        if (forwardedFor) {
            const ips = typeof forwardedFor === "string"
                ? forwardedFor.split(",")
                : forwardedFor
            return ips[0].trim()
        }

        const realIp = req.headers["x-real-ip"]
        if (realIp) {
            return typeof realIp === "string" ? realIp : realIp[0]
        }

        return req.ip || req.socket.remoteAddress || "unknown"
    }

    protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
        throw new ThrottlerException("Too many requests. Please try again later.")
    }
}
