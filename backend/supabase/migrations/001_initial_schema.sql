-- ============================================================
-- SENIQU DATABASE SCHEMA - ENTERPRISE GRADE
-- Version: 1.0.0
-- Supabase PostgreSQL Compatible
-- OWASP Security Best Practices Applied
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geolocation

-- ============================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'user',
    'collector',
    'artist',
    'institution',
    'admin',
    'super_admin'
);

CREATE TYPE auth_provider AS ENUM (
    'local',
    'google',
    'github',
    'privy',
    'wallet'
);

CREATE TYPE artwork_status AS ENUM (
    'draft',
    'pending_review',
    'published',
    'archived',
    'rejected'
);

CREATE TYPE nft_status AS ENUM (
    'minting',
    'minted',
    'listed',
    'sold',
    'transferred',
    'burned'
);

CREATE TYPE transaction_type AS ENUM (
    'mint',
    'list',
    'buy',
    'transfer',
    'bid',
    'auction_end'
);

CREATE TYPE notification_type AS ENUM (
    'system',
    'artwork',
    'nft',
    'forum',
    'follow',
    'sale',
    'alert'
);

CREATE TYPE log_level AS ENUM (
    'debug',
    'info',
    'warn',
    'error',
    'critical'
);

CREATE TYPE report_status AS ENUM (
    'pending',
    'investigating',
    'resolved',
    'dismissed'
);

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    wallet_address VARCHAR(66) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security: Indexes for common queries
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- User Social Links
CREATE TABLE user_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- OAuth Accounts (for linking multiple providers)
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider auth_provider NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);

-- Sessions (for JWT refresh tokens and session management)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_active ON sessions(user_id, is_revoked, expires_at) 
    WHERE is_revoked = FALSE;

-- ============================================================
-- MUSEUMS & GALLERIES
-- ============================================================

CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'museum', -- museum, gallery, studio
    
    -- Address
    street VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Indonesia',
    
    -- Geolocation (PostGIS)
    location GEOGRAPHY(POINT, 4326),
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(320),
    website TEXT,
    
    -- Media
    logo_url TEXT,
    cover_image_url TEXT,
    images JSONB DEFAULT '[]'::JSONB,
    
    -- Business
    opening_hours JSONB,
    admission_fee DECIMAL(12, 2),
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    rating DECIMAL(2, 1) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    
    -- Stats
    total_artworks INTEGER DEFAULT 0,
    total_visitors INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_institutions_owner ON institutions(owner_id);
CREATE INDEX idx_institutions_slug ON institutions(slug);
CREATE INDEX idx_institutions_city ON institutions(city);
CREATE INDEX idx_institutions_location ON institutions USING GIST(location);
CREATE INDEX idx_institutions_verified ON institutions(is_verified) WHERE is_verified = TRUE;

-- ============================================================
-- ARTWORKS
-- ============================================================

CREATE TABLE artworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    description TEXT,
    
    -- Classification
    genres TEXT[] DEFAULT ARRAY[]::TEXT[],
    medium VARCHAR(100),
    style VARCHAR(100),
    period VARCHAR(100),
    
    -- Dimensions
    width_cm DECIMAL(8, 2),
    height_cm DECIMAL(8, 2),
    depth_cm DECIMAL(8, 2),
    
    -- Dates
    year_created INTEGER,
    date_acquired DATE,
    
    -- Pricing
    price DECIMAL(14, 2),
    currency VARCHAR(10) DEFAULT 'IDR',
    is_for_sale BOOLEAN DEFAULT FALSE,
    
    -- Media
    primary_image_url TEXT NOT NULL,
    images JSONB DEFAULT '[]'::JSONB,
    
    -- NFT
    is_nft BOOLEAN DEFAULT FALSE,
    nft_token_id VARCHAR(100),
    nft_contract_address VARCHAR(66),
    
    -- Status
    status artwork_status DEFAULT 'draft',
    
    -- Statistics
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    
    -- AI Detection
    ai_detected_genres JSONB,
    ai_confidence_score DECIMAL(3, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artworks_artist ON artworks(artist_id);
CREATE INDEX idx_artworks_institution ON artworks(institution_id);
CREATE INDEX idx_artworks_slug ON artworks(slug);
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_genres ON artworks USING GIN(genres);
CREATE INDEX idx_artworks_nft ON artworks(is_nft) WHERE is_nft = TRUE;
CREATE INDEX idx_artworks_search ON artworks USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================
-- COLLECTIONS & BOOKMARKS
-- ============================================================

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    artwork_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_public ON collections(is_public) WHERE is_public = TRUE;

CREATE TABLE collection_artworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(collection_id, artwork_id)
);

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, artwork_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================
-- NFT MARKETPLACE
-- ============================================================

