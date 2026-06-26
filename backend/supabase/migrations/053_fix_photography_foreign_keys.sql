-- ============================================================
-- Migration 053: Fix Photography Foreign Keys and Grants
-- Fixes "Could not find a relationship between 'photos' and 'user_id' in the schema cache"
-- Fixes "permission denied for table users"
-- ============================================================

-- 1. Table: photos
ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;
ALTER TABLE public.photos
    ADD CONSTRAINT photos_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 2. Table: photo_collections
ALTER TABLE public.photo_collections DROP CONSTRAINT IF EXISTS photo_collections_user_id_fkey;
ALTER TABLE public.photo_collections
    ADD CONSTRAINT photo_collections_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 3. Table: photo_likes
ALTER TABLE public.photo_likes DROP CONSTRAINT IF EXISTS photo_likes_user_id_fkey;
ALTER TABLE public.photo_likes
    ADD CONSTRAINT photo_likes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 4. Table: photo_comments
ALTER TABLE public.photo_comments DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;
ALTER TABLE public.photo_comments
    ADD CONSTRAINT photo_comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 5. Table: photo_edits
ALTER TABLE public.photo_edits DROP CONSTRAINT IF EXISTS photo_edits_user_id_fkey;
ALTER TABLE public.photo_edits
    ADD CONSTRAINT photo_edits_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 6. Table: photo_purchases
ALTER TABLE public.photo_purchases DROP CONSTRAINT IF EXISTS photo_purchases_buyer_id_fkey;
ALTER TABLE public.photo_purchases
    ADD CONSTRAINT photo_purchases_buyer_id_fkey 
    FOREIGN KEY (buyer_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.photo_purchases DROP CONSTRAINT IF EXISTS photo_purchases_seller_id_fkey;
ALTER TABLE public.photo_purchases
    ADD CONSTRAINT photo_purchases_seller_id_fkey 
    FOREIGN KEY (seller_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 7. Table: photo_requests
ALTER TABLE public.photo_requests DROP CONSTRAINT IF EXISTS photo_requests_user_id_fkey;
ALTER TABLE public.photo_requests
    ADD CONSTRAINT photo_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 8. Table: photo_request_submissions
ALTER TABLE public.photo_request_submissions DROP CONSTRAINT IF EXISTS photo_request_submissions_user_id_fkey;
ALTER TABLE public.photo_request_submissions
    ADD CONSTRAINT photo_request_submissions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

-- 9. Grant read access to the users table for anon & authenticated roles
GRANT SELECT ON TABLE public.users TO anon, authenticated;
