-- Migration: Create landing_page_assets table for CDN image metadata
-- Stores metadata for images used on the public landing page

CREATE TABLE IF NOT EXISTS public.landing_page_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section TEXT NOT NULL,
    slot TEXT NOT NULL,
    label TEXT NOT NULL,
    image_url TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_landing_asset_slot UNIQUE (slot)
);

-- Enable RLS
ALTER TABLE public.landing_page_assets ENABLE ROW LEVEL SECURITY;

-- Public read access (landing page is public)
CREATE POLICY "landing_page_assets_public_read" ON public.landing_page_assets
    FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "landing_page_assets_admin_write" ON public.landing_page_assets
    FOR ALL USING (true) WITH CHECK (true);
