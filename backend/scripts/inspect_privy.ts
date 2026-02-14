
import { PrivyClient } from "@privy-io/server-auth";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    console.error('Missing env vars');
    process.exit(1);
}

const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

async function inspect() {
    console.log("Inspecting privy.walletApi...");
    const api = (privy as any).walletApi;

    if (api) {
        console.log("Methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(api)));

        // Try to list wallets if method exists
        if (api.getWallets) {
            console.log("Found getWallets!");
            try {
                const wallets = await api.getWallets();
                console.log("Wallets count:", wallets.data?.length || wallets.length);
                if (wallets.data && wallets.data.length > 0) {
                    console.log("Sample:", wallets.data[0]);
                }
            } catch (e) {
                console.log("getWallets blocked:", e.message);
            }
        } else {
            console.log("getWallets NOT found.");
        }

        // Check createWallet
        if (api.createWallet) {
            console.log("Found createWallet!");

            try {
                // Get a user to use as owner
                const users = await privy.getUsers();
                if (users.length === 0) {
                    console.log("No users found to test linking.");
                } else {
                    const userId = users[0].id;
                    console.log(`Testing createWallet with ownerId: ${userId}`);

                    // Try formatting options
                    try {
                        const w1 = await api.createWallet({ chainType: 'solana', ownerId: userId });
                        console.log("Success with ownerId!", w1);
                    } catch (e: any) {
                        console.log("Failed with ownerId:", e.message);
                    }

                    try {
                        const w2 = await api.createWallet({ chainType: 'solana', userId: userId });
                        console.log("Success with userId!", w2);
                    } catch (e: any) {
                        console.log("Failed with userId:", e.message);
                    }
                }

            } catch (e: any) {
                console.log("User fetch failed:", e.message);
            }
        }
    } else {
        console.log("walletApi is undefined on PrivyClient instance.");
    }
}

inspect();
