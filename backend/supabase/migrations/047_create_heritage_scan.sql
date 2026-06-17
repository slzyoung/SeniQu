-- Drop the existing table and its policies to resolve incorrect foreign key reference
DROP TABLE IF EXISTS heritage_scans CASCADE;

CREATE TABLE heritage_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT DEFAULT '',
    heritage_name TEXT NOT NULL DEFAULT 'Unknown',
    heritage_type TEXT NOT NULL DEFAULT 'Unknown',
    confidence INTEGER DEFAULT 0,
    result JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for daily quota counting (user + date range queries)
CREATE INDEX IF NOT EXISTS idx_heritage_scans_user_date
    ON heritage_scans (user_id, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE heritage_scans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own scans
CREATE POLICY "Users can view own scans"
    ON heritage_scans FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can insert (backend uses service role key)
CREATE POLICY "Service role can insert scans"
    ON heritage_scans FOR INSERT
    WITH CHECK (true);

-- Policy: Service role can select all (for admin)
CREATE POLICY "Service role can select all scans"
    ON heritage_scans FOR SELECT
    USING (true);
