-- ============================================================
-- MIGRATION 030: RENAME NFT/NFTS → ARTS
-- Comprehensive renaming across tables, enums, columns,
-- indexes, policies, views, functions, and triggers
-- Date: 2026-03-17
-- ============================================================

-- ============================================================
-- SECTION 1: RENAME TABLES
-- ============================================================

-- 1A. Rename nfts → arts
ALTER TABLE IF EXISTS public.nfts RENAME TO arts;

-- 1B. Rename nft_transactions → art_transactions
ALTER TABLE IF EXISTS public.nft_transactions RENAME TO art_transactions;

-- ============================================================
-- SECTION 2: RENAME ENUM TYPE
-- ============================================================

-- 2A. Rename nft_status → art_status
ALTER TYPE nft_status RENAME TO art_status;

-- 2B. Update notification_type enum: remove 'nft', add 'art'
-- PostgreSQL doesn't allow using new enum values in the same transaction they are created.
-- To safely migrate in a single transaction, we convert to text, recreate the enum, and convert back.
ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50);

-- Update the text values
UPDATE notifications SET type = 'art' WHERE type = 'nft';

-- Recreate the enum type with 'art' instead of 'nft'
DROP TYPE notification_type;
CREATE TYPE notification_type AS ENUM ('system', 'artwork', 'art', 'forum', 'follow', 'sale', 'alert');

-- Convert back to the new enum type
ALTER TABLE notifications ALTER COLUMN type TYPE notification_type USING type::notification_type;

-- ============================================================
-- SECTION 3: RENAME COLUMNS IN ARTWORKS TABLE
-- ============================================================

-- 3A. artworks.is_nft → is_art
ALTER TABLE artworks RENAME COLUMN is_nft TO is_art;

-- 3B. artworks.nft_token_id → art_token_id
ALTER TABLE artworks RENAME COLUMN nft_token_id TO art_token_id;

-- 3C. artworks.nft_contract_address → art_contract_address
ALTER TABLE artworks RENAME COLUMN nft_contract_address TO art_contract_address;

-- ============================================================
-- SECTION 4: RENAME COLUMNS IN ARTS TABLE (formerly nfts)
-- ============================================================

-- 4A. art_transactions.nft_id → art_id
ALTER TABLE art_transactions RENAME COLUMN nft_id TO art_id;

-- ============================================================
-- SECTION 5: RENAME COLUMNS IN ARTIST_STATS TABLE
-- ============================================================

-- 5A. artist_stats.total_nfts_created → total_arts_created
ALTER TABLE artist_stats RENAME COLUMN total_nfts_created TO total_arts_created;

-- 5B. artist_stats.total_nfts_sold → total_arts_sold
ALTER TABLE artist_stats RENAME COLUMN total_nfts_sold TO total_arts_sold;

-- ============================================================
-- SECTION 6: DROP & RECREATE INDEXES (with new names)
-- ============================================================

-- 6A. arts table indexes (formerly nfts)
DROP INDEX IF EXISTS idx_nfts_artwork;
CREATE INDEX IF NOT EXISTS idx_arts_artwork ON arts(artwork_id);

DROP INDEX IF EXISTS idx_nfts_creator;
CREATE INDEX IF NOT EXISTS idx_arts_creator ON arts(creator_id);

DROP INDEX IF EXISTS idx_nfts_owner;
CREATE INDEX IF NOT EXISTS idx_arts_owner ON arts(current_owner_id);

DROP INDEX IF EXISTS idx_nfts_listed;
CREATE INDEX IF NOT EXISTS idx_arts_listed ON arts(is_listed) WHERE is_listed = TRUE;

-- 6B. art_transactions indexes (formerly nft_transactions)
DROP INDEX IF EXISTS idx_nft_tx_nft;
CREATE INDEX IF NOT EXISTS idx_art_tx_art ON art_transactions(art_id);

DROP INDEX IF EXISTS idx_nft_tx_type;
CREATE INDEX IF NOT EXISTS idx_art_tx_type ON art_transactions(transaction_type);

