-- ============================================================
-- Migration 050: Photography Collections Platform
-- Transforms Collections menu into a photography discovery hub
-- ============================================================

-- Main photos table (separate from artworks — for photographer community)
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- CDN URLs (Cloudflare R2)
    original_url TEXT NOT NULL,
    medium_url TEXT,
    thumbnail_url TEXT,
    watermarked_url TEXT,
    
    -- EXIF Metadata (indexed)
    camera_make VARCHAR(100),
    camera_model VARCHAR(100),
    lens VARCHAR(150),
    focal_length VARCHAR(20),
    aperture VARCHAR(20),
    shutter_speed VARCHAR(20),
    iso INTEGER,
    taken_at TIMESTAMPTZ,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    location_name VARCHAR(255),
    
    -- Classification
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    theme VARCHAR(50) DEFAULT 'general',
    
    -- Social
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    
    -- Marketplace
    is_for_sale BOOLEAN DEFAULT false,
    price DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'IDR',
    license_type VARCHAR(50) DEFAULT 'personal',
    
    -- Status
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    
    -- Image properties
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    mime_type VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo collections/albums
CREATE TABLE IF NOT EXISTS photo_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
    theme VARCHAR(50) DEFAULT 'custom',
    is_public BOOLEAN DEFAULT true,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: photos in collections
CREATE TABLE IF NOT EXISTS photo_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES photo_collections(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, photo_id)
);

-- Photo likes
CREATE TABLE IF NOT EXISTS photo_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, photo_id)
);

-- Photo comments (threaded chat)
CREATE TABLE IF NOT EXISTS photo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES photo_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo edit history
CREATE TABLE IF NOT EXISTS photo_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    edit_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    before_url TEXT,
    after_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo purchases/downloads
CREATE TABLE IF NOT EXISTS photo_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    license_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    transaction_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_theme ON photos(theme);
CREATE INDEX IF NOT EXISTS idx_photos_is_for_sale ON photos(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_likes_count ON photos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_collections_user ON photo_collections(user_id);

-- Enable Realtime for live comments & likes
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;
    ALTER PUBLICATION supabase_realtime ADD TABLE photo_likes;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication already exists for these tables';
END $$;

-- RLS Policies
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_collection_items ENABLE ROW LEVEL SECURITY;

-- Photos policies
CREATE POLICY "Public photos are viewable" ON photos
    FOR SELECT USING (is_public = true AND status = 'active');
CREATE POLICY "Users manage own photos" ON photos
    FOR ALL USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Public collections viewable" ON photo_collections
    FOR SELECT USING (is_public = true);
CREATE POLICY "Users manage own collections" ON photo_collections
    FOR ALL USING (auth.uid() = user_id);

-- Collection items policies
CREATE POLICY "Collection items viewable" ON photo_collection_items
    FOR SELECT USING (true);
CREATE POLICY "Users manage own collection items" ON photo_collection_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM photo_collections 
            WHERE id = collection_id AND user_id = auth.uid()
        )
    );

-- Comments policies
CREATE POLICY "Comments are readable" ON photo_comments
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON photo_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own comments" ON photo_comments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON photo_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON photo_likes
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON photo_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON photo_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Edit history policies
CREATE POLICY "Edits viewable by photo owner" ON photo_edits
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own edits" ON photo_edits
    FOR ALL USING (auth.uid() = user_id);

-- Purchase policies
CREATE POLICY "Users view own purchases" ON photo_purchases
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated users can purchase" ON photo_purchases
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Function to auto-update photo counts
CREATE OR REPLACE FUNCTION update_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photos SET likes_count = likes_count + 1 WHERE id = NEW.photo_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.photo_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_photo_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photos SET comments_count = comments_count + 1 WHERE id = NEW.photo_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.photo_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_photo_likes_count ON photo_likes;
CREATE TRIGGER trg_photo_likes_count
    AFTER INSERT OR DELETE ON photo_likes
    FOR EACH ROW EXECUTE FUNCTION update_photo_likes_count();

DROP TRIGGER IF EXISTS trg_photo_comments_count ON photo_comments;
CREATE TRIGGER trg_photo_comments_count
    AFTER INSERT OR DELETE ON photo_comments
    FOR EACH ROW EXECUTE FUNCTION update_photo_comments_count();
