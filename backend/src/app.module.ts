import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler"
import { APP_GUARD } from "@nestjs/core"
import { configuration, validationSchema } from "./config/configuration"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"

// Core Modules
import { DatabaseModule } from "./database/database.module"
import { HealthModule } from "./health/health.module"
import { AuditModule } from "./audit/audit.module"

// Feature Modules
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"
import { ArtworksModule } from "./artworks/artworks.module"
import { NftsModule } from "./nfts/nfts.module"
import { CollectionsModule } from "./collections/collections.module"
import { GovernanceModule } from "./governance/governance.module"
import { AdminModule } from "./admin/admin.module"
import { MuseumsModule } from "./museums/museums.module"
import { BookmarksModule } from "./bookmarks/bookmarks.module"
import { ForumModule } from "./forum/forum.module"
import { SearchModule } from "./search/search.module"
import { AnalyticsModule } from "./analytics/analytics.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { ArtistModule } from "./artist/artist.module"

@Module({
    imports: [
        // ===========================================
        // CONFIGURATION
        // ===========================================
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            validationSchema,
            envFilePath: [".env.local", ".env"],
        }),

        // ===========================================
        // RATE LIMITING (OWASP - Anti-Throttling)
        // ===========================================
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        name: "short",
                        ttl: 1000, // 1 second
                        limit: 10, // 10 requests per second
                    },
                    {
                        name: "medium",
                        ttl: 10000, // 10 seconds
                        limit: 50, // 50 requests per 10 seconds
                    },
                    {
                        name: "long",
                        ttl: 60000, // 1 minute
                        limit: 100, // 100 requests per minute
                    },
                ],
            }),
        }),

        // ===========================================
        // CORE MODULES
        // ===========================================
        DatabaseModule,
        HealthModule,
        AuditModule, // Global security audit logging

        // ===========================================
        // FEATURE MODULES
        // ===========================================
        AuthModule,
        UsersModule,
        ArtworksModule,
        NftsModule,
        CollectionsModule,
        GovernanceModule,
        AdminModule,

        // ===========================================
        // NEW MODULES
        // ===========================================
        MuseumsModule,
        BookmarksModule,
        ForumModule,
        SearchModule,
        AnalyticsModule,
        NotificationsModule,
        ArtistModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Global rate limiting guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
