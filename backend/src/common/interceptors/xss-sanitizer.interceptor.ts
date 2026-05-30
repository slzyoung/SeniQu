/**
 * XSS Sanitizer Interceptor
 * OWASP: Prevents Cross-Site Scripting attacks
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { Reflector } from "@nestjs/core"
import { BYPASS_SECURITY_KEY } from "../decorators/bypass-security.decorator"

@Injectable()
export class XssSanitizerInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector) { }
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const bypassSecurity = this.reflector.getAllAndOverride<boolean>(BYPASS_SECURITY_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (bypassSecurity) {
            return next.handle()
        }

        const request = context.switchToHttp().getRequest()

        // Sanitize request body
        if (request.body) {
            request.body = this.sanitizeObject(request.body)
        }

        // Sanitize query params
        if (request.query) {
            request.query = this.sanitizeObject(request.query)
        }

        // Sanitize URL params
        if (request.params) {
            request.params = this.sanitizeObject(request.params)
        }

        return next.handle().pipe(
            map((data) => {
                // Optionally sanitize response data
                return data
            }),
        )
    }

    private sanitizeObject(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj
        }

        if (typeof obj === "string") {
            return this.sanitizeString(obj)
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item))
        }

        if (typeof obj === "object") {
            const sanitized: any = {}
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    sanitized[this.sanitizeString(key)] = this.sanitizeObject(obj[key])
                }
            }
            return sanitized
        }

        return obj
    }

    private sanitizeString(str: string): string {
        // STEP 1: Decode any pre-existing HTML entities to prevent double-encoding.
        // This prevents the &amp;amp;amp; chain corruption bug.
        let decoded = str
        // First, collapse malformed amp chains without semicolons (e.g. &ampampamp → &)
        decoded = decoded.replace(/&(amp)+/g, "&")
        // Then decode standard entities iteratively
        let prev = ""
        for (let i = 0; i < 10 && decoded !== prev; i++) {
            prev = decoded
            decoded = decoded
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .replace(/&#x60;/g, "`")
                .replace(/&#039;/g, "'")
        }

        // STEP 2: Now encode actual XSS attack vectors on the clean text.
        // Preserve URL-safe characters: / = : . @ ? & #
        return decoded
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/`/g, "&#x60;")
            .replace(/javascript:/gi, "")
            .replace(/on\w+\s*=/gi, "")
    }
}
