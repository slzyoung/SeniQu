/**
 * SQL Injection Prevention Guard
 * OWASP: Additional layer to detect SQL injection attempts
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
    Logger,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { BYPASS_SECURITY_KEY } from "../decorators/bypass-security.decorator"

@Injectable()
export class SqlInjectionGuard implements CanActivate {
    private readonly logger = new Logger(SqlInjectionGuard.name)

    constructor(private reflector: Reflector) {}

    // Common SQL injection patterns
    private readonly sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
        /(--|\#|\/\*|\*\/)/,
        /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/i,
        /('\s*(OR|AND)\s*')/i,
        /(;\s*(DROP|DELETE|UPDATE|INSERT))/i,
        /(\bEXEC\b|\bEXECUTE\b)/i,
        /(\bxp_\w+)/i,
        /(WAITFOR\s+DELAY)/i,
        /(\bBENCHMARK\s*\()/i,
        /(\bSLEEP\s*\()/i,
    ]

    canActivate(context: ExecutionContext): boolean {
        const bypassSecurity = this.reflector.getAllAndOverride<boolean>(BYPASS_SECURITY_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (bypassSecurity) {
            return true
        }

        const request = context.switchToHttp().getRequest()

        // Check query parameters
        if (this.containsSqlInjection(request.query)) {
            this.logger.warn(`SQL injection attempt detected in query params: ${JSON.stringify(request.query)}`)
            throw new BadRequestException("Invalid characters in request")
        }

        // Check URL parameters
        if (this.containsSqlInjection(request.params)) {
            this.logger.warn(`SQL injection attempt detected in URL params: ${JSON.stringify(request.params)}`)
            throw new BadRequestException("Invalid characters in request")
        }

        // Check body (for POST/PUT requests)
        if (request.body && this.containsSqlInjection(request.body)) {
            this.logger.warn(`SQL injection attempt detected in body`)
            throw new BadRequestException("Invalid characters in request")
        }

        return true
    }

    private containsSqlInjection(obj: any): boolean {
        if (!obj) return false

        const checkValue = (value: any): boolean => {
            if (typeof value === "string") {
                return this.sqlPatterns.some(pattern => pattern.test(value))
            }
            if (Array.isArray(value)) {
                return value.some(item => checkValue(item))
            }
            if (typeof value === "object") {
                return Object.values(value).some(v => checkValue(v))
            }
            return false
        }

        return checkValue(obj)
    }
}
