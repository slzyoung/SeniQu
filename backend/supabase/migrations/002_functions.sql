-- ============================================================
-- SENIQU DATABASE FUNCTIONS
-- Helper functions for the application
-- ============================================================

-- ===========================================
-- GEOLOCATION FUNCTIONS
-- ===========================================

-- Find nearby institutions using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_institutions(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    slug VARCHAR,
    description TEXT,
    type VARCHAR,
    city VARCHAR,
    province VARCHAR,
    logo_url TEXT,
    cover_image_url TEXT,
    is_verified BOOLEAN,
    is_featured BOOLEAN,
    rating DECIMAL,
    total_artworks INTEGER,
    distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.slug,
        i.description,
        i.type,
        i.city,
        i.province,
        i.logo_url,
        i.cover_image_url,
        i.is_verified,
        i.is_featured,
        i.rating,
        i.total_artworks,
        ST_Distance(
            i.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1000 AS distance_km
    FROM institutions i
    WHERE 
        i.is_verified = TRUE
        AND i.location IS NOT NULL
        AND ST_DWithin(
            i.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000 -- Convert km to meters
        )
    ORDER BY distance_km ASC
    LIMIT 50;
END;
$$;

-- ===========================================
-- COUNTER FUNCTIONS
-- ===========================================

-- Increment artwork likes
CREATE OR REPLACE FUNCTION increment_artwork_likes(artwork_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE artworks SET likes = likes + 1 WHERE id = artwork_id;
END;
$$;

-- Decrement artwork likes
CREATE OR REPLACE FUNCTION decrement_artwork_likes(artwork_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE artworks SET likes = GREATEST(likes - 1, 0) WHERE id = artwork_id;
END;
$$;

-- Increment artwork views
CREATE OR REPLACE FUNCTION increment_artwork_views(artwork_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE artworks SET views = views + 1 WHERE id = artwork_id;
END;
$$;

-- Increment category thread count
CREATE OR REPLACE FUNCTION increment_category_threads(category_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE forum_categories SET thread_count = thread_count + 1 WHERE id = category_id;
END;
$$;

-- ===========================================
-- USER STATS FUNCTIONS
-- ===========================================

-- Record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    user_email VARCHAR,
    success BOOLEAN,
    ip_addr INET DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF success THEN
        UPDATE users 
        SET 
            last_login_at = NOW(),
            login_count = login_count + 1,
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE email = user_email;
    ELSE
        UPDATE users 
        SET 
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE email = user_email;
    END IF;
END;
$$;

-- Check if user is locked
CREATE OR REPLACE FUNCTION is_user_locked(user_email VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lock_time TIMESTAMPTZ;
BEGIN
    SELECT locked_until INTO lock_time FROM users WHERE email = user_email;
    RETURN lock_time IS NOT NULL AND lock_time > NOW();
END;
$$;

-- ===========================================
-- SEARCH HELPERS
-- ===========================================

-- Get trending artworks
CREATE OR REPLACE FUNCTION get_trending_artworks(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    primary_image_url TEXT,
    views INTEGER,
    likes INTEGER,
    artist_name VARCHAR,
    artist_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.slug,
        a.primary_image_url,
        a.views,
        a.likes,
        u.display_name AS artist_name,
        u.avatar_url AS artist_avatar
    FROM artworks a
    JOIN users u ON u.id = a.artist_id
    WHERE a.status = 'published'
    ORDER BY (a.views * 0.3 + a.likes * 0.7) DESC, a.created_at DESC
    LIMIT limit_count;
END;
$$;

-- ===========================================
-- ADMIN STATS
-- ===========================================

-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_artworks BIGINT,
    total_museums BIGINT,
    total_nfts BIGINT,
    active_today BIGINT,
    new_this_week BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users)::BIGINT AS total_users,
        (SELECT COUNT(*) FROM artworks WHERE status = 'published')::BIGINT AS total_artworks,
        (SELECT COUNT(*) FROM institutions WHERE is_verified = TRUE)::BIGINT AS total_museums,
        (SELECT COUNT(*) FROM nfts)::BIGINT AS total_nfts,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '1 day')::BIGINT AS active_today,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT AS new_this_week;
END;
$$;

-- ===========================================
-- SECURITY FUNCTIONS
-- ===========================================

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Revoke all user sessions (for security events)
CREATE OR REPLACE FUNCTION revoke_user_sessions(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE sessions SET is_revoked = TRUE WHERE user_id = target_user_id;
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    RETURN revoked_count;
END;
$$;

-- ===========================================
-- PERMISSIONS GRANTS
-- ===========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION find_nearby_institutions TO authenticated;
GRANT EXECUTE ON FUNCTION increment_artwork_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_artworks TO anon, authenticated;

-- Service role only functions
GRANT EXECUTE ON FUNCTION increment_artwork_likes TO service_role;
GRANT EXECUTE ON FUNCTION decrement_artwork_likes TO service_role;
GRANT EXECUTE ON FUNCTION record_login_attempt TO service_role;
GRANT EXECUTE ON FUNCTION is_user_locked TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION revoke_user_sessions TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO service_role;
