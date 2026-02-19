-- Migration: Create marketplace_transactions table
-- Description: Stores history of artwork purchases and sales for the marketplace

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Buyer
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Seller (optional if system sale)
    artwork_id UUID, -- Reference to artworks table (assuming it exists or will exist)
    artwork_title TEXT NOT NULL,
    artwork_image TEXT,
    amount DECIMAL(20, 9) NOT NULL, -- Supports crypto precision
    currency TEXT NOT NULL DEFAULT 'SOL', -- 'SOL', 'ETH', 'USDC'
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    tx_hash TEXT, -- Blockchain transaction hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance (Anti-Throttling)
CREATE INDEX idx_marketplace_transactions_user_id ON public.marketplace_transactions(user_id);
CREATE INDEX idx_marketplace_transactions_seller_id ON public.marketplace_transactions(seller_id);
CREATE INDEX idx_marketplace_transactions_created_at ON public.marketplace_transactions(created_at DESC);

-- Enable RLS (Security)
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own purchases
CREATE POLICY "Users can view their own purchases"
ON public.marketplace_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Sellers can see their own sales
CREATE POLICY "Sellers can view their own sales"
ON public.marketplace_transactions
FOR SELECT
USING (auth.uid() = seller_id);

-- Policy: Service role can manage all
CREATE POLICY "Service role can manage all transactions"
ON public.marketplace_transactions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.marketplace_transactions TO authenticated;
GRANT SELECT ON public.marketplace_transactions TO service_role;
