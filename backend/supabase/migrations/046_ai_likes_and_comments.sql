-- Migration: 046_ai_likes_and_comments.sql
-- Description: Creates the ai_artwork_likes and ai_artwork_comments tables for liking and commenting on AI artworks.

CREATE TABLE IF NOT EXISTS public.ai_artwork_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES public.ai_artworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(artwork_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.ai_artwork_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES public.ai_artworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_artwork_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_artwork_comments ENABLE ROW LEVEL SECURITY;

-- Policies for Likes
CREATE POLICY "Anyone can view likes" ON public.ai_artwork_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON public.ai_artwork_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.ai_artwork_likes FOR DELETE USING (auth.uid() = user_id);

-- Policies for Comments
CREATE POLICY "Anyone can view comments" ON public.ai_artwork_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON public.ai_artwork_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.ai_artwork_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.ai_artwork_comments FOR DELETE USING (auth.uid() = user_id);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ai_artwork_likes_artwork_id ON public.ai_artwork_likes(artwork_id);
CREATE INDEX IF NOT EXISTS idx_ai_artwork_comments_artwork_id ON public.ai_artwork_comments(artwork_id);
