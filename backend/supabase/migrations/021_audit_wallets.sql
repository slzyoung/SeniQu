-- Diagnostic Audit: User Wallet State
-- Lists every user and their wallet counts/types from both tables

SELECT 
    u.id as user_id,
    u.email,
    u.display_name,
    
    -- Embedded Wallets (Verified Privy MPC)
    -- Should be 2 (Solana + Ethereum) for active users
    (SELECT COUNT(*) FROM privy_wallets pw WHERE pw.user_id = u.id) as embedded_count,
    ARRAY(SELECT chain_type || ':' || SUBSTRING(wallet_address, 1, 6) || '...' FROM privy_wallets pw WHERE pw.user_id = u.id) as embedded_wallets,

    -- External/Login Wallets (Phantom, Metamask, or Migrated)
    (SELECT COUNT(*) FROM wallet_logins wl WHERE wl.user_id = u.id) as login_count,
    ARRAY(SELECT provider_name || ':' || chain_type || ':' || SUBSTRING(wallet_address, 1, 6) || '...' FROM wallet_logins wl WHERE wl.user_id = u.id) as login_wallets,

    -- Duplicate Check: Wallets present in both (Redundant Migrated)
    ARRAY(
        SELECT pw.wallet_address 
        FROM privy_wallets pw 
        JOIN wallet_logins wl ON pw.wallet_address = wl.wallet_address AND pw.user_id = wl.user_id
        WHERE pw.user_id = u.id
    ) as redundant_wallets

FROM users u
ORDER BY u.created_at DESC;