CREATE TABLE nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    
    -- Blockchain
    token_id VARCHAR(100) NOT NULL,
    contract_address VARCHAR(66) NOT NULL,
    blockchain VARCHAR(50) DEFAULT 'ethereum',
    
    -- Ownership
    creator_id UUID NOT NULL REFERENCES users(id),
    current_owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Pricing
    price DECIMAL(20, 8),
    currency VARCHAR(10) DEFAULT 'ETH',
    
    -- Royalties
    royalty_percentage DECIMAL(4, 2) DEFAULT 10.00,
    
    -- Status
    status nft_status DEFAULT 'minting',
    is_listed BOOLEAN DEFAULT FALSE,
    listing_price DECIMAL(20, 8),
    
    -- Metadata
    metadata_uri TEXT,
    metadata_hash VARCHAR(66),
    
    minted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(token_id, contract_address)
);

CREATE INDEX idx_nfts_artwork ON nfts(artwork_id);
CREATE INDEX idx_nfts_creator ON nfts(creator_id);
CREATE INDEX idx_nfts_owner ON nfts(current_owner_id);
CREATE INDEX idx_nfts_listed ON nfts(is_listed) WHERE is_listed = TRUE;

CREATE TABLE nft_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id UUID NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
    
    transaction_type transaction_type NOT NULL,
    from_address VARCHAR(66),
    to_address VARCHAR(66),
    
    price DECIMAL(20, 8),
    currency VARCHAR(10),
    
    tx_hash VARCHAR(100) UNIQUE,
    block_number BIGINT,
    gas_used BIGINT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nft_tx_nft ON nft_transactions(nft_id);
CREATE INDEX idx_nft_tx_type ON nft_transactions(transaction_type);

-- ============================================================
-- COMMUNITY FORUM
-- ============================================================

CREATE TABLE forum_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    thread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    
    -- Tags
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Status
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Stats
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    last_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_category ON forum_threads(category_id);
CREATE INDEX idx_threads_author ON forum_threads(author_id);
CREATE INDEX idx_threads_slug ON forum_threads(slug);
CREATE INDEX idx_threads_tags ON forum_threads USING GIN(tags);
CREATE INDEX idx_threads_pinned ON forum_threads(is_pinned) WHERE is_pinned = TRUE;

CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    
    is_solution BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_thread ON forum_posts(thread_id);
