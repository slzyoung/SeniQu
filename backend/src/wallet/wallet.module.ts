import { Module, forwardRef } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { WalletService } from "./wallet.service"
import { WalletController } from "./wallet.controller"
import { DatabaseModule } from "../database/database.module"
import { AuthModule } from "../auth/auth.module"

/**
 * Wallet Module
 *
 * Manages wallet connections, nonce-based authentication,
 * and multi-chain wallet operations.
 *
 * Dependencies:
 * - DatabaseModule: Supabase client for wallet tables
 * - AuthModule: JWT auth for protected endpoints
 * - ConfigModule: Wallet/chain configuration
 */
@Module({
    imports: [ConfigModule, DatabaseModule, forwardRef(() => AuthModule)],
    providers: [WalletService],
    controllers: [WalletController],
    exports: [WalletService],
})
export class WalletModule { }
