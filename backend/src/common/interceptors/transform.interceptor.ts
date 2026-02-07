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
 * Wraps all successful responses in a standard format
 */
@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const request = context.switchToHttp().getRequest()

        return next.handle().pipe(
            map((data) => ({
                success: true,
                data,
                meta: {
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    method: request.method,
                    requestId: request.headers["x-request-id"],
                },
            })),
        )
    }
}
