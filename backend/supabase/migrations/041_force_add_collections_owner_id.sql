-- ============================================================
-- FIX: Explicitly add owner_id to collections if it's missing
-- Sometimes previous renaming migrations fail if user_id doesn't exist
-- ============================================================

DO $$
BEGIN
    -- Check if owner_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='owner_id') THEN
        
        -- If user_id exists, rename it (Fallback for migration 035)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='user_id') THEN
            ALTER TABLE collections RENAME COLUMN user_id TO owner_id;
        ELSE
            -- Neither exists, so let's add owner_id directly
            ALTER TABLE collections ADD COLUMN owner_id UUID;
            
            -- If you have a users table referenced by id, let's try to add the FK constraint
            -- ALTER TABLE collections ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
            
            -- We don't enforce the constraint here just in case users is auth.users and we don't have exact schema details
        END IF;

    END IF;
END $$;