-- 6C. artworks table: rename nft-related indexes
DROP INDEX IF EXISTS idx_artworks_nft;
CREATE INDEX IF NOT EXISTS idx_artworks_art ON artworks(is_art) WHERE is_art = TRUE;

-- 6D. Composite index from 004_indexes.sql
DROP INDEX IF EXISTS idx_artworks_gallery_listing;
CREATE INDEX IF NOT EXISTS idx_artworks_gallery_listing
ON artworks(status, is_art, is_for_sale, created_at DESC)
WHERE status = 'published';

-- 6E. Marketplace index from 004_indexes.sql
DROP INDEX IF EXISTS idx_nfts_marketplace;
CREATE INDEX IF NOT EXISTS idx_arts_marketplace
ON arts(is_listed, status, listing_price)
WHERE is_listed = TRUE;

-- ============================================================
-- SECTION 7: DROP & RECREATE RLS POLICIES (with new names)
-- ============================================================

-- 7A. Arts table policies (formerly nfts)
DROP POLICY IF EXISTS "Listed NFTs are public" ON arts;
CREATE POLICY "Listed arts are public" ON arts
    FOR SELECT USING (is_listed = TRUE);

DROP POLICY IF EXISTS "Owners can view own NFTs" ON arts;
CREATE POLICY "Owners can view own arts" ON arts
    FOR SELECT USING (auth.uid() = current_owner_id OR auth.uid() = creator_id);

-- 7B. Art transactions policies (formerly nft_transactions)
DROP POLICY IF EXISTS "Public read nft tx" ON art_transactions;
CREATE POLICY "Public read art tx" ON art_transactions
    FOR SELECT USING (true);

-- ============================================================
-- SECTION 8: RECREATE VIEWS (reference arts instead of nfts)
-- ============================================================

-- 8A. User Dashboard Stats View
DROP VIEW IF EXISTS user_dashboard_stats CASCADE;
CREATE OR REPLACE VIEW user_dashboard_stats
WITH (security_invoker = true)
AS
SELECT
    u.id as user_id,
    u.display_name,
    u.avatar_url,
    COALESCE((SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.id), 0) as bookmarks_count,
    COALESCE((SELECT COUNT(*) FROM collections c WHERE c.user_id = u.id), 0) as collections_count,
    COALESCE((SELECT COUNT(*) FROM arts n WHERE n.current_owner_id = u.id), 0) as arts_owned,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0) as followers_count,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id), 0) as following_count
FROM users u
WHERE u.is_active = TRUE;

-- 8B. Artist Performance Stats View
DROP VIEW IF EXISTS artist_performance_stats CASCADE;
CREATE OR REPLACE VIEW artist_performance_stats
WITH (security_invoker = true)
AS
SELECT
    u.id as artist_id,
    u.display_name,
    u.avatar_url,
    COALESCE((SELECT COUNT(*) FROM artworks a WHERE a.artist_id = u.id AND a.status = 'published'), 0) as total_artworks,
    COALESCE((SELECT SUM(a.views) FROM artworks a WHERE a.artist_id = u.id), 0) as total_views,
    COALESCE((SELECT SUM(a.likes) FROM artworks a WHERE a.artist_id = u.id), 0) as total_likes,
    COALESCE((SELECT COUNT(*) FROM arts n WHERE n.creator_id = u.id), 0) as total_arts,
    COALESCE((SELECT COUNT(*) FROM arts n WHERE n.creator_id = u.id AND n.status = 'sold'), 0) as arts_sold,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0) as followers_count
FROM users u
WHERE u.role IN ('artist', 'institution');

