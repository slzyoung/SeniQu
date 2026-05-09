-- ============================================================
-- Email Verification & OTP Codes
-- ============================================================

-- Add email verification flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;

-- Auto-verify existing users and Google/Privy users
UPDATE users SET is_email_verified = true WHERE google_id IS NOT NULL;
UPDATE users SET is_email_verified = true WHERE privy_id IS NOT NULL;

-- Email verification tokens (for registration confirmation)
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

-- OTP codes (for login verification)
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON otp_codes(code);

-- Auto-cleanup expired records (runs on next query)
-- Supabase doesn't have native cron, so we clean up on insert via trigger
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
    DELETE FROM email_verifications WHERE expires_at < NOW() - INTERVAL '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_expired_otps ON otp_codes;
CREATE TRIGGER trg_cleanup_expired_otps
    AFTER INSERT ON otp_codes
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_otps();

-- Grant permissions
GRANT ALL ON email_verifications TO authenticated;
GRANT ALL ON email_verifications TO service_role;
GRANT ALL ON otp_codes TO authenticated;
GRANT ALL ON otp_codes TO service_role;
