import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../../users/users.service"
import { JwtPayload } from "../dto/auth-response.dto"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
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
        const user = await this.usersService.findById(payload.sub)

        if (!user) {
            throw new UnauthorizedException("User not found")
        }

        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            userType: user.userType,
            adminRole: user.adminRole,
            adminLevel: user.adminLevel,
            walletAddress: user.walletAddress,
        }
    }
}
