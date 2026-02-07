import { Module, Global } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { DatabaseService } from "./database.service"

/**
 * Database Module
 * Provides Supabase client as a global service
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule { }
