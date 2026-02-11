-- ============================================================
-- MIGRATION 011: COMPREHENSIVE SECURITY HARDENING
-- ============================================================

-- 1. AUTH FIX: Allow wallet-only users (nullable email)
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- 2. EXTENSION SECURITY: Move extensions to dedicated schema
-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move extensions (if they exist in public)
-- We wrap in DO block to avoid errors if they are already moved or don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pg_trgm" SET SCHEMA extensions;
    END IF;
    
    -- PostGIS often does not support SET SCHEMA, so we leave it in public
    -- IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    --    ALTER EXTENSION "postgis" SET SCHEMA extensions;
    -- END IF;
END $$;

-- Update database search path to include extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 3. VIEW SECURITY: Enforce Security Invoker
-- This ensures views utilize the permissions of the caller (respecting RLS)
ALTER VIEW public.admin_dashboard_stats SET (security_invoker = true);
ALTER VIEW public.user_dashboard_stats SET (security_invoker = true);
ALTER VIEW public.artist_performance_stats SET (security_invoker = true);

-- 4. FUNCTION SECURITY: Fix Mutable Search Paths
-- PostGIS functions need access to 'extensions' schema
ALTER FUNCTION public.find_nearby_institutions SET search_path = public, extensions;

-- Standard functions need locked search path
ALTER FUNCTION public.update_collection_artwork_count SET search_path = public;
ALTER FUNCTION public.increment_category_threads SET search_path = public;
ALTER FUNCTION public.update_artwork_likes_count SET search_path = public;
ALTER FUNCTION public.increment_artwork_likes SET search_path = public;
ALTER FUNCTION public.cleanup_expired_wallet_sessions SET search_path = public;
ALTER FUNCTION public.get_trending_artworks SET search_path = public;
ALTER FUNCTION public.revoke_user_sessions SET search_path = public;
ALTER FUNCTION public.is_user_locked SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions SET search_path = public;
ALTER FUNCTION public.decrement_artwork_likes SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.update_genre_count SET search_path = public;
ALTER FUNCTION public.update_thread_reply_count SET search_path = public;
ALTER FUNCTION public.get_admin_dashboard_stats SET search_path = public;
ALTER FUNCTION public.cleanup_expired_nonces SET search_path = public;
ALTER FUNCTION public.increment_artwork_views SET search_path = public;
ALTER FUNCTION public.cleanup_expired_nonces SET search_path = public; -- Duplicate check
ALTER FUNCTION public.cleanup_old_rate_limits SET search_path = public;
ALTER FUNCTION public.update_updated_at SET search_path = public;
ALTER FUNCTION public.update_artist_stats SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.get_user_role SET search_path = public;
ALTER FUNCTION public.ensure_single_primary_wallet SET search_path = public;
ALTER FUNCTION public.record_login_attempt SET search_path = public;

-- 5. RLS HARDENING: Fix Permissive Policies
-- Restrict service-only tables to service role
DROP POLICY IF EXISTS wallet_nonce_service_all ON public.wallet_nonces;
CREATE POLICY wallet_nonce_service_only ON public.wallet_nonces FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS rate_limit_service_only ON public.rate_limit_events;
CREATE POLICY rate_limit_service_only ON public.rate_limit_events FOR ALL USING (auth.role() = 'service_role');

-- 6. RLS: Add Policies for "No Policy" Tables

