-- ============================================================
-- Add Audio and Editing Metadata to Reels
-- Supports Spotify search, internal file uploads, and editing offsets
-- ============================================================

ALTER TABLE reels ADD COLUMN IF NOT EXISTS audio_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index on audio_metadata source for query filtering/analytics if needed
CREATE INDEX IF NOT EXISTS idx_reels_audio_source ON reels ((audio_metadata->>'source'));
