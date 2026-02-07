-- ============================================================
-- DATABASE ENHANCEMENT FOR DASHBOARD FEATURES
-- Migration: 007_dashboard_enhancements.sql
-- Purpose: Add support for AI curation, genre detection, and seed data
-- ============================================================

-- ============================================================
-- AI CURATION & GENRE DETECTION
-- ============================================================

-- Genre Lookup Table
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES genres(id),
    artwork_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences for AI Curation
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Genre preferences
    preferred_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
    disliked_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Price preferences
    min_price DECIMAL(14, 2),
    max_price DECIMAL(14, 2),
    preferred_currency VARCHAR(10) DEFAULT 'ETH',
    
    -- Style preferences
    preferred_styles TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_mediums TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- AI settings
    curation_frequency VARCHAR(20) DEFAULT 'daily',
    show_nft_only BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- AI Curation Results (cached recommendations)
CREATE TABLE IF NOT EXISTS ai_curations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Curated artworks
    artwork_ids UUID[] NOT NULL,
    
    -- Algorithm metadata
    algorithm_version VARCHAR(50) DEFAULT 'v1',
    relevance_scores JSONB,
    
    -- Validity
    expires_at TIMESTAMPTZ NOT NULL,
    is_viewed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_curations_user ON ai_curations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_curations_expires ON ai_curations(expires_at);

-- ============================================================
-- ARTIST STATISTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS artist_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Aggregated stats
    total_artworks INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(20, 8) DEFAULT 0,
    
    -- NFT specific
    total_nfts_created INTEGER DEFAULT 0,
    total_nfts_sold INTEGER DEFAULT 0,
    
    -- Engagement
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    
    -- Calculated at
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_stats_user ON artist_stats(user_id);

-- ============================================================
-- SEED DATA FOR GENRES
-- ============================================================

INSERT INTO genres (name, description, icon) VALUES
    ('Landscape', 'Outdoor scenes and natural environments', '🏞️'),
    ('Portrait', 'Representations of individuals or groups', '👤'),
    ('Abstract', 'Non-representational art using shapes and colors', '🎨'),
    ('Still Life', 'Arrangements of inanimate objects', '🍎'),
    ('Religious', 'Artworks with religious or spiritual themes', '⛪'),
    ('Historical', 'Depictions of historical events or figures', '📜'),
    ('Mythology', 'Art inspired by mythological stories', '🏛️'),
    ('Contemporary', 'Modern and contemporary art styles', '🔷'),
    ('Digital', 'Art created using digital tools', '💻'),
    ('Photography', 'Photographic art works', '📷'),
    ('Sculpture', 'Three-dimensional art forms', '🗿'),
    ('Cultural', 'Art representing cultural traditions', '🎭'),
    ('Marine', 'Seascapes and ocean-related art', '🌊'),
    ('Urban', 'City scenes and urban environments', '🏙️'),
    ('Botanical', 'Plant and flower focused artworks', '🌸')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA FOR FORUM CATEGORIES
-- ============================================================

INSERT INTO forum_categories (name, slug, description, icon, sort_order) VALUES
    ('General Discussion', 'general', 'Talk about anything art-related', '💬', 1),
    ('Art Techniques', 'techniques', 'Share and learn artistic techniques', '🖌️', 2),
    ('Digital Art', 'digital-art', 'Discussions about digital art and tools', '💻', 3),
    ('NFT & Blockchain', 'nft', 'NFT marketplace and blockchain discussions', '🔗', 4),
    ('Art News', 'news', 'Latest news from the art world', '📰', 5),
    ('Showcase', 'showcase', 'Share your artwork with the community', '🖼️', 6),
    ('Collaboration', 'collaboration', 'Find collaborators for projects', '🤝', 7),
    ('Museum Tours', 'tours', 'Virtual and physical museum tour discussions', '🏛️', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- VIEWS FOR DASHBOARD STATISTICS
-- ============================================================

-- User Dashboard Stats View
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.display_name,
    u.avatar_url,
    COALESCE((SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.id), 0) as bookmarks_count,
    COALESCE((SELECT COUNT(*) FROM collections c WHERE c.user_id = u.id), 0) as collections_count,
    COALESCE((SELECT COUNT(*) FROM nfts n WHERE n.current_owner_id = u.id), 0) as nfts_owned,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0) as followers_count,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id), 0) as following_count
FROM users u
WHERE u.is_active = TRUE;

