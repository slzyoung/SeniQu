-- Migration: Create reel_comment_likes table for comment liking
-- This enables the "like a comment" feature in Reels comments

CREATE TABLE IF NOT EXISTS reel_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_comment_user
    ON reel_comment_likes(comment_id, user_id);

-- RLS policies
ALTER TABLE reel_comment_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'reel_comment_likes' AND policyname = 'Anyone can view comment likes'
    ) THEN
        CREATE POLICY "Anyone can view comment likes"
            ON reel_comment_likes FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'reel_comment_likes' AND policyname = 'Users can like comments'
    ) THEN
        CREATE POLICY "Users can like comments"
            ON reel_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'reel_comment_likes' AND policyname = 'Users can unlike comments'
    ) THEN
        CREATE POLICY "Users can unlike comments"
            ON reel_comment_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
