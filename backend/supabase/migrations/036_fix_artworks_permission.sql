-- ============================================================
-- FIX: permission denied for table artworks
-- Backend uses anon/authenticated Supabase client (not admin)
-- for public read queries, so we need proper table-level GRANTs
-- and permissive RLS policies.
-- ============================================================

-- STEP 1: Grant table-level SELECT to anon and authenticated roles
GRANT SELECT ON TABLE public.artworks TO anon, authenticated;
GRANT SELECT ON TABLE public.users TO anon, authenticated;
GRANT SELECT ON TABLE public.institutions TO anon, authenticated;
GRANT SELECT ON TABLE public.collections TO anon, authenticated;
GRANT SELECT ON TABLE public.collection_artworks TO anon, authenticated;
GRANT SELECT ON TABLE public.bookmarks TO authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.follows TO anon, authenticated;
GRANT SELECT ON TABLE public.likes TO anon, authenticated;
GRANT SELECT ON TABLE public.forum_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.forum_threads TO anon, authenticated;
GRANT SELECT ON TABLE public.forum_posts TO anon, authenticated;

-- STEP 2: Grant INSERT/UPDATE/DELETE for authenticated users on appropriate tables
GRANT INSERT, UPDATE, DELETE ON TABLE public.artworks TO authenticated;
GRANT UPDATE ON TABLE public.users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.collections TO authenticated;
GRANT INSERT, DELETE ON TABLE public.collection_artworks TO authenticated;
GRANT INSERT, DELETE ON TABLE public.bookmarks TO authenticated;
GRANT INSERT, DELETE ON TABLE public.follows TO authenticated;
GRANT INSERT, DELETE ON TABLE public.likes TO authenticated;
GRANT INSERT ON TABLE public.forum_threads TO authenticated;
GRANT UPDATE, DELETE ON TABLE public.forum_threads TO authenticated;
GRANT INSERT ON TABLE public.forum_posts TO authenticated;
GRANT UPDATE, DELETE ON TABLE public.forum_posts TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO authenticated;

-- STEP 3: Grant full access to service_role (used by backend admin client)
GRANT ALL ON TABLE public.artworks TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.institutions TO service_role;
GRANT ALL ON TABLE public.collections TO service_role;
GRANT ALL ON TABLE public.collection_artworks TO service_role;
GRANT ALL ON TABLE public.bookmarks TO service_role;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.follows TO service_role;
GRANT ALL ON TABLE public.likes TO service_role;
GRANT ALL ON TABLE public.forum_categories TO service_role;
GRANT ALL ON TABLE public.forum_threads TO service_role;
GRANT ALL ON TABLE public.forum_posts TO service_role;

-- STEP 4: Ensure artworks RLS allows anonymous/public SELECT for non-draft artworks
-- Drop existing restrictive policy and recreate
DROP POLICY IF EXISTS artworks_read_public ON artworks;
CREATE POLICY artworks_read_public ON artworks
    FOR SELECT USING (status != 'draft');

-- Also allow artists to see their own drafts
DROP POLICY IF EXISTS artworks_read_own ON artworks;
CREATE POLICY artworks_read_own ON artworks
    FOR SELECT USING (auth.uid() = artist_id);

-- Ensure public can read user profiles (for artist info in artwork joins)
DROP POLICY IF EXISTS users_read_public ON users;
CREATE POLICY users_read_public ON users
    FOR SELECT USING (is_active = TRUE);

-- Ensure public can read institutions
DROP POLICY IF EXISTS institutions_read_public ON institutions;
CREATE POLICY institutions_read_public ON institutions
    FOR SELECT USING (true);
