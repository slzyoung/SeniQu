import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T> {
    success: boolean
    data: T
    meta?: {
        timestamp: string
        path: string
        method: string
        requestId?: string
    }
}

/**
 * Transform Interceptor
 * Wraps all successful responses in a standard format.
 *
 * IMPORTANT: Skips transformation for:
 * - Redirect responses (3xx status codes) — e.g., OAuth callbacks
 * - Handlers that use @Res() decorator (return undefined/null)
 */
@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T> | T> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T> | T> {
        const request = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse()

        return next.handle().pipe(
            map((data) => {
                // Skip transformation for redirect responses (OAuth callback)
                const statusCode = response.statusCode || response.raw?.statusCode
                if (statusCode >= 300 && statusCode < 400) {
                    return data
                }

                // Skip transformation if handler used @Res() (data is undefined)
                // This happens when the controller manually manages the response
                if (data === undefined || data === null) {
                    return data
                }

                return {
                    success: true,
                    data,
                    meta: {
                        timestamp: new Date().toISOString(),
                        path: request.url,
                        method: request.method,
                        requestId: request.headers["x-request-id"],
                    },
                }
            }),
        )
    }
}
