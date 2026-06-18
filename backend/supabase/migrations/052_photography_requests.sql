-- ============================================================
-- Migration 052: Photography Requests & Commissions
-- Support custom photography & editing request system
-- ============================================================

CREATE TABLE IF NOT EXISTS public.photo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'IDR',
    deadline TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.photo_request_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.photo_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    message TEXT,
    price DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.photo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_request_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for photo_requests
CREATE POLICY "Public photo requests viewable" ON public.photo_requests
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create request" ON public.photo_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own requests" ON public.photo_requests
    FOR ALL USING (auth.uid() = user_id);

-- Policies for photo_request_submissions
CREATE POLICY "Submissions viewable by request owner and submitter" ON public.photo_request_submissions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.photo_requests 
            WHERE id = request_id AND user_id = auth.uid()
        )
    );
CREATE POLICY "Authenticated users can submit response" ON public.photo_request_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own submissions" ON public.photo_request_submissions
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON TABLE public.photo_requests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_requests TO authenticated;
GRANT ALL ON TABLE public.photo_requests TO service_role;

GRANT SELECT ON TABLE public.photo_request_submissions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_request_submissions TO authenticated;
GRANT ALL ON TABLE public.photo_request_submissions TO service_role;
