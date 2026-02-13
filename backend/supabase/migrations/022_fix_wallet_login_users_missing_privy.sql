-- ============================================================
-- 022: Fix wallet-login users missing Privy embedded wallets
-- ============================================================
-- Problem: Users who signed up via external wallet login (Phantom, MetaMask, etc.)
-- did not get Privy embedded wallets provisioned. The authenticateWithWallet() method
-- was skipping ensureEmbeddedWallet(). This has been fixed in the backend code,
-- but existing users need to be identified and fixed.
--
-- This migration:
-- 1. Identifies wallet-login users missing privy_id (no embedded wallets)
-- 2. Creates a view for easy monitoring
-- 3. The actual Privy provisioning must happen through the backend API
--    (cannot be done in SQL since Privy is an external service)
-- ============================================================

-- 1. Diagnostic: Find wallet-login users without privy_id
-- These users need embedded wallet provisioning via the backend
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM users u
    INNER JOIN wallet_logins wl ON wl.user_id = u.id
    WHERE u.privy_id IS NULL;

    RAISE NOTICE 'Found % wallet-login user(s) without privy_id (missing embedded wallets)', affected_count;
END $$;

-- 2. Create a view for monitoring users missing embedded wallets
CREATE OR REPLACE VIEW v_users_missing_embedded_wallets AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.privy_id,
    u.created_at,
    wl.wallet_address AS login_wallet_address,
    wl.chain_type AS login_chain_type,
    wl.provider_name,
    CASE
        WHEN u.privy_id IS NULL THEN 'missing_privy_id'
        WHEN NOT EXISTS (
            SELECT 1 FROM privy_wallets pw
            WHERE pw.user_id = u.id AND pw.chain_type = 'solana'
        ) THEN 'missing_solana_wallet'
        WHEN NOT EXISTS (
            SELECT 1 FROM privy_wallets pw
            WHERE pw.user_id = u.id AND pw.chain_type = 'ethereum'
        ) THEN 'missing_ethereum_wallet'
        ELSE 'unknown'
    END AS issue_type
FROM users u
INNER JOIN wallet_logins wl ON wl.user_id = u.id
WHERE
    u.privy_id IS NULL
    OR NOT EXISTS (
        SELECT 1 FROM privy_wallets pw
        WHERE pw.user_id = u.id AND pw.chain_type = 'solana'
    )
    OR NOT EXISTS (
        SELECT 1 FROM privy_wallets pw
        WHERE pw.user_id = u.id AND pw.chain_type = 'ethereum'
    );

-- 3. Log the affected users for reference
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '--- Users needing embedded wallet provisioning ---';
    FOR rec IN
        SELECT * FROM v_users_missing_embedded_wallets
    LOOP
        RAISE NOTICE 'User: % (%) - Login wallet: % (%) - Issue: %',
            rec.user_id, rec.username, rec.login_wallet_address,
            rec.login_chain_type, rec.issue_type;
    END LOOP;
    RAISE NOTICE '--- End of report ---';
END $$;
