-- ============================================================
-- 023: Clean up external wallets incorrectly stored in privy_wallets
-- ============================================================
-- Problem: External wallet addresses used for login were being imported
-- into Privy via importUser() and then synced to privy_wallets.
-- Only Privy-generated embedded wallets should be in privy_wallets.
-- External wallets belong exclusively in wallet_logins.
--
-- This migration:
-- 1. Removes external wallet addresses from privy_wallets
-- 2. Forces re-provisioning on next login (backend will create fresh embedded wallets)
-- ============================================================

-- 1. Diagnostic: Show external wallets incorrectly in privy_wallets
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM privy_wallets pw
    INNER JOIN wallet_logins wl
        ON wl.user_id = pw.user_id
        AND LOWER(wl.wallet_address) = LOWER(pw.wallet_address);

    RAISE NOTICE 'Found % external wallet(s) incorrectly stored in privy_wallets', affected_count;
END $$;

-- 2. Delete external wallet addresses from privy_wallets
-- These are wallets that exist in BOTH privy_wallets AND wallet_logins
-- for the same user — meaning they are external login wallets, not
-- Privy-generated embedded wallets.
DELETE FROM privy_wallets pw
WHERE EXISTS (
    SELECT 1
    FROM wallet_logins wl
    WHERE wl.user_id = pw.user_id
    AND LOWER(wl.wallet_address) = LOWER(pw.wallet_address)
);

-- 3. For users who logged in via wallet but have NO remaining
-- embedded wallets, also clear their privy_id so it can be
-- re-provisioned fresh on next login (clean slate).
-- This ensures they get proper Privy-managed embedded wallets.
UPDATE users u
SET privy_id = NULL, updated_at = NOW()
WHERE u.id IN (
    -- Users who have wallet_logins but NO privy_wallets at all
    SELECT DISTINCT wl.user_id
    FROM wallet_logins wl
    WHERE NOT EXISTS (
        SELECT 1 FROM privy_wallets pw
        WHERE pw.user_id = wl.user_id
    )
)
AND u.privy_id IS NOT NULL;

-- 4. Update the monitoring view
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
        ELSE 'ok'
    END AS issue_type
FROM users u
LEFT JOIN wallet_logins wl ON wl.user_id = u.id
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

-- 5. Final diagnostic
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM v_users_missing_embedded_wallets;

    RAISE NOTICE '--- After cleanup: % user(s) need embedded wallet re-provisioning ---', remaining_count;
    RAISE NOTICE 'These will be auto-provisioned on next login via the updated backend.';
END $$;
