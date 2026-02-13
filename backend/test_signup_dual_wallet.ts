import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/auth/auth.service';
import { UsersService } from './src/users/users.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('DualWalletTest');
    const appContext = await NestFactory.createApplicationContext(AppModule);

    // Silence general logs to focus on our test output
    // appContext.useLogger(['error', 'warn', 'log']); 

    try {
        const authService = appContext.get(AuthService);
        const usersService = appContext.get(UsersService);

        const email = `test-dual-${Date.now()}@example.com`;
        const password = 'Password@123';
        const displayName = 'Test Dual Wallet';
        const username = `user_${Date.now()}`;

        logger.log(`Starting Signup Test for email: ${email}`);

        // 1. Register User
        const result = await authService.register({
            email,
            password,
            displayName,
            username
        });

        logger.log(`User created. ID: ${result.user.id}`);

        // 2. Wait a moment for async provisioning (though ensureEmbeddedWallet is awaited in register)
        // ensureEmbeddedWallet runs sequentially, so it should be done.

        // 3. Verify Wallets in DB via UsersService helper or Repo
        // We'll use syncWallets to fetch the latest state from DB (and it returns the result too?)
        // Actually syncWallets updates DB. Let's just find the user using UsersService which likely has relations (or fetch manually)

        // Let's us a raw query if possible, or just checking the user object if it includes relations
        // UsersService.findById likely includes relations 'privyWallets' if configured, but maybe not by default.
        // Let's use the 'syncWallets' method again to see what it reports, OR simpler:
        // We can just query the database via Supabase client if available, OR relying on UsersService.findById results if we add the relation.

        // Checking users.service.ts, 'findById' usually returns 'wallets' array if mapped.
        // But 'privy_wallets' is the new table. 'findById' might not load it yet unless updated.
        // Let's check 'syncWallets' return value. It returns { success: true, synced: [...] } 

        const syncResult = await usersService.syncWallets(result.user.id);
        logger.log(`Sync Result: ${JSON.stringify(syncResult)}`);

        // Check the synced array for 'embedded-solana' and 'embedded-ethereum'
        const syncedItems = (syncResult.synced || []) as string[];
        const hasSolana = syncedItems.some((s: string) => s.includes('solana'));
        const hasEthereum = syncedItems.some((s: string) => s.includes('ethereum'));

        if (hasSolana && hasEthereum) {
            logger.log('✅ TEST PASSED: Both Solana and Ethereum wallets created and synced.');
        } else {
            logger.error(`❌ TEST FAILED: Missing wallets. Synced: ${JSON.stringify(syncedItems)}`);
            // Additional diagnostics
            logger.error(`Missing Solana: ${!hasSolana}`);
            logger.error(`Missing Ethereum: ${!hasEthereum}`);
        }

    } catch (error) {
        logger.error('Test Failed with Error:', error);
    } finally {
        await appContext.close();
    }
}

bootstrap();
