-- Migration: 042_create_ai_artworks.sql
-- Description: Creates the ai_artworks table for storing generated art and prompts.

CREATE TABLE IF NOT EXISTS public.ai_artworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_url TEXT,
    style VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    visibility VARCHAR(50) DEFAULT 'private', -- private, public
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying user history
CREATE INDEX IF NOT EXISTS idx_ai_artworks_user_id ON public.ai_artworks(user_id);
-- Index for querying public community feed
CREATE INDEX IF NOT EXISTS idx_ai_artworks_visibility ON public.ai_artworks(visibility) WHERE visibility = 'public';

-- Enable RLS
ALTER TABLE public.ai_artworks ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can view their own AI artworks
CREATE POLICY "Users can view their own AI artworks"
    ON public.ai_artworks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Anyone can view public AI artworks
CREATE POLICY "Anyone can view public AI artworks"
    ON public.ai_artworks
    FOR SELECT
    USING (visibility = 'public');

-- Users can insert their own AI artworks
CREATE POLICY "Users can insert their own AI artworks"
    ON public.ai_artworks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own AI artworks
CREATE POLICY "Users can update their own AI artworks"
    ON public.ai_artworks
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own AI artworks
CREATE POLICY "Users can delete their own AI artworks"
    ON public.ai_artworks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.ai_artworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
