-- ============================================================
-- Migration 051: Grant Photography Permissions
-- Grant table-level permissions for new photography tables
-- ============================================================

-- STEP 1: Grant SELECT to anon and authenticated roles for public readability
GRANT SELECT ON TABLE public.photos TO anon, authenticated;
GRANT SELECT ON TABLE public.photo_collections TO anon, authenticated;
GRANT SELECT ON TABLE public.photo_collection_items TO anon, authenticated;
GRANT SELECT ON TABLE public.photo_likes TO anon, authenticated;
GRANT SELECT ON TABLE public.photo_comments TO anon, authenticated;
GRANT SELECT ON TABLE public.photo_edits TO authenticated;
GRANT SELECT ON TABLE public.photo_purchases TO authenticated;

-- STEP 2: Grant INSERT, UPDATE, DELETE to authenticated users
GRANT INSERT, UPDATE, DELETE ON TABLE public.photos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_collection_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_likes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_comments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_edits TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_purchases TO authenticated;

-- STEP 3: Grant ALL to service_role (bypasses RLS)
GRANT ALL ON TABLE public.photos TO service_role;
GRANT ALL ON TABLE public.photo_collections TO service_role;
GRANT ALL ON TABLE public.photo_collection_items TO service_role;
GRANT ALL ON TABLE public.photo_likes TO service_role;
GRANT ALL ON TABLE public.photo_comments TO service_role;
GRANT ALL ON TABLE public.photo_edits TO service_role;
GRANT ALL ON TABLE public.photo_purchases TO service_role;
