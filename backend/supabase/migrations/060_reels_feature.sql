-- ============================================================
-- Reels Feature — Short-form Video Content (Instagram-style)
-- ============================================================

-- Main reels table
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Video CDN
    video_url TEXT NOT NULL,
    video_key TEXT NOT NULL,
    thumbnail_url TEXT,
    thumbnail_key TEXT,
    
    -- Content
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    
    -- Video Metadata
    duration NUMERIC(10,2) DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    aspect_ratio TEXT DEFAULT '9:16',
    
    -- Engagement Counters (denormalized for performance)
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    reshare_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- State
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('processing', 'active', 'hidden', 'deleted')),
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reel likes
CREATE TABLE IF NOT EXISTS reel_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

-- Reel comments
CREATE TABLE IF NOT EXISTS reel_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reel reshares
CREATE TABLE IF NOT EXISTS reel_reshares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

-- Reel views (for analytics / feed algorithm)
CREATE TABLE IF NOT EXISTS reel_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    watch_duration NUMERIC(10,2) DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels(status);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_featured ON reels(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_reels_like_count ON reels(like_count DESC);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_parent_id ON reel_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_reel_reshares_reel_id ON reel_reshares(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON reel_views(reel_id);

-- ============== RLS ==============
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_reshares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- Reels: anyone can read active
CREATE POLICY "reels_read_active" ON reels FOR SELECT USING (status = 'active');
CREATE POLICY "reels_owner_all" ON reels FOR ALL USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "reel_likes_read" ON reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes_own" ON reel_likes FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "reel_comments_read" ON reel_comments FOR SELECT USING (true);
CREATE POLICY "reel_comments_own" ON reel_comments FOR ALL USING (auth.uid() = user_id);

-- Reshares
CREATE POLICY "reel_reshares_read" ON reel_reshares FOR SELECT USING (true);
CREATE POLICY "reel_reshares_own" ON reel_reshares FOR ALL USING (auth.uid() = user_id);

-- Views
CREATE POLICY "reel_views_insert" ON reel_views FOR INSERT WITH CHECK (true);
CREATE POLICY "reel_views_read_own" ON reel_views FOR SELECT USING (auth.uid() = user_id);

-- ============== TRIGGERS ==============
CREATE OR REPLACE FUNCTION update_reels_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reels_updated_at BEFORE UPDATE ON reels
    FOR EACH ROW EXECUTE FUNCTION update_reels_updated_at();

CREATE TRIGGER trigger_reel_comments_updated_at BEFORE UPDATE ON reel_comments
    FOR EACH ROW EXECUTE FUNCTION update_reels_updated_at();

-- Auto-increment counters via triggers
CREATE OR REPLACE FUNCTION update_reel_like_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reel_id;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reel_like_count AFTER INSERT OR DELETE ON reel_likes
    FOR EACH ROW EXECUTE FUNCTION update_reel_like_count();

CREATE OR REPLACE FUNCTION update_reel_comment_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.reel_id;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reel_comment_count AFTER INSERT OR DELETE ON reel_comments
    FOR EACH ROW EXECUTE FUNCTION update_reel_comment_count();

CREATE OR REPLACE FUNCTION update_reel_reshare_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET reshare_count = reshare_count + 1 WHERE id = NEW.reel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET reshare_count = GREATEST(reshare_count - 1, 0) WHERE id = OLD.reel_id;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reel_reshare_count AFTER INSERT OR DELETE ON reel_reshares
    FOR EACH ROW EXECUTE FUNCTION update_reel_reshare_count();
