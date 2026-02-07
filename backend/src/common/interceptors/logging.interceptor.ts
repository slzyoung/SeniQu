import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { tap } from "rxjs/operators"

/**
 * Logging Interceptor
 * Logs all incoming requests and their response times
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger("HTTP")

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { method, url, ip, headers } = request
        const userAgent = headers["user-agent"] || "Unknown"
        const requestId = headers["x-request-id"] || "N/A"

        const now = Date.now()

        this.logger.log(
            `[${requestId}] ${method} ${url} - ${ip} - ${userAgent}`,
        )

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse()
                    const { statusCode } = response
                    const duration = Date.now() - now

                    this.logger.log(
                        `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
                    )
                },
                error: (error) => {
                    const duration = Date.now() - now

                    this.logger.error(
                        `[${requestId}] ${method} ${url} - ERROR - ${duration}ms - ${error.message}`,
                    )
                },
            }),
        )
    }
}
