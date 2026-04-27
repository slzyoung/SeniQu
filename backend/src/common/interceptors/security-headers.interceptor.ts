/**
 * Security Headers Interceptor
 * OWASP: Comprehensive security headers for all API responses
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { Response } from "express"

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const response = context.switchToHttp().getResponse<Response>()

        // Anti-Hacking: Prevent MIME type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff")
        // Anti-Hacking: Prevent clickjacking
        response.setHeader("X-Frame-Options", "DENY")
        // Anti-Hacking: XSS protection (legacy browsers)
        response.setHeader("X-XSS-Protection", "1; mode=block")
        // Anti-Hacking: Control referrer info leakage
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
        // Anti-Hacking: Restrict browser features
        response.setHeader("Permissions-Policy", "geolocation=(self), microphone=(self), camera=(self), payment=(), usb=()")
        // Anti-Hacking: Prevent cross-domain policy file loading
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none")
        // Anti-Hacking: HSTS — force HTTPS connections
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        // Anti-Chunking: Prevent caching of API responses containing sensitive data
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        response.setHeader("Pragma", "no-cache")
        response.setHeader("Expires", "0")
        // Anti-Hacking: Prevent download sniffing in IE
        response.setHeader("X-Download-Options", "noopen")

        // Remove server identification
        response.removeHeader("X-Powered-By")

        return next.handle()
    }
}
