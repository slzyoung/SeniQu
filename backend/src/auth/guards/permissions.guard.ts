import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { PERMISSIONS_KEY, Permission, ROLE_PERMISSIONS } from "../decorators/permissions.decorator"

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name)

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        )

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true
        }

        const { user } = context.switchToHttp().getRequest()

        if (!user) {
            throw new ForbiddenException("User not authenticated")
        }

        const userPermissions = this.getUserPermissions(user)

        const hasAllPermissions = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        )

        if (!hasAllPermissions) {
            const missing = requiredPermissions.filter((p) => !userPermissions.includes(p))
            this.logger.warn(`Access denied for ${user.email}. Missing: ${missing.join(", ")}`)
            throw new ForbiddenException(`Missing permissions: ${missing.join(", ")}`)
        }

        return true
    }

    private getUserPermissions(user: any): Permission[] {
        const permissions: Set<Permission> = new Set()

        // Normalize admin role (handle both UPPER and lower case from DB)
        const adminRole = user.adminRole || user.adminRoleTyped
        if (adminRole) {
            const normalizedRole = adminRole.toUpperCase()
            if (normalizedRole === "SUPER_ADMIN") {
                return Object.values(Permission)
            }
            // Check both casing variants in the ROLE_PERMISSIONS map
            if (ROLE_PERMISSIONS[normalizedRole]) {
                ROLE_PERMISSIONS[normalizedRole].forEach((p) => permissions.add(p))
            }
            if (ROLE_PERMISSIONS[adminRole]) {
                ROLE_PERMISSIONS[adminRole].forEach((p) => permissions.add(p))
            }
        }

        // Fall back to user type permissions
        if (user.userType) {
            const userTypeLower = user.userType.toLowerCase()
            if (ROLE_PERMISSIONS[userTypeLower]) {
                ROLE_PERMISSIONS[userTypeLower].forEach((p) => permissions.add(p))
            }
        }

        return Array.from(permissions)
    }
}
