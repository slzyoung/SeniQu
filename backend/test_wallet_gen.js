const { PrivyClient } = require('@privy-io/server-auth');
require('dotenv').config();

async function testWalletGeneration() {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
        console.error("Missing PRIVY_APP_ID or PRIVY_APP_SECRET");
        return;
    }

    const privy = new PrivyClient(appId, appSecret);
    const testEmail = `test.wallet.gen.${Date.now()}@example.com`;

    console.log(`Testing wallet generation for: ${testEmail}`);

    try {
        // 1. Create User with Embedded Wallet
        console.log("Creating user...");
        const user = await privy.importUser({
            linkedAccounts: [
                {
                    type: 'email',
                    address: testEmail,
                    verified_at: new Date().toISOString()
                }
            ],
            createEmbeddedWallet: true
        });

        console.log("User created:", user.id);

        // 2. Check Wallets
        const wallets = user.linkedAccounts.filter(a => a.type === 'wallet');
        console.log("Wallets found:", wallets.length);
        wallets.forEach(w => console.log(`- ${w.chainType || 'unknown'} (${w.walletClientType}): ${w.address}`));

        // 3. Verify 'One Wallet Per Chain' (Implicit in Privy)
        // Privy typically creates one HD wallet. Let's see if we get both addresses or just one.
        // Usually, the API returns the primary one handling the request or default.

        const solWallet = wallets.find(w => w.chainType === 'solana');
        const ethWallet = wallets.find(w => w.chainType === 'ethereum');

        if (solWallet) console.log("✅ Solana wallet exists");
        if (ethWallet) console.log("✅ Ethereum wallet exists");
        if (!solWallet && !ethWallet) console.log("❌ No wallet created!");

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testWalletGeneration();
