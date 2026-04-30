-- ============================================================
-- MIGRATION 044: ENTERPRISE ADMIN RBAC SYSTEM
-- Part 1: Role Types, Permissions, Activity Log, Security
-- Date: 2026-04-28
-- ============================================================

-- ============================================================
-- SECTION 1: ADMIN ROLE TYPE ENUM
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_type') THEN
        CREATE TYPE admin_role_type AS ENUM (
            'SUPER_ADMIN',
            'PLATFORM_ADMIN',
            'MUSEUM_ADMIN',
            'GALLERY_ADMIN',
            'HERITAGE_ADMIN',
            'ARTIST_ADMIN',
            'CONTENT_MODERATOR'
        );
        RAISE NOTICE 'Created admin_role_type ENUM';
    END IF;
END $$;

-- Migrate existing admin_role VARCHAR to ENUM
-- First, normalize existing values
UPDATE users SET admin_role = 'SUPER_ADMIN' WHERE admin_role = 'ADMIN';
UPDATE users SET admin_role = 'SUPER_ADMIN' WHERE role IN ('super_admin') AND admin_role IS NULL;
UPDATE users SET admin_role = 'PLATFORM_ADMIN' WHERE role = 'admin' AND admin_role IS NULL;

-- Add typed column alongside existing one
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role_typed admin_role_type;

-- Copy valid values
DO $$
BEGIN
    UPDATE users SET admin_role_typed = admin_role::admin_role_type
    WHERE admin_role IS NOT NULL
      AND admin_role IN ('SUPER_ADMIN','PLATFORM_ADMIN','MUSEUM_ADMIN','GALLERY_ADMIN','HERITAGE_ADMIN','ARTIST_ADMIN','CONTENT_MODERATOR');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not migrate admin_role values: %', SQLERRM;
END $$;

-- Add admin_scope_id: links domain admin to their managed entity
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_scope_id UUID REFERENCES institutions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_admin_role_typed ON users(admin_role_typed) WHERE admin_role_typed IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_admin_scope ON users(admin_scope_id) WHERE admin_scope_id IS NOT NULL;

COMMENT ON COLUMN users.admin_role_typed IS 'Typed admin role ENUM. Replaces legacy admin_role VARCHAR.';
COMMENT ON COLUMN users.admin_scope_id IS 'For domain admins: the institution they are scoped to manage.';

-- ============================================================
-- SECTION 2: ADMIN PERMISSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_role admin_role_type NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_role, permission_key)
);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_perms_service ON admin_permissions;
CREATE POLICY admin_perms_service ON admin_permissions
    FOR ALL USING (current_setting('role', true) = 'service_role');
DROP POLICY IF EXISTS admin_perms_admin_read ON admin_permissions;
CREATE POLICY admin_perms_admin_read ON admin_permissions
    FOR SELECT USING (is_admin());

