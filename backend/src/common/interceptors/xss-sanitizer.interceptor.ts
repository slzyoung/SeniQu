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

@Injectable()
export class XssSanitizerInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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
                if (obj.hasOwnProperty(key)) {
                    sanitized[this.sanitizeString(key)] = this.sanitizeObject(obj[key])
                }
            }
            return sanitized
        }

        return obj
    }

    private sanitizeString(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;")
            .replace(/`/g, "&#x60;")
            .replace(/=/g, "&#x3D;")
    }
}
