-- ============================================================
-- SENIQU SECURITY POLICIES (RLS)
-- Row Level Security for Supabase
-- ============================================================

-- Enable RLS on application tables only (exclude PostGIS system tables)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        -- Exclude PostGIS and other system tables
        AND table_name NOT IN (
            'spatial_ref_sys',
            'geometry_columns',
            'geography_columns',
            'raster_columns',
            'raster_overviews'
        )
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- ===========================================
-- USERS TABLE POLICIES
-- ===========================================

-- Anyone can view basic user profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT
USING (is_active = TRUE);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- ===========================================
-- ARTWORKS TABLE POLICIES
-- ===========================================

-- Published artworks are viewable by everyone
CREATE POLICY "Published artworks are viewable"
ON artworks FOR SELECT
USING (status = 'published');

-- Artists can view their own artworks (any status)
CREATE POLICY "Artists can view own artworks"
ON artworks FOR SELECT
USING (auth.uid() = artist_id);

-- Artists can insert their own artworks
CREATE POLICY "Artists can create artworks"
ON artworks FOR INSERT
WITH CHECK (auth.uid() = artist_id);

-- Artists can update their own artworks
CREATE POLICY "Artists can update own artworks"
ON artworks FOR UPDATE
USING (auth.uid() = artist_id);

-- Artists can delete their own draft artworks
CREATE POLICY "Artists can delete own drafts"
ON artworks FOR DELETE
USING (auth.uid() = artist_id AND status = 'draft');

-- ===========================================
-- INSTITUTIONS TABLE POLICIES
-- ===========================================

-- Verified institutions are public
CREATE POLICY "Verified institutions are public"
ON institutions FOR SELECT
USING (is_verified = TRUE);

-- Owners can view their own institutions
CREATE POLICY "Owners can view own institutions"
ON institutions FOR SELECT
USING (auth.uid() = owner_id);

-- Users can create institutions
CREATE POLICY "Users can create institutions"
ON institutions FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their institutions
CREATE POLICY "Owners can update own institutions"
ON institutions FOR UPDATE
USING (auth.uid() = owner_id);

-- ===========================================
-- COLLECTIONS TABLE POLICIES
-- ===========================================

-- Public collections are viewable
CREATE POLICY "Public collections viewable"
ON collections FOR SELECT
USING (is_public = TRUE);

-- Users can view their own collections
CREATE POLICY "Users can view own collections"
ON collections FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own collections
CREATE POLICY "Users can manage own collections"
ON collections FOR ALL
USING (auth.uid() = user_id);

-- ===========================================
-- BOOKMARKS TABLE POLICIES
-- ===========================================

-- Users can only see their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks"
ON bookmarks FOR ALL
USING (auth.uid() = user_id);

-- ===========================================
-- FORUM TABLE POLICIES
-- ===========================================

-- Anyone can view forum categories
CREATE POLICY "Forum categories are public"
ON forum_categories FOR SELECT
USING (is_active = TRUE);

-- Anyone can view threads
CREATE POLICY "Forum threads are public"
ON forum_threads FOR SELECT
USING (TRUE);

-- Authenticated users can create threads
CREATE POLICY "Authenticated users can create threads"
ON forum_threads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authors can update their own threads
CREATE POLICY "Authors can update own threads"
ON forum_threads FOR UPDATE
USING (auth.uid() = author_id);

-- Forum posts are public
CREATE POLICY "Forum posts are public"
ON forum_posts FOR SELECT
USING (TRUE);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can reply"
ON forum_posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts"
ON forum_posts FOR UPDATE
USING (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own posts"
ON forum_posts FOR DELETE
USING (auth.uid() = author_id);

-- ===========================================
-- NFT TABLE POLICIES
-- ===========================================

-- Listed NFTs are public
CREATE POLICY "Listed NFTs are public"
ON nfts FOR SELECT
USING (is_listed = TRUE);

-- Owners can view their NFTs
CREATE POLICY "Owners can view own NFTs"
ON nfts FOR SELECT
USING (auth.uid() = current_owner_id OR auth.uid() = creator_id);

-- ===========================================
-- NOTIFICATIONS TABLE POLICIES
-- ===========================================

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- FOLLOWS TABLE POLICIES
-- ===========================================

-- Follows are public (for follower counts)
CREATE POLICY "Follows are public"
ON follows FOR SELECT
USING (TRUE);

-- Users can follow others
CREATE POLICY "Users can follow"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
USING (auth.uid() = follower_id);

-- ===========================================
-- AUDIT LOGS - ADMIN ONLY
-- ===========================================

-- Audit logs are only accessible to admins (via service role)
-- No RLS policies = only service_role can access

-- ===========================================
-- ADMIN BYPASS POLICIES
-- ===========================================

-- Create admin bypass function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can read all artworks
CREATE POLICY "Admins can view all artworks"
ON artworks FOR SELECT
USING (is_admin());

-- Admin can update all artworks
CREATE POLICY "Admins can update all artworks"
ON artworks FOR UPDATE
USING (is_admin());

-- Admin can delete artworks
CREATE POLICY "Admins can delete artworks"
ON artworks FOR DELETE
USING (is_admin());

-- Admin can manage institutions
CREATE POLICY "Admins can manage institutions"
ON institutions FOR ALL
USING (is_admin());

-- Admin can manage forum
CREATE POLICY "Admins can manage forum threads"
ON forum_threads FOR ALL
USING (is_admin());

CREATE POLICY "Admins can manage forum posts"
ON forum_posts FOR ALL
USING (is_admin());
