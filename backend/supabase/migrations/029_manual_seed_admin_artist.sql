-- ============================================================
-- MANUAL SEED DATA: Admin and Artist Accounts
-- ============================================================
-- This script creates a dummy admin and an artist account.
-- Default Password for both accounts: Idaen147& (bcrypt hashed with cost 12)

-- 1. Create a dummy Artist account
INSERT INTO users (
    email,
    password_hash,
    username,
    display_name,
    role,
    is_verified,
    is_active
) VALUES (
    'artist_manual@seniqu.com',
    '$2a$12$tHK5XPtZmclw/rJ.B39H8.N0RyK3VjUEVhypcpo0LFZ2LYM9cpS0a',
    'artist_manual',
    'Seniqu Manual Artist',
    'artist',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();


-- 2. Create a dummy Admin account
INSERT INTO users (
    email,
    password_hash,
    username,
    display_name,
    role,
    admin_role,
    is_verified,
    is_active
) VALUES (
    'admin_manual@seniqu.com',
    '$2a$12$tHK5XPtZmclw/rJ.B39H8.N0RyK3VjUEVhypcpo0LFZ2LYM9cpS0a', 
    'admin_manual',
    'Seniqu Manual Admin',
    'admin',
    'ADMIN',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    admin_role = 'ADMIN',
    updated_at = NOW();

-- Note: You can change the email, username, and display_name as needed before running this script.
