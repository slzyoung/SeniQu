
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrivyClient } from "@privy-io/server-auth";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

async function checkPersistence() {
    console.log("--- Checking Wallet Persistence Logic ---");

    // 1. Get a test user (email based)
    const { data: users } = await supabase.from('users').select('id, privy_id, email').limit(1);
    const user = users?.[0];

    if (!user) {
        console.log("No user found.");
        return;
    }
    console.log(`User: ${user.id} (${user.email}) PrivyID: ${user.privy_id}`);

    // 2. Fetch current wallet from DB
    const { data: walletBefore } = await supabase
        .from('privy_wallets')
        .select('wallet_address, chain_type, updated_at')
        .eq('user_id', user.id)
        .eq('chain_type', 'solana')
        .single();

    console.log("Wallet BEFORE:", walletBefore);

    // 3. Simulated sync logic: Fetch from Privy
    try {
        const privyUser = await privy.getUser(user.privy_id);

        // Check if wallet exists in Privy
        const linkedWallet = privyUser.linkedAccounts.find(
            (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana' && (acc.walletClientType === 'privy' || acc.connectorType === 'embedded')
        );

        console.log("Privy Linked Wallet found?", linkedWallet ? "YES" : "NO");

        if (!linkedWallet) {
            console.warn("⚠️ CRITICAL: Wallet missing in Privy! This will cause re-provisioning loops.");

            // If we have it in DB but not in Privy, syncWallets will create a NEW ONE.
            // Let's simulate provision call to see if it links (it won't).
            console.log("Simulating provision...");
            const created = await (privy.walletApi as any).create({ chainType: 'solana' });
            console.log("Provisioned NEW Wallet Address:", created.address);

            if (walletBefore && created.address !== walletBefore.wallet_address) {
                console.error("❌ FAIL: Address changed! Loop confirmed.");
            }
        } else {
            console.log("✅ Wallet IS linked in Privy. Sync is idempotent.");
            if (walletBefore && (linkedWallet as any).address === walletBefore.wallet_address) {
                console.log("✅ Address matches DB. All good.");
            } else {
                console.warn("⚠️ Address mismatch (might be old data vs new link).");
            }
        }

    } catch (e: any) {
        console.error("Privy fetch failed:", e.message);
    }
}

checkPersistence();
