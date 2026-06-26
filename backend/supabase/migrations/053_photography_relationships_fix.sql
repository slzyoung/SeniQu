-- ============================================================
-- Migration 053: Photography Relationships & Permissions Fix
-- Fixes foreign key references from auth.users to public.users
-- and adds SELECT policy to public.users so other users can
-- view photographer profiles.
-- ============================================================

-- 1. Update photos foreign key to reference public.users
ALTER TABLE IF EXISTS public.photos 
    DROP CONSTRAINT IF EXISTS photos_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photos_user_id;
ALTER TABLE IF EXISTS public.photos 
    ADD CONSTRAINT fk_photos_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Update photo_collections foreign key to reference public.users
ALTER TABLE IF EXISTS public.photo_collections 
    DROP CONSTRAINT IF EXISTS photo_collections_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_collections_user_id;
ALTER TABLE IF EXISTS public.photo_collections 
    ADD CONSTRAINT fk_photo_collections_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Update photo_likes foreign key to reference public.users
ALTER TABLE IF EXISTS public.photo_likes 
    DROP CONSTRAINT IF EXISTS photo_likes_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_likes_user_id;
ALTER TABLE IF EXISTS public.photo_likes 
    ADD CONSTRAINT fk_photo_likes_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Update photo_comments foreign key to reference public.users
ALTER TABLE IF EXISTS public.photo_comments 
    DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_comments_user_id;
ALTER TABLE IF EXISTS public.photo_comments 
    ADD CONSTRAINT fk_photo_comments_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Update photo_purchases foreign keys to reference public.users
ALTER TABLE IF EXISTS public.photo_purchases 
    DROP CONSTRAINT IF EXISTS photo_purchases_buyer_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_purchases_buyer_id,
    DROP CONSTRAINT IF EXISTS photo_purchases_seller_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_purchases_seller_id;
ALTER TABLE IF EXISTS public.photo_purchases 
    ADD CONSTRAINT fk_photo_purchases_buyer_id FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_photo_purchases_seller_id FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 6. Update photo_requests foreign key to reference public.users
ALTER TABLE IF EXISTS public.photo_requests 
    DROP CONSTRAINT IF EXISTS photo_requests_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_requests_user_id;
ALTER TABLE IF EXISTS public.photo_requests 
    ADD CONSTRAINT fk_photo_requests_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 7. Update photo_request_submissions foreign key to reference public.users
ALTER TABLE IF EXISTS public.photo_request_submissions 
    DROP CONSTRAINT IF EXISTS photo_request_submissions_user_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_photo_request_submissions_user_id;
ALTER TABLE IF EXISTS public.photo_request_submissions 
    ADD CONSTRAINT fk_photo_request_submissions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 8. Add SELECT policy to public.users to allow profile visibility
DROP POLICY IF EXISTS users_read_public ON public.users;
CREATE POLICY users_read_public ON public.users 
    FOR SELECT USING (true);