-- 8C. Admin Dashboard Stats View
DROP VIEW IF EXISTS admin_dashboard_stats CASCADE;
CREATE OR REPLACE VIEW admin_dashboard_stats
WITH (security_invoker = true)
AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
    (SELECT COUNT(*) FROM users WHERE role IN ('artist', 'institution') AND is_active = TRUE) as total_artists,
    (SELECT COUNT(*) FROM institutions WHERE is_verified = TRUE) as verified_institutions,
    (SELECT COUNT(*) FROM institutions WHERE is_verified = FALSE) as pending_institutions,
    (SELECT COUNT(*) FROM artworks WHERE status = 'published') as total_artworks,
    (SELECT COUNT(*) FROM arts) as total_arts,
    (SELECT COUNT(*) FROM forum_threads) as total_threads,
    (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports;

-- ============================================================
-- SECTION 9: UPDATE FUNCTIONS
-- ============================================================

-- 9A. Update get_admin_dashboard_stats()
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_artworks BIGINT,
    total_museums BIGINT,
    total_arts BIGINT,
    active_today BIGINT,
    new_this_week BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM users)::BIGINT AS total_users,
        (SELECT COUNT(*) FROM artworks WHERE status = 'published')::BIGINT AS total_artworks,
        (SELECT COUNT(*) FROM institutions WHERE is_verified = TRUE)::BIGINT AS total_museums,
        (SELECT COUNT(*) FROM arts)::BIGINT AS total_arts,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '1 day')::BIGINT AS active_today,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT AS new_this_week;
END;
$$;

-- 9B. Update update_artist_stats()
CREATE OR REPLACE FUNCTION update_artist_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO artist_stats (user_id, total_artworks, total_views, total_likes, total_arts_created, followers_count, following_count, calculated_at)
    SELECT
        p_user_id,
        COALESCE((SELECT COUNT(*) FROM artworks WHERE artist_id = p_user_id AND status = 'published'), 0),
        COALESCE((SELECT SUM(views) FROM artworks WHERE artist_id = p_user_id), 0),
        COALESCE((SELECT SUM(likes) FROM artworks WHERE artist_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM arts WHERE creator_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM follows WHERE following_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM follows WHERE follower_id = p_user_id), 0),
        NOW()
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_artworks = EXCLUDED.total_artworks,
        total_views = EXCLUDED.total_views,
        total_likes = EXCLUDED.total_likes,
        total_arts_created = EXCLUDED.total_arts_created,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.update_artist_stats SET search_path = public;

-- ============================================================
-- SECTION 10: RENAME TRIGGERS
-- ============================================================

-- 10A. Drop old trigger, create new one
DROP TRIGGER IF EXISTS trigger_nfts_updated_at ON arts;
CREATE TRIGGER trigger_arts_updated_at
    BEFORE UPDATE ON arts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SECTION 11: UPDATE TABLE COMMENTS
-- ============================================================

COMMENT ON TABLE arts IS 'Digital art tokens linked to artworks (formerly nfts)';
COMMENT ON TABLE art_transactions IS 'Transaction history for digital art tokens (formerly nft_transactions)';
COMMENT ON TABLE artworks IS 'Art pieces with AI detection and digital art support';

-- ============================================================
-- SECTION 12: UPDATE FORUM SEED DATA
-- ============================================================

-- Update forum category names referencing NFT
UPDATE forum_categories
SET name = 'Arts & Digital Art', description = 'Arts trading and digital art topics'
WHERE slug = 'nft-digital';

UPDATE forum_categories
SET name = 'Arts & Blockchain', description = 'Digital arts marketplace and blockchain discussions'
WHERE slug = 'nft';

-- ============================================================
-- SECTION 13: RE-ANALYZE RENAMED TABLES
-- ============================================================

ANALYZE arts;
ANALYZE art_transactions;
ANALYZE artworks;
ANALYZE artist_stats;

-- ============================================================
-- DONE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Migration 030: NFT → Arts Rename      ';
    RAISE NOTICE '  - Renamed nfts → arts table           ';
    RAISE NOTICE '  - Renamed nft_transactions → art_tx   ';
    RAISE NOTICE '  - Renamed nft_status → art_status     ';
    RAISE NOTICE '  - Renamed columns: is_nft → is_art    ';
    RAISE NOTICE '  - Updated indexes, policies, views    ';
    RAISE NOTICE '  - Updated functions & triggers        ';
    RAISE NOTICE '========================================';
END $$;
