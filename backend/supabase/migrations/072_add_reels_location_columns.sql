-- ============================================================
-- Add Location Tagging Columns to Reels
-- Supports heritage location tagging (name, latitude, longitude)
-- ============================================================

ALTER TABLE reels ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE reels ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE reels ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Index for location filtering
CREATE INDEX IF NOT EXISTS idx_reels_location ON reels (location_lat, location_lng) WHERE location_lat IS NOT NULL;
