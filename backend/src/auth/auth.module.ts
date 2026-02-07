import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"

// Services
import { AuthService } from "./auth.service"
import { PrivyService } from "./privy.service"
import { GoogleService } from "./google.service"

// Controllers
import { AuthController } from "./auth.controller"

// Strategies & Guards
import { JwtStrategy } from "./strategies/jwt.strategy"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { RolesGuard } from "./guards/roles.guard"
import { PermissionsGuard } from "./guards/permissions.guard"
import { PrivyGuard } from "./guards/privy.guard"

// Other modules
import { UsersModule } from "../users/users.module"

@Module({
    imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const jwtSecret = configService.get<string>("auth.jwtSecret")
                const jwtExpiresIn = configService.get<string>("auth.jwtExpiresIn")

                if (!jwtSecret) {
                    throw new Error("JWT_SECRET is not configured")
                }

                return {
                    secret: jwtSecret,
                    signOptions: {
                        expiresIn: jwtExpiresIn || "7d",
                    },
                }
            },
            inject: [ConfigService],
        }),
        UsersModule,
    ],
    providers: [
        AuthService,
        GoogleService,
        PrivyService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
        PrivyGuard,
    ],
    controllers: [AuthController],
    exports: [AuthService, JwtModule, PrivyService, GoogleService],
})
export class AuthModule { }
