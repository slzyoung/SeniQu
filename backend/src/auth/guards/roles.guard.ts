import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ROLES_KEY } from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name)

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (!requiredRoles) {
            return true
        }

        const { user } = context.switchToHttp().getRequest()

        if (!user) {
            throw new ForbiddenException("User not authenticated")
        }

        // Super admin bypass
        if (user.adminRole === "super_admin") {
            return true
        }

        const hasRole = requiredRoles.some((role) => {
            return user.userType === role || user.adminRole === role
        })

        if (!hasRole) {
            this.logger.warn(
                `Access denied for ${user.email}. Required: ${requiredRoles.join(", ")}`,
            )
            throw new ForbiddenException("Insufficient privileges")
        }

        return true
    }
}
