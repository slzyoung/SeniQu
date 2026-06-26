-- ============================================================
-- Forum Video Uploads — Metadata Storage & Content Index
-- ============================================================
-- Creates a dedicated table for forum video metadata with
-- full-text indexing for content discovery.
-- Links to both forum_threads and forum_posts for video content.
-- ============================================================

-- Table: forum_videos — Video metadata registry
CREATE TABLE IF NOT EXISTS forum_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES forum_threads(id) ON DELETE SET NULL,
    post_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL,
    
    -- CDN References
    video_url TEXT NOT NULL,
    video_key TEXT NOT NULL,
    thumbnail_url TEXT,
    thumbnail_key TEXT,
    
    -- Video Metadata
    duration NUMERIC(10,2) DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    original_file_size BIGINT DEFAULT 0,
    video_codec TEXT DEFAULT 'h264',
    audio_codec TEXT,
    bitrate INTEGER DEFAULT 0,
    fps NUMERIC(5,2) DEFAULT 30,
    aspect_ratio TEXT DEFAULT '16:9',
    content_type TEXT DEFAULT 'video/mp4',
    
    -- Content Index
    original_filename TEXT,
    caption TEXT,
    
    -- Processing State
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed', 'deleted')),
    processing_error TEXT,
    compression_ratio NUMERIC(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_forum_videos_user_id ON forum_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_videos_thread_id ON forum_videos(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_videos_post_id ON forum_videos(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_videos_status ON forum_videos(status);
CREATE INDEX IF NOT EXISTS idx_forum_videos_created_at ON forum_videos(created_at DESC);

-- Add video_url and video_thumbnail_url columns to forum_threads if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_threads' AND column_name = 'video_url') THEN
        ALTER TABLE forum_threads ADD COLUMN video_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_threads' AND column_name = 'video_thumbnail_url') THEN
        ALTER TABLE forum_threads ADD COLUMN video_thumbnail_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_threads' AND column_name = 'video_duration') THEN
        ALTER TABLE forum_threads ADD COLUMN video_duration NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- Add video columns to forum_posts if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'video_url') THEN
        ALTER TABLE forum_posts ADD COLUMN video_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'video_thumbnail_url') THEN
        ALTER TABLE forum_posts ADD COLUMN video_thumbnail_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'video_duration') THEN
        ALTER TABLE forum_posts ADD COLUMN video_duration NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- RLS Policies
ALTER TABLE forum_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read videos that are ready
CREATE POLICY "forum_videos_read_ready" ON forum_videos
    FOR SELECT USING (status = 'ready');

-- Users can see their own processing videos
CREATE POLICY "forum_videos_owner_read" ON forum_videos
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own videos
CREATE POLICY "forum_videos_insert_own" ON forum_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own videos
CREATE POLICY "forum_videos_update_own" ON forum_videos
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "forum_videos_delete_own" ON forum_videos
    FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_forum_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_forum_videos_updated_at
    BEFORE UPDATE ON forum_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_videos_updated_at();
