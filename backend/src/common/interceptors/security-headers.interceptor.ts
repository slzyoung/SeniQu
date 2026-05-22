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
        const response = context.switchToHttp().getResponse<any>()

        const setHeader = (res: any, name: string, value: string) => {
            if (typeof res.header === "function") {
                res.header(name, value)
            } else if (typeof res.setHeader === "function") {
                res.setHeader(name, value)
            }
        }

        const removeHeader = (res: any, name: string) => {
            if (typeof res.removeHeader === "function") {
                res.removeHeader(name)
            }
        }

        // Anti-Hacking: Prevent MIME type sniffing
        setHeader(response, "X-Content-Type-Options", "nosniff")
        // Anti-Hacking: Prevent clickjacking
        setHeader(response, "X-Frame-Options", "DENY")
        // Anti-Hacking: XSS protection (legacy browsers)
        setHeader(response, "X-XSS-Protection", "1; mode=block")
        // Anti-Hacking: Control referrer info leakage
        setHeader(response, "Referrer-Policy", "strict-origin-when-cross-origin")
        // Anti-Hacking: Restrict browser features
        setHeader(response, "Permissions-Policy", "geolocation=(self), microphone=(self), camera=(self), payment=(), usb=()")
        // Anti-Hacking: Prevent cross-domain policy file loading
        setHeader(response, "X-Permitted-Cross-Domain-Policies", "none")
        // Anti-Hacking: HSTS — force HTTPS connections
        setHeader(response, "Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        // Anti-Chunking: Prevent caching of API responses containing sensitive data
        setHeader(response, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        setHeader(response, "Pragma", "no-cache")
        setHeader(response, "Expires", "0")
        // Anti-Hacking: Prevent download sniffing in IE
        setHeader(response, "X-Download-Options", "noopen")

        // Remove server identification
        removeHeader(response, "X-Powered-By")

        return next.handle()
    }
}
