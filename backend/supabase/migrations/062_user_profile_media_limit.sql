-- ============================================================
-- Profile Media Limit & Profile Video Support
-- ============================================================

-- Add profile video and media change counters to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_video_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_change_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_video_change_count INTEGER DEFAULT 0 NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.avatar_change_count IS 'Number of times the user has changed their avatar/profile picture. Capped at 3.';
COMMENT ON COLUMN users.profile_video_change_count IS 'Number of times the user has changed their profile video. Capped at 3.';