-- Seed: SUPER_ADMIN gets wildcard
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('SUPER_ADMIN', '*', 'Full access to all resources and operations')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: PLATFORM_ADMIN
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('PLATFORM_ADMIN', 'admin:dashboard', 'View admin dashboard'),
    ('PLATFORM_ADMIN', 'admin:users', 'Manage users'),
    ('PLATFORM_ADMIN', 'admin:roles', 'Manage user roles'),
    ('PLATFORM_ADMIN', 'admin:logs', 'View system logs'),
    ('PLATFORM_ADMIN', 'admin:reports', 'Manage reports'),
    ('PLATFORM_ADMIN', 'admin:alerts', 'Manage system alerts'),
    ('PLATFORM_ADMIN', 'admin:health', 'View system health'),
    ('PLATFORM_ADMIN', 'admin:partnerships', 'Manage partnerships'),
    ('PLATFORM_ADMIN', 'admin:premium', 'Manage premium subscriptions'),
    ('PLATFORM_ADMIN', 'admin:marketplace', 'Oversee marketplace'),
    ('PLATFORM_ADMIN', 'institution:read', 'View institutions'),
    ('PLATFORM_ADMIN', 'institution:update', 'Update institutions'),
    ('PLATFORM_ADMIN', 'institution:verify', 'Verify institutions'),
    ('PLATFORM_ADMIN', 'artwork:read', 'View artworks'),
    ('PLATFORM_ADMIN', 'artwork:update', 'Update artworks'),
    ('PLATFORM_ADMIN', 'artwork:verify', 'Verify artworks'),
    ('PLATFORM_ADMIN', 'content:moderate', 'Moderate content'),
    ('PLATFORM_ADMIN', 'admin:wallets', 'Manage wallets and finances')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: MUSEUM_ADMIN
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('MUSEUM_ADMIN', 'admin:dashboard', 'View admin dashboard'),
    ('MUSEUM_ADMIN', 'institution:read', 'View own museum'),
    ('MUSEUM_ADMIN', 'institution:update', 'Update own museum'),
    ('MUSEUM_ADMIN', 'artwork:create', 'Create artworks'),
    ('MUSEUM_ADMIN', 'artwork:read', 'View artworks'),
    ('MUSEUM_ADMIN', 'artwork:update', 'Update artworks'),
    ('MUSEUM_ADMIN', 'artwork:publish', 'Publish artworks'),
    ('MUSEUM_ADMIN', 'admin:alerts', 'View alerts')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: GALLERY_ADMIN
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('GALLERY_ADMIN', 'admin:dashboard', 'View admin dashboard'),
    ('GALLERY_ADMIN', 'institution:read', 'View own gallery'),
    ('GALLERY_ADMIN', 'institution:update', 'Update own gallery'),
    ('GALLERY_ADMIN', 'artwork:create', 'Create artworks'),
    ('GALLERY_ADMIN', 'artwork:read', 'View artworks'),
    ('GALLERY_ADMIN', 'artwork:update', 'Update artworks'),
    ('GALLERY_ADMIN', 'artwork:publish', 'Publish artworks'),
    ('GALLERY_ADMIN', 'collection:manage', 'Manage collections'),
    ('GALLERY_ADMIN', 'admin:marketplace', 'View marketplace'),
    ('GALLERY_ADMIN', 'admin:alerts', 'View alerts')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: HERITAGE_ADMIN
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('HERITAGE_ADMIN', 'admin:dashboard', 'View admin dashboard'),
    ('HERITAGE_ADMIN', 'institution:read', 'View own heritage site'),
    ('HERITAGE_ADMIN', 'institution:update', 'Update own heritage site'),
    ('HERITAGE_ADMIN', 'artwork:create', 'Create artworks'),
    ('HERITAGE_ADMIN', 'artwork:read', 'View artworks'),
    ('HERITAGE_ADMIN', 'artwork:update', 'Update artworks'),
    ('HERITAGE_ADMIN', 'admin:alerts', 'View alerts')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: ARTIST_ADMIN
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('ARTIST_ADMIN', 'admin:dashboard', 'View admin dashboard'),
    ('ARTIST_ADMIN', 'artwork:create', 'Create artworks'),
    ('ARTIST_ADMIN', 'artwork:read', 'View artworks'),
    ('ARTIST_ADMIN', 'artwork:update', 'Update artworks'),
    ('ARTIST_ADMIN', 'artwork:publish', 'Publish artworks'),
    ('ARTIST_ADMIN', 'artwork:delete', 'Delete own artworks'),
    ('ARTIST_ADMIN', 'collection:manage', 'Manage collections'),
    ('ARTIST_ADMIN', 'art:mint', 'Mint arts'),
    ('ARTIST_ADMIN', 'admin:alerts', 'View alerts')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

-- Seed: CONTENT_MODERATOR
INSERT INTO admin_permissions (admin_role, permission_key, description) VALUES
    ('CONTENT_MODERATOR', 'admin:dashboard', 'View admin dashboard'),
    ('CONTENT_MODERATOR', 'artwork:read', 'View artworks'),
    ('CONTENT_MODERATOR', 'artwork:verify', 'Verify artworks'),
    ('CONTENT_MODERATOR', 'content:moderate', 'Moderate content'),
    ('CONTENT_MODERATOR', 'content:delete', 'Delete violating content'),
    ('CONTENT_MODERATOR', 'admin:reports', 'Manage reports'),
    ('CONTENT_MODERATOR', 'admin:logs', 'View logs'),
    ('CONTENT_MODERATOR', 'admin:alerts', 'View alerts')