CREATE INDEX idx_posts_author ON forum_posts(author_id);
CREATE INDEX idx_posts_parent ON forum_posts(parent_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Reference
    reference_id UUID,
    reference_type VARCHAR(50),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- ANALYTICS & AUDIT
-- ============================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    
    -- Context
    page_url TEXT,
    referrer TEXT,
    
    -- Device
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_date ON analytics_events(created_at);

-- Audit Logs (OWASP Compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Action
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    level log_level NOT NULL,
    source VARCHAR(100),
    message TEXT NOT NULL,
    context JSONB,
    stack_trace TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_syslogs_level ON system_logs(level);
CREATE INDEX idx_syslogs_source ON system_logs(source);
CREATE INDEX idx_syslogs_date ON system_logs(created_at);

-- ============================================================
-- ADMIN & REPORTS
-- ============================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    
    -- Target
    target_type VARCHAR(50) NOT NULL, -- 'artwork', 'user', 'thread', 'post'
    target_id UUID NOT NULL,
    
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_urls JSONB DEFAULT '[]'::JSONB,
    
    -- Status
    status report_status DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

-- System Alerts
CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity VARCHAR(50) DEFAULT 'info', -- info, warning, error, critical
    
    -- Target
    is_global BOOLEAN DEFAULT TRUE,
    target_roles user_role[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_active ON system_alerts(is_active) WHERE is_active = TRUE;

-- Partnerships
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100), -- sponsor, collaborator, affiliate
    description TEXT,
    
    -- Contact
    contact_name VARCHAR(100),
    contact_email VARCHAR(320),
    contact_phone VARCHAR(20),
    
    -- Contract
    start_date DATE,
    end_date DATE,
    contract_value DECIMAL(14, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    logo_url TEXT,
    website TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOLLOWERS & SOCIAL
-- ============================================================

CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    target_type VARCHAR(50) NOT NULL, -- 'artwork', 'thread', 'post'
    target_id UUID NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);

-- ============================================================
-- PREMIUM FEATURES
-- ============================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    plan_name VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    
    -- Billing
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Payment
    payment_method VARCHAR(50),
    last_payment_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_read_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id);

-- Public artworks are readable by everyone
CREATE POLICY artworks_read_public ON artworks
    FOR SELECT USING (status = 'published');

-- Artists can manage their own artworks
CREATE POLICY artworks_manage_own ON artworks
    FOR ALL USING (auth.uid() = artist_id);

-- Users can manage their own collections
CREATE POLICY collections_manage_own ON collections
    FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own bookmarks
CREATE POLICY bookmarks_manage_own ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Users can read their own notifications
CREATE POLICY notifications_read_own ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_institutions_updated_at
    BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_artworks_updated_at
    BEFORE UPDATE ON artworks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_collections_updated_at
    BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_nfts_updated_at
    BEFORE UPDATE ON nfts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_threads_updated_at
    BEFORE UPDATE ON forum_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment artwork count in collection
CREATE OR REPLACE FUNCTION update_collection_artwork_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections SET artwork_count = artwork_count + 1 WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections SET artwork_count = artwork_count - 1 WHERE id = OLD.collection_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collection_artwork_count
    AFTER INSERT OR DELETE ON collection_artworks
    FOR EACH ROW EXECUTE FUNCTION update_collection_artwork_count();

-- Increment thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_threads 
        SET reply_count = reply_count + 1, last_reply_at = NOW() 
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_threads SET reply_count = reply_count - 1 WHERE id = OLD.thread_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_thread_reply_count
    AFTER INSERT OR DELETE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- ============================================================
-- SEED DATA (Optional)
-- ============================================================

-- Default forum categories
INSERT INTO forum_categories (name, slug, description, icon, sort_order) VALUES
    ('Announcements', 'announcements', 'Official announcements from Seniqu', 'megaphone', 1),
    ('General Discussion', 'general', 'General art and culture discussions', 'message-square', 2),
    ('Indonesian Art', 'indonesian-art', 'Discuss Indonesian art heritage', 'palette', 3),
    ('NFT & Digital Art', 'nft-digital', 'NFT trading and digital art topics', 'coins', 4),
    ('Artist Showcase', 'showcase', 'Share your own artworks', 'image', 5),
    ('Help & Support', 'support', 'Get help from the community', 'help-circle', 6);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE users IS 'Core user accounts with role-based access control';
COMMENT ON TABLE institutions IS 'Museums and galleries with geolocation support';
COMMENT ON TABLE artworks IS 'Art pieces with AI detection and NFT support';
COMMENT ON TABLE nfts IS 'NFT tokens linked to artworks';
COMMENT ON TABLE audit_logs IS 'OWASP compliant audit trail for security';
COMMENT ON TABLE system_logs IS 'Application error and info logs';
