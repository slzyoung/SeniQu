
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3001/api/v1/auth';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
    const timestamp = Date.now();
    const email = `test_user_${timestamp}@example.com`;
    const password = 'Password123!';

    console.log(`\n--- STARTING TEST: Email Registration & Wallet Verification ---`);
    console.log(`Target Email: ${email}`);

    // 1. REGISTER
    console.log(`\n1. Registering user...`);
    try {
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, userType: 'ART_LOVER' }),
        });

        if (!regRes.ok) {
            const err = await regRes.text();
            throw new Error(`Registration failed: ${regRes.status} ${err}`);
        }

        const regData = await regRes.json();
        console.log('Registration Response:', JSON.stringify(regData, null, 2));

        if (!regData.data || !regData.data.user) {
            throw new Error('Registration response missing user object in data');
        }
        const userId = regData.data.user.id;
        console.log(`   Success! User ID: ${userId}`);

        // 2. VERIFY WALLETS (After Register)
        console.log(`\n2. Verifying wallets in DB (privy_wallets)...`);
        // Wait a small bit for async provisioning if any (though it should be awaited in controller)
        await new Promise(r => setTimeout(r, 2000));

        const { data: wallets, error: walletError } = await supabase
            .from('privy_wallets')
            .select('*')
            .eq('user_id', userId);

        if (walletError) throw walletError;

        console.log(`   Found ${wallets?.length} wallets.`);

        const solana = wallets?.find(w => w.chain_type === 'solana');
        const ethereum = wallets?.find(w => w.chain_type === 'ethereum');

        if (solana) console.log(`   - Solana: ${solana.wallet_address}`);
        else console.error(`   - ❌ MISSING SOLANA WALLET`);

        if (ethereum) console.log(`   - Ethereum: ${ethereum.wallet_address}`);
        else console.error(`   - ❌ MISSING ETHEREUM WALLET`);

        if (!solana || !ethereum) {
            console.error(`   ❌ FAIL: Did not provision both wallets on register.`);
        } else {
            console.log(`   ✅ PASS: Both wallets provisioned on register.`);
        }

        // 3. VERIFY NO EXTERNAL LOGINS
        console.log(`\n3. Verifying no external logins (wallet_logins)...`);
        const { data: logins, error: loginError } = await supabase
            .from('wallet_logins')
            .select('*')
            .eq('user_id', userId);

        if (loginError) throw loginError;

        if (logins && logins.length > 0) {
            console.error(`   ❌ FAIL: Found unexpected entries in wallet_logins:`, logins);
        } else {
            console.log(`   ✅ PASS: wallet_logins is empty as expected for email user.`);
        }

        // 4. LOGIN (Simulate re-login)
        console.log(`\n4. Logging in (simulating re-login)...`);
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} ${err}`);
        }
        console.log(`   Login successful.`);

        // 5. VERIFY WALLETS AGAIN (Check for duplicates)
        console.log(`\n5. Verifying wallets again (checking for duplicates)...`);
        await new Promise(r => setTimeout(r, 2000));

        const { data: wallets2, error: walletError2 } = await supabase
            .from('privy_wallets')
            .select('*')
            .eq('user_id', userId);

        if (walletError2) throw walletError2;

        console.log(`   Found ${wallets2?.length} wallets.`);
        if (wallets2?.length === 2 && solana && ethereum) {
            console.log(`   ✅ PASS: wallet count remains 2 (Unique constraint working).`);
        } else {
            console.error(`   ❌ FAIL: Wallet count is ${wallets2?.length} (Expected 2).`);
            console.log(wallets2);
        }

    } catch (error: any) {
        console.error(`\n❌ TEST FAILED: ${error.message}`);
        process.exit(1);
    }
}

runTest();
