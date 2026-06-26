-- ============================================================
-- Migration 054: Create Photo Offers Table
-- Supports "make offer" feature for marketplace interactions
-- using Solana (SOL) as primary currency
-- ============================================================

CREATE TABLE IF NOT EXISTS public.photo_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,6) NOT NULL, -- Supporting detailed SOL decimals (e.g. 0.05 SOL)
    currency VARCHAR(10) DEFAULT 'SOL',
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_photo_offers_photo_id ON public.photo_offers(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_offers_buyer_id ON public.photo_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_photo_offers_status ON public.photo_offers(status);

-- Enable RLS
ALTER TABLE public.photo_offers ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read offers they made or received on their photos
CREATE POLICY read_photo_offers ON public.photo_offers
    FOR SELECT
    USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.photos WHERE id = photo_id)
    );

-- Insert policy: authenticated users can make offers
CREATE POLICY insert_photo_offers ON public.photo_offers
    FOR INSERT
    WITH CHECK (
        auth.uid() = buyer_id
    );

-- Update policy: buyer can cancel/update; seller can accept/reject
CREATE POLICY update_photo_offers ON public.photo_offers
    FOR UPDATE
    USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.photos WHERE id = photo_id)
    );

-- Grant access to standard Supabase roles
GRANT ALL ON public.photo_offers TO postgres;
GRANT ALL ON public.photo_offers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_offers TO authenticated;
GRANT SELECT ON public.photo_offers TO anon;

-- Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE photo_offers;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
