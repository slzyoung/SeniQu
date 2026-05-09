import { Controller, Get } from "@nestjs/common"
import { ApiTags, ApiOperation } from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Health")
@Controller("health")
@SkipThrottle()
export class HealthController {
    @Get()
    @Public()
    @ApiOperation({ summary: "Health check endpoint" })
    check() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            service: "seniqu-backend",
            version: "1.0.0",
        }
    }

    @Get("ready")
    @Public()
    @ApiOperation({ summary: "Readiness check" })
    ready() {
        return { status: "ready" }
    }

    @Get("live")
    @Public()
    @ApiOperation({ summary: "Liveness check" })
    live() {
        return { status: "alive" }
    }
}
