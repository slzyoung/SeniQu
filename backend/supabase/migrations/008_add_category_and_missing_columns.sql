-- ============================================================
-- ADD MISSING COLUMNS TO ARTWORKS TABLE
-- Migration: 008_add_category_and_missing_columns.sql
-- Purpose: Add category, region, era, and dimensions columns to artworks table
-- ============================================================

-- Add new columns
ALTER TABLE artworks 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS era VARCHAR(100),
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);

-- Create indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_region ON artworks(region);
CREATE INDEX IF NOT EXISTS idx_artworks_era ON artworks(era);

-- Comment on columns
COMMENT ON COLUMN artworks.category IS 'Category of the artwork (e.g., Painting, Sculpture)';
COMMENT ON COLUMN artworks.region IS 'Region of origin (e.g., Southeast Asia, Europe)';
COMMENT ON COLUMN artworks.era IS 'Historical era (e.g., Modern, Renaissance)';
COMMENT ON COLUMN artworks.dimensions IS 'Physical dimensions of the artwork as a string';
