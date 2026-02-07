-- ============================================================
-- SENIQU DATABASE INDEXES
-- Performance optimization indexes
-- ============================================================

-- ===========================================
-- COMPOSITE INDEXES
-- ===========================================

-- Artworks search optimization
CREATE INDEX IF NOT EXISTS idx_artworks_search_composite 
ON artworks(status, artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artworks_gallery_listing
ON artworks(status, is_nft, is_for_sale, created_at DESC)
WHERE status = 'published';

-- NFT marketplace listing
CREATE INDEX IF NOT EXISTS idx_nfts_marketplace
ON nfts(is_listed, status, listing_price)
WHERE is_listed = TRUE;

-- Forum pagination
CREATE INDEX IF NOT EXISTS idx_threads_category_pinned
ON forum_threads(category_id, is_pinned DESC, last_reply_at DESC NULLS LAST);

-- User activity
CREATE INDEX IF NOT EXISTS idx_users_login_activity
ON users(last_login_at DESC NULLS LAST, is_active)
WHERE is_active = TRUE;

-- ===========================================
-- PARTIAL INDEXES
-- ===========================================

-- Active sessions only (check expires_at > now() in query, not in index)
CREATE INDEX IF NOT EXISTS idx_sessions_valid
ON sessions(user_id, expires_at)
WHERE is_revoked = FALSE;

-- Pending reports
CREATE INDEX IF NOT EXISTS idx_reports_pending
ON reports(status, created_at DESC)
WHERE status = 'pending';

-- Active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_active_global
ON system_alerts(created_at DESC)
WHERE is_active = TRUE AND is_global = TRUE;

-- Premium users
CREATE INDEX IF NOT EXISTS idx_users_premium
ON users(role, is_premium)
WHERE is_premium = TRUE;

-- ===========================================
-- EXPRESSION INDEXES
-- ===========================================

-- Case-insensitive email search
CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON users(LOWER(email));

-- Case-insensitive username search
CREATE INDEX IF NOT EXISTS idx_users_username_lower
ON users(LOWER(username));

-- Full-text search on artworks
CREATE INDEX IF NOT EXISTS idx_artworks_fulltext
ON artworks USING GIN(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' ||
        COALESCE(medium, '') || ' ' ||
        COALESCE(style, '')
    )
);

-- Full-text search on forum threads
CREATE INDEX IF NOT EXISTS idx_threads_fulltext
ON forum_threads USING GIN(
    to_tsvector('english',
        COALESCE(title, '') || ' ' ||
        COALESCE(content, '')
    )
);

-- ===========================================
-- BRIN INDEXES (for time-series data)
-- ===========================================

-- Analytics events by time
CREATE INDEX IF NOT EXISTS idx_analytics_events_time_brin
ON analytics_events USING BRIN(created_at);

-- Audit logs by time
CREATE INDEX IF NOT EXISTS idx_audit_logs_time_brin
ON audit_logs USING BRIN(created_at);

-- System logs by time
CREATE INDEX IF NOT EXISTS idx_system_logs_time_brin
ON system_logs USING BRIN(created_at);

-- ===========================================
-- CONCURRENCY OPTIMIZATION
-- ===========================================

-- Prevent duplicate concurrent likes
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique_check
ON likes(user_id, target_type, target_id);

-- Prevent duplicate follows
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique_check
ON follows(follower_id, following_id);

-- Prevent duplicate bookmarks
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_unique_check
ON bookmarks(user_id, artwork_id);

-- ===========================================
-- ANALYZE TABLES
-- ===========================================

ANALYZE users;
ANALYZE artworks;
ANALYZE institutions;
ANALYZE nfts;
ANALYZE forum_threads;
ANALYZE forum_posts;
