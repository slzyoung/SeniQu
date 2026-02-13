-- Diagnostic: Find users with missing embedded wallets (assuming every user should have 2: Solana + Eth)

WITH user_wallets AS (
    SELECT 
        user_id,
        COUNT(*) as wallet_count,
        SUM(CASE WHEN chain_type = 'solana' THEN 1 ELSE 0 END) as solana_count,
        SUM(CASE WHEN chain_type = 'ethereum' THEN 1 ELSE 0 END) as ethereum_count
    FROM privy_wallets
    GROUP BY user_id
)
SELECT 
    u.id as user_id,
    u.email,
    COALESCE(uw.wallet_count, 0) as total_wallets,
    COALESCE(uw.solana_count, 0) as solana_wallets,
    COALESCE(uw.ethereum_count, 0) as ethereum_wallets
FROM users u
LEFT JOIN user_wallets uw ON u.id = uw.user_id
WHERE 
    COALESCE(uw.solana_count, 0) = 0 
    OR COALESCE(uw.ethereum_count, 0) = 0;
