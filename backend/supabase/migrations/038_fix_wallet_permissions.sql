-- ============================================================
-- FIX WALLET PERMISSIONS
-- Grants required privileges to Supabase roles
-- ============================================================

-- Grant core permissions for wallet tables to web roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wallet_connections TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wallet_sessions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wallet_nonces TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wallet_logins TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rate_limit_events TO anon, authenticated, service_role;

-- Grant usage on sequences if there were any (UUIDs don't use sequences, so this is just safe fallback)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Note: RLS policies (CREATE POLICY) were already defined in migration 010 and 018.
-- However, if grants are missing from the Postgres role, the RLS policies don't even get evaluated,
-- resulting in "permission denied for table".