-- Artist Performance Stats View
CREATE OR REPLACE VIEW artist_performance_stats AS
SELECT 
    u.id as artist_id,
    u.display_name,
    u.avatar_url,
    COALESCE((SELECT COUNT(*) FROM artworks a WHERE a.artist_id = u.id AND a.status = 'published'), 0) as total_artworks,
    COALESCE((SELECT SUM(a.views) FROM artworks a WHERE a.artist_id = u.id), 0) as total_views,
    COALESCE((SELECT SUM(a.likes) FROM artworks a WHERE a.artist_id = u.id), 0) as total_likes,
    COALESCE((SELECT COUNT(*) FROM nfts n WHERE n.creator_id = u.id), 0) as total_nfts,
    COALESCE((SELECT COUNT(*) FROM nfts n WHERE n.creator_id = u.id AND n.status = 'sold'), 0) as nfts_sold,
    COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0) as followers_count
FROM users u
WHERE u.role IN ('artist', 'institution');

-- Admin Dashboard Stats View
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
    (SELECT COUNT(*) FROM users WHERE role IN ('artist', 'institution') AND is_active = TRUE) as total_artists,
    (SELECT COUNT(*) FROM institutions WHERE is_verified = TRUE) as verified_institutions,
    (SELECT COUNT(*) FROM institutions WHERE is_verified = FALSE) as pending_institutions,
    (SELECT COUNT(*) FROM artworks WHERE status = 'published') as total_artworks,
    (SELECT COUNT(*) FROM nfts) as total_nfts,
    (SELECT COUNT(*) FROM forum_threads) as total_threads,
    (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports;

-- ============================================================
-- FUNCTION TO UPDATE ARTIST STATS
-- ============================================================

CREATE OR REPLACE FUNCTION update_artist_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO artist_stats (user_id, total_artworks, total_views, total_likes, total_nfts_created, followers_count, following_count, calculated_at)
    SELECT 
        p_user_id,
        COALESCE((SELECT COUNT(*) FROM artworks WHERE artist_id = p_user_id AND status = 'published'), 0),
        COALESCE((SELECT SUM(views) FROM artworks WHERE artist_id = p_user_id), 0),
        COALESCE((SELECT SUM(likes) FROM artworks WHERE artist_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM nfts WHERE creator_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM follows WHERE following_id = p_user_id), 0),
        COALESCE((SELECT COUNT(*) FROM follows WHERE follower_id = p_user_id), 0),
        NOW()
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_artworks = EXCLUDED.total_artworks,
        total_views = EXCLUDED.total_views,
        total_likes = EXCLUDED.total_likes,
        total_nfts_created = EXCLUDED.total_nfts_created,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER TO UPDATE GENRE ARTWORK COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION update_genre_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update genre counts when artwork is created/updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE genres g
        SET artwork_count = (
            SELECT COUNT(*) FROM artworks a 
            WHERE g.name = ANY(a.genres) 
            AND a.status = 'published'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_genre_count ON artworks;
CREATE TRIGGER trg_update_genre_count
    AFTER INSERT OR UPDATE ON artworks
    FOR EACH ROW EXECUTE FUNCTION update_genre_count();

-- ============================================================
-- SAMPLE INSTITUTION DATA (with proper owner_id)
-- ============================================================

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID (use the seeded admin@seniqu.com)
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@seniqu.com' LIMIT 1;
    
    -- If no admin exists, create a system user
    IF admin_user_id IS NULL THEN
        INSERT INTO users (email, display_name, role, is_verified, is_active)
        VALUES ('system@seniqu.com', 'System Admin', 'admin', true, true)
        RETURNING id INTO admin_user_id;
    END IF;
    
    -- Insert sample institutions
    INSERT INTO institutions (
        owner_id, name, slug, description, type, city, province, country, 
        location, is_verified, rating, total_artworks
    ) VALUES 
    (
        admin_user_id,
        'National Gallery of Indonesia',
        'national-gallery-indonesia',
        'Indonesia''s premier art museum featuring national art treasures',
        'museum',
        'Jakarta',
        'DKI Jakarta',
        'Indonesia',
        ST_SetSRID(ST_MakePoint(106.8456, -6.1754), 4326)::geography,
        TRUE,
        4.5,
        150
    ),
    (
        admin_user_id,
        'Museum Nasional',
        'museum-nasional',
        'The largest museum in Southeast Asia with extensive collections',
        'museum',
        'Jakarta',
        'DKI Jakarta',
        'Indonesia',
        ST_SetSRID(ST_MakePoint(106.8230, -6.1769), 4326)::geography,
        TRUE,
        4.6,
        120
    ),
    (
        admin_user_id,
        'MACAN Museum',
        'macan-museum',
        'Museum of Modern and Contemporary Art in Nusantara',
        'museum',
        'Jakarta',
        'DKI Jakarta',
        'Indonesia',
        ST_SetSRID(ST_MakePoint(106.7882, -6.2275), 4326)::geography,
        TRUE,
        4.8,
        80
    ),
    (
        admin_user_id,
        'Sanggar Agung Temple',
        'sanggar-agung-temple',
        'Buddhist temple with stunning art and architecture',
        'museum',
        'Surabaya',
        'East Java',
        'Indonesia',
        ST_SetSRID(ST_MakePoint(112.7085, -7.2925), 4326)::geography,
        TRUE,
        4.4,
        45
    ),
    (
        admin_user_id,
        'Ullen Sentalu Museum',
        'ullen-sentalu-museum',
        'Cultural museum preserving Javanese heritage',
        'museum',
        'Yogyakarta',
        'DIY',
        'Indonesia',
        ST_SetSRID(ST_MakePoint(110.4180, -7.6010), 4326)::geography,
        TRUE,
        4.7,
        200
    )
    ON CONFLICT (slug) DO NOTHING;
    
END $$;

-- ============================================================
-- SAMPLE ARTWORKS DATA
-- ============================================================

DO $$
DECLARE
    artist_user_id UUID;
    institution_id UUID;
BEGIN
    -- Get artist user ID
    SELECT id INTO artist_user_id FROM users WHERE email = 'artist@seniqu.com' LIMIT 1;
    
    -- Get an institution ID
    SELECT id INTO institution_id FROM institutions WHERE slug = 'national-gallery-indonesia' LIMIT 1;
    
    IF artist_user_id IS NOT NULL THEN
        -- Insert sample artworks
        INSERT INTO artworks (
            artist_id, institution_id, title, slug, description, genres, medium,
            primary_image_url, status, views, likes, year_created
        ) VALUES
        (
            artist_user_id, institution_id,
            'Sunset Over Borobudur',
            'sunset-over-borobudur',
            'A stunning landscape painting capturing the golden hour at Borobudur temple',
            ARRAY['Landscape', 'Cultural'],
            'Oil on Canvas',
            'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272',
            'published',
            1250, 89, 2024
        ),
        (
            artist_user_id, institution_id,
            'Traditional Batik Dancer',
            'traditional-batik-dancer',
            'Portrait of a traditional Javanese dancer in ceremonial batik',
            ARRAY['Portrait', 'Cultural'],
            'Acrylic',
            'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3',
            'published',
            890, 67, 2023
        ),
        (
            artist_user_id, NULL,
            'Abstract Harmony',
            'abstract-harmony',
            'Contemporary abstract piece exploring color and form',
            ARRAY['Abstract', 'Contemporary'],
            'Mixed Media',
            'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
            'published',
            2100, 156, 2024
        ),
        (
            artist_user_id, NULL,
            'Digital Dreams',
            'digital-dreams',
            'A vibrant digital artwork exploring futuristic themes',
            ARRAY['Digital', 'Contemporary'],
            'Digital',
            'https://images.unsplash.com/photo-1634017839464-5c339afa32fd',
            'published',
            3200, 234, 2024
        ),
        (
            artist_user_id, NULL,
            'Urban Jakarta',
            'urban-jakarta',
            'Street photography capturing the energy of Jakarta',
            ARRAY['Photography', 'Urban'],
            'Photography',
            'https://images.unsplash.com/photo-1555899434-94d1368aa7af',
            'published',
            1800, 112, 2023
        )
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;

-- ============================================================
-- SAMPLE COLLECTIONS DATA
-- ============================================================

DO $$
DECLARE
    v_user_id UUID;
    v_artwork_id UUID;
    v_collection_id UUID;
BEGIN
    -- Get regular user ID
    SELECT id INTO v_user_id FROM users WHERE email = 'siabang35@gmail.com' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Create first collection and capture its ID
        INSERT INTO collections (user_id, name, description, is_public, artwork_count)
        VALUES (v_user_id, 'My Favorites', 'A collection of my favorite artworks', true, 0)
        ON CONFLICT DO NOTHING;
        
        -- Get the first collection ID
        SELECT id INTO v_collection_id FROM collections WHERE user_id = v_user_id AND name = 'My Favorites' LIMIT 1;
        
        -- Create additional collections
        INSERT INTO collections (user_id, name, description, is_public, artwork_count)
        VALUES (v_user_id, 'Indonesian Art', 'Traditional and contemporary Indonesian art', true, 0)
        ON CONFLICT DO NOTHING;
        
        INSERT INTO collections (user_id, name, description, is_public, artwork_count)
        VALUES (v_user_id, 'Digital Masterpieces', 'The best digital art I have found', false, 0)
        ON CONFLICT DO NOTHING;
        
        -- Get an artwork to bookmark
        SELECT id INTO v_artwork_id FROM artworks WHERE status = 'published' LIMIT 1;
        
        IF v_artwork_id IS NOT NULL AND v_collection_id IS NOT NULL THEN
            -- Add artwork to collection
            INSERT INTO collection_artworks (collection_id, artwork_id)
            VALUES (v_collection_id, v_artwork_id)
            ON CONFLICT DO NOTHING;
            
            -- Create a bookmark
            INSERT INTO bookmarks (user_id, artwork_id)
            VALUES (v_user_id, v_artwork_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- ============================================================
-- SAMPLE FORUM THREADS
-- ============================================================

DO $$
DECLARE
    user_id UUID;
    category_id UUID;
BEGIN
    SELECT id INTO user_id FROM users WHERE email = 'siabang35@gmail.com' LIMIT 1;
    SELECT id INTO category_id FROM forum_categories WHERE slug = 'general' LIMIT 1;
    
    IF user_id IS NOT NULL AND category_id IS NOT NULL THEN
        INSERT INTO forum_threads (
            category_id, author_id, title, slug, content, tags, views, likes, reply_count
        ) VALUES
        (
            category_id, user_id,
            'Welcome to Seniqu Community!',
            'welcome-to-seniqu-community',
            'Hello everyone! This is the official welcome thread. Feel free to introduce yourself and share your passion for art!',
            ARRAY['welcome', 'introduction'],
            250, 45, 12
        ),
        (
            category_id, user_id,
            'Tips for New Artists',
            'tips-for-new-artists',
            'Here are some tips I have gathered for artists just starting out...',
            ARRAY['tips', 'beginners', 'art'],
            180, 32, 8
        )
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;

-- ============================================================
-- SAMPLE NFT DATA
-- ============================================================

DO $$
DECLARE
    artist_id UUID;
    artwork_id UUID;
BEGIN
    SELECT id INTO artist_id FROM users WHERE email = 'artist@seniqu.com' LIMIT 1;
    SELECT id INTO artwork_id FROM artworks WHERE slug = 'digital-dreams' LIMIT 1;
    
    IF artist_id IS NOT NULL AND artwork_id IS NOT NULL THEN
        -- Update artwork to be NFT
        UPDATE artworks SET is_nft = true WHERE id = artwork_id;
        
        -- Create NFT record
        INSERT INTO nfts (
            artwork_id, token_id, contract_address, blockchain,
            creator_id, current_owner_id, price, currency,
            status, is_listed, listing_price, minted_at
        ) VALUES (
            artwork_id,
            '1001',
            '0x742d35Cc6634C0532925a3b844Bc9e7595f8dE01',
            'ethereum',
            artist_id,
            artist_id,
            0.5,
            'ETH',
            'listed',
            true,
            0.5,
            NOW()
        )
        ON CONFLICT (token_id, contract_address) DO NOTHING;
    END IF;
END $$;

-- ============================================================
-- SAMPLE SYSTEM ALERTS
-- ============================================================

INSERT INTO system_alerts (title, message, severity, is_global, is_active)
VALUES 
    ('Platform Update', 'We have released new features for artists! Check out the new analytics dashboard.', 'info', true, true),
    ('Scheduled Maintenance', 'The platform will undergo maintenance on Feb 15, 2026 from 2-4 AM UTC.', 'warning', true, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE NOTIFICATIONS FOR USERS
-- ============================================================

DO $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM users WHERE email = 'siabang35@gmail.com' LIMIT 1;
    
    IF user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES 
            (user_id, 'system', 'Welcome to Seniqu!', 'Thank you for joining our art community. Start exploring now!', false),
            (user_id, 'artwork', 'New artwork from your favorite artist', 'Check out the latest creation from Test Artist', false),
            (user_id, 'nft', 'NFT Price Alert', 'An NFT you bookmarked has been listed for sale', false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================
-- UPDATE COUNTS
-- ============================================================

-- Update collection artwork counts
UPDATE collections c SET artwork_count = (
    SELECT COUNT(*) FROM collection_artworks ca WHERE ca.collection_id = c.id
);

-- Update forum category thread counts
UPDATE forum_categories fc SET thread_count = (
    SELECT COUNT(*) FROM forum_threads ft WHERE ft.category_id = fc.id
);
