-- ============================================================
-- SEED DATA: Test Users for Authentication
-- ============================================================
-- This migration creates test users for development/testing
-- Password: Idaen147& (bcrypt hashed with cost 12)

-- Insert user: siabang35@gmail.com with role 'user'
INSERT INTO users (
    email,
    password_hash,
    display_name,
    role,
    is_verified,
    is_active
) VALUES (
    'user',
    'xx',
    'User',
    'user',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Also create test users for other roles (same password: Idaen147&)
-- Test Artist
INSERT INTO users (
    email,
    password_hash,
    display_name,
    role,
    is_verified,
    is_active
) VALUES (
    'artist',
    'xxxx',
    'Test Artist',
    'artist',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Test Admin
INSERT INTO users (
    email,
    password_hash,
    display_name,
    role,
    admin_role,
    is_verified,
    is_active
) VALUES (
    'admin',
    '"xx",
    'Test Admin',
    'admin',
    'ADMIN',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    admin_role = 'ADMIN',
    updated_at = NOW();
