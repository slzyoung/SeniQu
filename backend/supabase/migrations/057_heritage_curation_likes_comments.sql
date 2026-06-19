-- Migration: 057_heritage_curation_likes_comments.sql
-- Description: Creates the heritage_curation_likes and heritage_curation_comments tables for liking and commenting on heritage curations.

-- Add likes_count and comments_count columns to heritage_curations if not exists
ALTER TABLE public.heritage_curations 
ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.heritage_curation_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curation_id UUID NOT NULL REFERENCES public.heritage_curations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(curation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.heritage_curation_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curation_id UUID NOT NULL REFERENCES public.heritage_curations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.heritage_curation_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heritage_curation_comments ENABLE ROW LEVEL SECURITY;

-- Policies for Likes
CREATE POLICY "Anyone can view curation likes" ON public.heritage_curation_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own curation likes" ON public.heritage_curation_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own curation likes" ON public.heritage_curation_likes FOR DELETE USING (auth.uid() = user_id);

-- Policies for Comments
CREATE POLICY "Anyone can view curation comments" ON public.heritage_curation_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own curation comments" ON public.heritage_curation_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own curation comments" ON public.heritage_curation_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own curation comments" ON public.heritage_curation_comments FOR DELETE USING (auth.uid() = user_id);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_heritage_curation_likes_curation_id ON public.heritage_curation_likes(curation_id);
CREATE INDEX IF NOT EXISTS idx_heritage_curation_comments_curation_id ON public.heritage_curation_comments(curation_id);