-- A. Basic Public Read / Owner Write Tables
-- User Social Links
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read social links" ON public.user_social_links;
CREATE POLICY "Public read social links" ON public.user_social_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own social links" ON public.user_social_links;
CREATE POLICY "Users manage own social links" ON public.user_social_links FOR ALL USING (auth.uid() = user_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read likes" ON public.likes;
CREATE POLICY "Public read likes" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create likes" ON public.likes;
CREATE POLICY "Users create likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own likes" ON public.likes;
CREATE POLICY "Users delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Partnerships / System Alerts (Public Read, Admin Write)
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read partnerships" ON public.partnerships;
CREATE POLICY "Public read partnerships" ON public.partnerships FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage partnerships" ON public.partnerships;
CREATE POLICY "Admin manage partnerships" ON public.partnerships FOR ALL USING (is_admin());

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read system alerts" ON public.system_alerts;
CREATE POLICY "Public read system alerts" ON public.system_alerts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage system alerts" ON public.system_alerts;
CREATE POLICY "Admin manage system alerts" ON public.system_alerts FOR ALL USING (is_admin());

-- B. User Private Data Tables
-- OAuth Accounts / Sessions / Subscriptions
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own oauth" ON public.oauth_accounts;
CREATE POLICY "Users manage own oauth" ON public.oauth_accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON public.sessions;
CREATE POLICY "Users manage own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Subscriptions are managed by system/webhooks mainly, but let's allow service role or admin
DROP POLICY IF EXISTS "Service manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service manage subscriptions" ON public.subscriptions FOR ALL USING (auth.role() = 'service_role' OR is_admin());

-- C. System / Audit Tables
-- Audit Logs / System Logs (Service/Admin only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read audit logs" ON public.audit_logs;
CREATE POLICY "Admin read audit logs" ON public.audit_logs FOR SELECT USING (is_admin() OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service write audit logs" ON public.audit_logs;
CREATE POLICY "Service write audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'service_role' OR is_admin());

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin view system logs" ON public.system_logs;
CREATE POLICY "Admin view system logs" ON public.system_logs FOR SELECT USING (is_admin() OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "System log insertion" ON public.system_logs;
CREATE POLICY "System log insertion" ON public.system_logs FOR INSERT WITH CHECK (true); -- Allow app to log errors

-- Analytics Events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Analytics insert public" ON public.analytics_events;
CREATE POLICY "Analytics insert public" ON public.analytics_events FOR INSERT WITH CHECK (true); -- Public can log events (page views)
DROP POLICY IF EXISTS "Analytics admin view" ON public.analytics_events;
CREATE POLICY "Analytics admin view" ON public.analytics_events FOR SELECT USING (is_admin() OR auth.role() = 'service_role');

-- D. Complex Tables
-- Collection Artworks (Junction Table)
ALTER TABLE public.collection_artworks ENABLE ROW LEVEL SECURITY;
-- Read: If collection is public OR user owns collection
DROP POLICY IF EXISTS "View collection artworks" ON public.collection_artworks;
CREATE POLICY "View collection artworks" ON public.collection_artworks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM collections c 
        WHERE c.id = collection_artworks.collection_id 
        AND (c.is_public = true OR c.user_id = auth.uid())
    )
);
-- Write: If user owns collection
DROP POLICY IF EXISTS "Manage collection artworks" ON public.collection_artworks;
CREATE POLICY "Manage collection artworks" ON public.collection_artworks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM collections c 
        WHERE c.id = collection_artworks.collection_id 
        AND c.user_id = auth.uid()
    )
);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Users create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Users view own reports" ON public.reports;
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;
CREATE POLICY "Admins manage reports" ON public.reports FOR ALL USING (is_admin());

-- NFT Transactions
ALTER TABLE public.nft_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read nft tx" ON public.nft_transactions;
CREATE POLICY "Public read nft tx" ON public.nft_transactions FOR SELECT USING (true);

-- 7. ENABLE RLS on previously mentioned public tables (from previous turn plan)
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_curations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_stats ENABLE ROW LEVEL SECURITY;

-- Policies for these:
DROP POLICY IF EXISTS "Public read genres" ON public.genres;
CREATE POLICY "Public read genres" ON public.genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service manage genres" ON public.genres;
CREATE POLICY "Service manage genres" ON public.genres FOR ALL USING (auth.role() = 'service_role' OR is_admin());

DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own curations" ON public.ai_curations;
CREATE POLICY "Users read own curations" ON public.ai_curations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service write curations" ON public.ai_curations;
CREATE POLICY "Service write curations" ON public.ai_curations FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read artist stats" ON public.artist_stats;
CREATE POLICY "Public read artist stats" ON public.artist_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write artist stats" ON public.artist_stats;
CREATE POLICY "Service write artist stats" ON public.artist_stats FOR ALL USING (auth.role() = 'service_role');

