-- Create Heritage Curations Table
CREATE TABLE IF NOT EXISTS public.heritage_curations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL DEFAULT '',
    curation_name TEXT NOT NULL DEFAULT 'Untitled Archive',
    original_era TEXT DEFAULT 'Unknown',
    historical_significance TEXT DEFAULT '',
    restoration_steps JSONB DEFAULT '[]'::jsonb,
    color_palette TEXT[] DEFAULT ARRAY[]::text[],
    curation_description TEXT DEFAULT '',
    audio_script TEXT DEFAULT '',
    valuation_estimate TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_heritage_curations_user_date ON public.heritage_curations (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.heritage_curations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own curations" ON public.heritage_curations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert curations" ON public.heritage_curations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select all curations" ON public.heritage_curations
    FOR SELECT USING (true);
