import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../../users/users.service"
import { JwtPayload } from "../dto/auth-response.dto"

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
        this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

        const user = await this.usersService.findById(payload.sub)

        if (!user) {
            this.logger.error(`User not found for ID: ${payload.sub}`);
            throw new UnauthorizedException("User not found")
        }

        return {
            id: user.id,
            email: user.email,
            userType: user.userType,
            adminRole: user.adminRole,
        }
    }
}
