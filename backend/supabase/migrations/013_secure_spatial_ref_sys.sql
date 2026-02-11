-- ============================================================
-- MIGRATION 013: SECURE SYSTEM TABLES (PERMISSIONS)
-- ============================================================

-- Since we cannot enable RLS on 'spatial_ref_sys' (owned by superuser/extension),
-- we essentially "Hide" it from the public API to secure it.
-- This effectively achieves the goal of RLS (preventing unauthorized access) 
-- without needing to modify the table owner.

-- Revoke all permissions from public roles
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, public;

-- Allow only service_role (backend) and postgres (admin) to access it
GRANT SELECT ON TABLE public.spatial_ref_sys TO service_role, postgres;

-- NOTE: If the Supabase Linter still complains about "RLS Disabled", 
-- it is a False Positive because no public role can access the table anyway.
