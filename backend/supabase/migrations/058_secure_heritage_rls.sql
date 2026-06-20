-- Migration: 058_secure_heritage_rls.sql
-- Description: Hardens database security by removing overly permissive/insecure RLS policies on heritage_scans and heritage_curations.

-- 1. Secure heritage_scans table
-- Drop insecure policies
DROP POLICY IF EXISTS "Service role can insert scans" ON public.heritage_scans;
DROP POLICY IF EXISTS "Service role can select all scans" ON public.heritage_scans;
DROP POLICY IF EXISTS "Users can view own scans" ON public.heritage_scans;

-- Create secure SELECT policy: only authenticated users can see their own scans
CREATE POLICY "Users can view own scans" ON public.heritage_scans
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Note: Since RLS is enabled and no INSERT, UPDATE, or DELETE policies exist for public roles,
-- only the service_role (backend API with service role key) can insert scans. This is safe and secure.


-- 2. Secure heritage_curations table
-- Drop insecure policies
DROP POLICY IF EXISTS "Service role can insert curations" ON public.heritage_curations;
DROP POLICY IF EXISTS "Service role can select all curations" ON public.heritage_curations;
DROP POLICY IF EXISTS "Users can view own or public curations" ON public.heritage_curations;

-- Create secure SELECT policy: users can only view their own curations or those marked public
CREATE POLICY "Users can view own or public curations" ON public.heritage_curations
    FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

-- Note: Since RLS is enabled and no INSERT, UPDATE, or DELETE policies exist for public roles,
-- only the service_role (backend API with service role key) can insert or modify curations.
