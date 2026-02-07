/**
 * Request ID Middleware
 * OWASP: Request tracking for audit and debugging
 */

import { Injectable, NestMiddleware } from "@nestjs/common"
import { Request, Response, NextFunction } from "express"
import { v4 as uuidv4 } from "uuid"

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Get existing request ID or generate new one
        const requestId = req.headers["x-request-id"]?.toString() || uuidv4()

            // Attach to request for use in logging
            ; (req as any).requestId = requestId

        // Add to response headers
        res.setHeader("X-Request-ID", requestId)

            // Add timestamp
            ; (req as any).requestTimestamp = Date.now()

        next()
    }
}