ON CONFLICT (admin_role, permission_key) DO NOTHING;

COMMENT ON TABLE admin_permissions IS 'Normalized admin role → permission mapping. Source of truth for RBAC.';

-- ============================================================
-- SECTION 3: ADMIN ACTIVITY AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    admin_role admin_role_type NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    session_fingerprint VARCHAR(64),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'failure', 'denied')),
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_date ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_role ON admin_activity_log(admin_role, created_at DESC);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_activity_service ON admin_activity_log;
CREATE POLICY admin_activity_service ON admin_activity_log
    FOR ALL USING (current_setting('role', true) = 'service_role');
DROP POLICY IF EXISTS admin_activity_super_read ON admin_activity_log;
CREATE POLICY admin_activity_super_read ON admin_activity_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND admin_role_typed = 'SUPER_ADMIN')
    );
DROP POLICY IF EXISTS admin_activity_own_read ON admin_activity_log;
CREATE POLICY admin_activity_own_read ON admin_activity_log
    FOR SELECT USING (auth.uid() = admin_user_id);

COMMENT ON TABLE admin_activity_log IS 'Dedicated audit trail for all admin actions. Separate from general audit_logs for performance and compliance.';

-- ============================================================
-- SECTION 4: ADMIN SESSION SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_role admin_role_type NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    max_idle_minutes INTEGER NOT NULL DEFAULT 30,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_reason VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_session CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at) WHERE is_active = TRUE;

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_sessions_service ON admin_sessions;
CREATE POLICY admin_sessions_service ON admin_sessions
    FOR ALL USING (current_setting('role', true) = 'service_role');
DROP POLICY IF EXISTS admin_sessions_own ON admin_sessions;
CREATE POLICY admin_sessions_own ON admin_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Admin IP Whitelist (optional, for SUPER_ADMIN)
CREATE TABLE IF NOT EXISTS admin_ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_user_id, ip_address)
);

ALTER TABLE admin_ip_whitelist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_ip_wl_service ON admin_ip_whitelist;
CREATE POLICY admin_ip_wl_service ON admin_ip_whitelist
    FOR ALL USING (current_setting('role', true) = 'service_role');
DROP POLICY IF EXISTS admin_ip_wl_super ON admin_ip_whitelist;
CREATE POLICY admin_ip_wl_super ON admin_ip_whitelist
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND admin_role_typed = 'SUPER_ADMIN')
    );

-- ============================================================
-- SECTION 5: ENHANCED SECURITY FUNCTIONS
-- ============================================================

-- 5A. is_super_admin() — strict check
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND admin_role_typed = 'SUPER_ADMIN'
    );
END;
$$;

-- 5B. is_domain_admin() — check role + scope
CREATE OR REPLACE FUNCTION is_domain_admin(p_role admin_role_type, p_entity_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_entity_id IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND admin_role_typed = p_role
        );
    ELSE
        RETURN EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND admin_role_typed = p_role
            AND admin_scope_id = p_entity_id
        );
    END IF;
END;
$$;

-- 5C. has_admin_permission() — permission lookup
CREATE OR REPLACE FUNCTION has_admin_permission(p_permission VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role admin_role_type;
BEGIN
    SELECT admin_role_typed INTO v_role FROM users WHERE id = auth.uid();
    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role = 'SUPER_ADMIN' THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM admin_permissions
        WHERE admin_role = v_role
        AND (permission_key = p_permission OR permission_key = '*')
    );
END;
$$;

-- 5D. log_admin_activity()
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_id UUID, p_admin_role admin_role_type,
    p_action VARCHAR, p_target_type VARCHAR,
    p_target_id VARCHAR DEFAULT NULL,
    p_ip INET DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO admin_activity_log (
        admin_user_id, admin_role, action, target_type,
        target_id, ip_address, old_values, new_values, metadata
    ) VALUES (
        p_admin_id, p_admin_role, p_action, p_target_type,
        p_target_id, p_ip, p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- 5E. Update is_admin() to include domain admins
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND (
            role IN ('admin', 'super_admin')
            OR admin_role_typed IS NOT NULL
        )
    );
