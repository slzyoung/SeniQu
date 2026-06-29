-- ============================================================
-- Migration: Add Profile Background Support
-- Description: Adds profile_background_url column to users table
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_background_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.users.profile_background_url IS 'URL of the user profile cover/background image.';
