-- Add google_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);

-- Update RLS policies if necessary (usually public profile/users table is readable)
-- Ensure the column is accessible to the service role (which backend uses)