END;
$$;

-- 5F. admin_create_user() — allows SUPER_ADMIN to securely create admin/artist accounts
CREATE OR REPLACE FUNCTION admin_create_user(
    p_email VARCHAR,
    p_username VARCHAR,
    p_display_name VARCHAR,
    p_role user_role,
    p_admin_role admin_role_type DEFAULT NULL,
    p_scope_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_user_id UUID;
    v_caller_role admin_role_type;
BEGIN
    -- 1. Authorization
    SELECT admin_role_typed INTO v_caller_role FROM users WHERE id = auth.uid();
    IF v_caller_role IS NULL OR v_caller_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Access denied. Only SUPER_ADMIN can create admin users directly.';
    END IF;

    -- 2. Validation
    IF p_email IS NULL THEN
        RAISE EXCEPTION 'Email is required';
    END IF;
    
    IF p_admin_role IN ('MUSEUM_ADMIN', 'GALLERY_ADMIN', 'HERITAGE_ADMIN') AND p_scope_id IS NULL THEN
        RAISE EXCEPTION 'Domain admins must have a scope (institution_id)';
    END IF;

    -- 3. Insert User (matching frontend fields)
    INSERT INTO users (
        email, username, display_name, role, admin_role_typed, admin_scope_id, is_verified, is_active
    ) VALUES (
        p_email, p_username, p_display_name, p_role, p_admin_role, p_scope_id, TRUE, TRUE
    ) RETURNING id INTO v_new_user_id;

    -- 4. Audit Log
    PERFORM log_admin_activity(
        auth.uid(), v_caller_role,
        'create_user', 'users', v_new_user_id::VARCHAR,
        NULL, NULL, 
        jsonb_build_object('email', p_email, 'role', p_role, 'admin_role', p_admin_role, 'scope_id', p_scope_id)
    );

    RETURN v_new_user_id;
END;
$$;

-- 5G. admin_assign_role() — allows SUPER_ADMIN to promote/demote users
CREATE OR REPLACE FUNCTION admin_assign_role(
    p_target_user_id UUID,
    p_role user_role,
    p_admin_role admin_role_type DEFAULT NULL,
    p_scope_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role admin_role_type;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- 1. Authorization
    SELECT admin_role_typed INTO v_caller_role FROM users WHERE id = auth.uid();
    IF v_caller_role IS NULL OR v_caller_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Access denied. Only SUPER_ADMIN can assign admin roles.';
    END IF;

    -- 2. Validation
    IF p_admin_role IN ('MUSEUM_ADMIN', 'GALLERY_ADMIN', 'HERITAGE_ADMIN') AND p_scope_id IS NULL THEN
        RAISE EXCEPTION 'Domain admins must have a scope (institution_id)';
    END IF;
    
    -- 3. Get old values for audit
    SELECT jsonb_build_object(
        'role', role, 
        'admin_role_typed', admin_role_typed, 
        'admin_scope_id', admin_scope_id
    ) INTO v_old_values
    FROM users WHERE id = p_target_user_id;
    
    IF v_old_values IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- 4. Update User
    UPDATE users SET
        role = p_role,
        admin_role_typed = p_admin_role,
        admin_scope_id = p_scope_id,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- 5. Build new values for audit
    v_new_values := jsonb_build_object(
        'role', p_role, 
        'admin_role', p_admin_role, 
        'scope_id', p_scope_id
    );

    -- 6. Audit Log
    PERFORM log_admin_activity(
        auth.uid(), v_caller_role,
        'assign_role', 'users', p_target_user_id::VARCHAR,
        NULL, v_old_values, v_new_values
    );

    -- 7. Invalidate existing sessions for security
    UPDATE admin_sessions SET is_active = FALSE, revoked_reason = 'role_changed' 
    WHERE user_id = p_target_user_id AND is_active = TRUE;

    RETURN TRUE;
END;
$$;

-- ============================================================
-- SECTION 6: HERITAGE TYPE + INSTITUTION TYPE UPDATE
-- ============================================================

-- Ensure 'heritage' is a valid institution type
-- The column is VARCHAR(50), so we just need to update any CHECK constraints
DO $$
BEGIN
    -- Add a comment documenting valid types
    COMMENT ON COLUMN institutions.type IS 'Institution type: museum, gallery, studio, heritage';
END $$;

-- Index for heritage queries
CREATE INDEX IF NOT EXISTS idx_institutions_type ON institutions(type);

-- ============================================================
-- SECTION 7: ANTI-THROTTLING FOR ADMIN ENDPOINTS
-- ============================================================

INSERT INTO rate_limit_config (role, endpoint_pattern, max_requests, window_seconds) VALUES
    ('SUPER_ADMIN',       '/admin/*',       500, 60),
    ('PLATFORM_ADMIN',    '/admin/*',       300, 60),
    ('MUSEUM_ADMIN',      '/admin/*',       120, 60),
    ('GALLERY_ADMIN',     '/admin/*',       120, 60),
    ('HERITAGE_ADMIN',    '/admin/*',       120, 60),
    ('ARTIST_ADMIN',      '/admin/*',       120, 60),
    ('CONTENT_MODERATOR', '/admin/*',       100, 60),
    ('SUPER_ADMIN',       '/admin/users/*/suspend',  10, 60),
    ('SUPER_ADMIN',       '/admin/users/*/role',     10, 60),
    ('PLATFORM_ADMIN',    '/admin/users/*/suspend',  10, 60)
ON CONFLICT (role, endpoint_pattern) DO NOTHING;

-- ============================================================
-- SECTION 8: RLS FOR DOMAIN ADMINS ON INSTITUTIONS
-- ============================================================

-- Museum admins can view/update their scoped museums
DROP POLICY IF EXISTS museum_admin_read ON institutions;
CREATE POLICY museum_admin_read ON institutions
    FOR SELECT USING (
        type = 'museum' AND is_domain_admin('MUSEUM_ADMIN', id)
    );
DROP POLICY IF EXISTS museum_admin_update ON institutions;
CREATE POLICY museum_admin_update ON institutions
    FOR UPDATE USING (
        type = 'museum' AND is_domain_admin('MUSEUM_ADMIN', id)
    );

-- Gallery admins
DROP POLICY IF EXISTS gallery_admin_read ON institutions;
CREATE POLICY gallery_admin_read ON institutions
    FOR SELECT USING (
        type = 'gallery' AND is_domain_admin('GALLERY_ADMIN', id)
    );
DROP POLICY IF EXISTS gallery_admin_update ON institutions;
CREATE POLICY gallery_admin_update ON institutions
    FOR UPDATE USING (
        type = 'gallery' AND is_domain_admin('GALLERY_ADMIN', id)
    );

-- Heritage admins
DROP POLICY IF EXISTS heritage_admin_read ON institutions;
CREATE POLICY heritage_admin_read ON institutions
    FOR SELECT USING (
        type = 'heritage' AND is_domain_admin('HERITAGE_ADMIN', id)
    );
DROP POLICY IF EXISTS heritage_admin_update ON institutions;
CREATE POLICY heritage_admin_update ON institutions
    FOR UPDATE USING (
        type = 'heritage' AND is_domain_admin('HERITAGE_ADMIN', id)
    );

-- ============================================================
-- SECTION 9: DASHBOARD VIEWS PER ADMIN ROLE
-- ============================================================

CREATE OR REPLACE VIEW admin_museum_dashboard_stats
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM institutions WHERE type = 'museum') AS total_museums,
    (SELECT COUNT(*) FROM institutions WHERE type = 'museum' AND is_verified = TRUE) AS verified_museums,
    (SELECT COUNT(*) FROM institutions WHERE type = 'museum' AND is_verified = FALSE) AS pending_museums,
    (SELECT COUNT(*) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'museum' AND a.status = 'published') AS total_artworks,
    (SELECT COALESCE(SUM(a.views), 0) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'museum') AS total_views;

CREATE OR REPLACE VIEW admin_gallery_dashboard_stats
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM institutions WHERE type = 'gallery') AS total_galleries,
    (SELECT COUNT(*) FROM institutions WHERE type = 'gallery' AND is_verified = TRUE) AS verified_galleries,
    (SELECT COUNT(*) FROM institutions WHERE type = 'gallery' AND is_verified = FALSE) AS pending_galleries,
    (SELECT COUNT(*) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'gallery' AND a.status = 'published') AS total_artworks,
    (SELECT COALESCE(SUM(a.views), 0) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'gallery') AS total_views;

