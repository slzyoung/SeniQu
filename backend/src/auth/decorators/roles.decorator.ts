import { SetMetadata } from "@nestjs/common"

export const ROLES_KEY = "roles"

/**
 * Require specific roles to access a route
 * Usage: @Roles("ARTIST", "COLLECTOR")
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
