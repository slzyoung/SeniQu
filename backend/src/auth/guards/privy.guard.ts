import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from "@nestjs/common"
import { PrivyService } from "../privy.service"

@Injectable()
export class PrivyGuard implements CanActivate {
    private readonly logger = new Logger(PrivyGuard.name)

    constructor(private readonly privyService: PrivyService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const privyToken = request.headers["x-privy-token"]

        if (!privyToken) {
            throw new UnauthorizedException("Privy token required")
        }

        try {
            const privyUser = await this.privyService.verifyToken(privyToken)

            if (!privyUser) {
                throw new UnauthorizedException("Invalid Privy token")
            }

            request.privyUser = privyUser
            return true
        } catch (error) {
            this.logger.error("Privy guard error:", error)
            throw new UnauthorizedException("Privy authentication failed")
        }
    }
}
