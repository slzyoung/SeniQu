-- Migration: Add user settings columns
-- Description: Adds detailed notification preferences (JSONB) and security flags to users table

-- 1. Add notification_prefs column (JSONB)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"email": true, "push": true, "weeklyDigest": true}'::jsonb;

-- 2. Add security flags
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS login_alerts_enabled BOOLEAN DEFAULT true;

-- 3. Comment on columns
COMMENT ON COLUMN public.users.notification_prefs IS 'JSON object storing detailed notification preferences';
COMMENT ON COLUMN public.users.is_two_factor_enabled IS 'Flag indicating if 2FA is enabled for the account';