CREATE OR REPLACE VIEW admin_heritage_dashboard_stats
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM institutions WHERE type = 'heritage') AS total_heritage_sites,
    (SELECT COUNT(*) FROM institutions WHERE type = 'heritage' AND is_verified = TRUE) AS verified_sites,
    (SELECT COUNT(*) FROM institutions WHERE type = 'heritage' AND is_verified = FALSE) AS pending_sites,
    (SELECT COUNT(*) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'heritage' AND a.status = 'published') AS total_artworks,
    (SELECT COALESCE(SUM(a.views), 0) FROM artworks a JOIN institutions i ON a.institution_id = i.id WHERE i.type = 'heritage') AS total_views;

CREATE OR REPLACE VIEW admin_artist_dashboard_stats
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'artist' AND is_active = TRUE) AS total_artists,
    (SELECT COUNT(*) FROM artworks WHERE status = 'published') AS total_artworks,
    (SELECT COUNT(*) FROM artworks WHERE status = 'pending_review') AS pending_review,
    (SELECT COALESCE(SUM(views), 0) FROM artworks) AS total_views,
    (SELECT COALESCE(SUM(likes), 0) FROM artworks) AS total_likes;

CREATE OR REPLACE VIEW admin_wallet_dashboard_stats
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_premium = TRUE) AS total_premium_users,
    (SELECT COALESCE(SUM(price), 0) FROM art_transactions WHERE type = 'sale') AS total_transaction_volume,
    (SELECT COUNT(*) FROM art_transactions) AS total_transactions;

