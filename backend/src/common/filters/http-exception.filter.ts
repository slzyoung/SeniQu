import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common"
import { Request, Response } from "express"

/**
 * Global HTTP Exception Filter
 * Standardizes error responses across the API
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name)

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()

        let status: number
        let message: string | object
        let error: string

        if (exception instanceof HttpException) {
            status = exception.getStatus()
            const exceptionResponse = exception.getResponse()

            if (typeof exceptionResponse === "object") {
                message = (exceptionResponse as any).message || exception.message
                error = (exceptionResponse as any).error || "Error"
            } else {
                message = exceptionResponse
                error = "Error"
            }
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR
            message = exception.message
            error = "Internal Server Error"

            // Log full error for internal errors
            this.logger.error(
                `Internal Error: ${exception.message}`,
                exception.stack,
            )
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR
            message = "An unexpected error occurred"
            error = "Internal Server Error"
        }

        const errorResponse = {
            success: false,
            statusCode: status,
            error,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            requestId: request.headers["x-request-id"] || null,
        }

        // Log error (except 404s to reduce noise)
        if (status !== HttpStatus.NOT_FOUND) {
            this.logger.warn(
                `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(message)}`,
            )
        }

        response.status(status).send(errorResponse)
    }
}
