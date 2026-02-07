/**
 * Security Headers Interceptor
 * OWASP: Additional security headers
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

        // Add security headers
        response.setHeader("X-Content-Type-Options", "nosniff")
        response.setHeader("X-Frame-Options", "DENY")
        response.setHeader("X-XSS-Protection", "1; mode=block")
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
        response.setHeader("Permissions-Policy", "geolocation=(self), microphone=()")

        // Remove server identification
        response.removeHeader("X-Powered-By")

        return next.handle()
    }
}
