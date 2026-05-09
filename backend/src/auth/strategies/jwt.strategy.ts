import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../../users/users.service"
import { JwtPayload } from "../dto/auth-response.dto"

/**
 * In-memory user cache for JWT validation
 * Avoids hitting the database on every authenticated request
 * TTL: 60 seconds — balances performance with data freshness
 */
interface CachedUser {
    data: any
    expiresAt: number
}

const USER_CACHE = new Map<string, CachedUser>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds
const CACHE_MAX_SIZE = 1000 // Prevent unbounded memory growth

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("auth.jwtSecret"),
        })
    }

    async validate(payload: JwtPayload) {
        const now = Date.now()

        // Check cache first
        const cached = USER_CACHE.get(payload.sub)
        if (cached && cached.expiresAt > now) {
            return cached.data
        }

        // Cache miss — query database
        const user = await this.usersService.findById(payload.sub)

        if (!user) {
            this.logger.error(`User not found for ID: ${payload.sub}`);
            throw new UnauthorizedException("User not found")
        }

        const validatedUser = {
            id: user.id,
            email: user.email,
            userType: user.userType,
            adminRole: user.adminRole,
        }

        // Store in cache
        USER_CACHE.set(payload.sub, {
            data: validatedUser,
            expiresAt: now + CACHE_TTL_MS,
        })

        // Evict oldest entries if cache exceeds max size
        if (USER_CACHE.size > CACHE_MAX_SIZE) {
            const firstKey = USER_CACHE.keys().next().value
            if (firstKey) USER_CACHE.delete(firstKey)
        }

        return validatedUser
    }
}

/**
 * Utility to invalidate a user's cache entry
 * Call this when a user's role/permissions change
 */
export function invalidateUserCache(userId: string): void {
    USER_CACHE.delete(userId)
}

/**
 * Clear the entire user cache
 * Useful for admin operations that affect many users
 */
export function clearUserCache(): void {
    USER_CACHE.clear()
}

