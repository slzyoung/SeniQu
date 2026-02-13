-- Migration: 017_migrate_to_privy_wallets_only.sql
-- Description: Drops legacy wallet columns from the users table after 015_privy_wallets.sql has migrated data.

-- 1. Drop the legacy VIEW first (if it depended on these columns)
-- (Assuming public_users view might reference them, we recreate it without them)

DROP VIEW IF EXISTS public_users;

-- 2. Drop the columns
ALTER TABLE public.users
DROP COLUMN IF EXISTS wallet_address,
DROP COLUMN IF EXISTS embedded_wallet_address;

-- 3. Recreate the public_users view (excluding sensitive fields like email if desired, but including new logic if needed)
-- For now, we just restore the view without the dropped columns.
CREATE VIEW public_users AS
SELECT
    id,
    username,
    display_name,
    avatar,
    bio,
    role,
    created_at,
    is_verified,
    is_premium,
    social_links
FROM public.users;

-- 4. Comment to ensure we know this is done
COMMENT ON TABLE public.users IS 'Users table with wallet data moved to privy_wallets table';
