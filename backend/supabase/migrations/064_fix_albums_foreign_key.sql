-- ============================================================
-- Migration 064: Fix Albums Foreign Key Constraint
-- Change references from auth.users to public.users
-- ============================================================

-- 1. Drop existing foreign key constraints pointing to auth.users
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_user_id_fkey;
ALTER TABLE public.album_items DROP CONSTRAINT IF EXISTS album_items_user_id_fkey;

-- 2. Re-create foreign key constraints pointing to public.users
ALTER TABLE public.albums 
    ADD CONSTRAINT albums_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.album_items 
    ADD CONSTRAINT album_items_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;