-- ============================================================
-- SECTION 10: CLEANUP FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_admin_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_activity_deleted INTEGER;
    v_sessions_deleted INTEGER;
BEGIN
    -- Clean activity logs > 365 days (keep SUPER_ADMIN 5 years)
    DELETE FROM admin_activity_log
    WHERE created_at < NOW() - INTERVAL '365 days'
      AND admin_role != 'SUPER_ADMIN';
    GET DIAGNOSTICS v_activity_deleted = ROW_COUNT;

    DELETE FROM admin_activity_log
    WHERE created_at < NOW() - INTERVAL '5 years'
      AND admin_role = 'SUPER_ADMIN';

    -- Clean expired admin sessions
    UPDATE admin_sessions SET is_active = FALSE, revoked_reason = 'expired'
    WHERE is_active = TRUE AND expires_at < NOW();
    GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'activity_logs_deleted', v_activity_deleted,
        'sessions_expired', v_sessions_deleted,
        'cleaned_at', NOW()
    );
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '  Migration 044: Enterprise Admin RBAC    ';
    RAISE NOTICE '  - admin_role_type ENUM created          ';
    RAISE NOTICE '  - admin_permissions table seeded        ';
    RAISE NOTICE '  - admin_activity_log table created      ';
    RAISE NOTICE '  - admin_sessions table created          ';
    RAISE NOTICE '  - admin_ip_whitelist table created       ';
    RAISE NOTICE '  - Security functions updated            ';
    RAISE NOTICE '  - admin_create_user & admin_assign_role added ';
    RAISE NOTICE '  - Domain admin RLS policies added       ';
    RAISE NOTICE '  - Heritage type support added           ';
    RAISE NOTICE '  - Dashboard views per role created      ';
    RAISE NOTICE '  - Admin rate limits configured          ';
    RAISE NOTICE '==========================================';
END $$;
