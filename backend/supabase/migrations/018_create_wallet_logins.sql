-- Create table for external wallet logins (Phantom, MetaMask, etc.)
CREATE TABLE IF NOT EXISTS wallet_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    chain_type VARCHAR(50) NOT NULL, -- 'solana', 'ethereum'
    provider_name VARCHAR(50), -- 'phantom', 'metamask', 'walletconnect'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, wallet_address, chain_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_logins_user_id ON wallet_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_logins_address ON wallet_logins(wallet_address);

-- RLS Policies
ALTER TABLE wallet_logins ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own login wallets
CREATE POLICY "Users can view own login wallets" 
ON wallet_logins FOR SELECT 
USING (auth.uid() = user_id);

-- Allow backend (service_role) to manage everything
-- (Implicitly allowed, but good to be explicit if needed, though service_role bypasses RLS)
