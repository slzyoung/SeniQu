-- ============================================================
-- FIX: Revert collections.owner_id back to collections.user_id 
-- Backend UsersService expects 'user_id' for both inserts and selects.
-- Also add proper GRANTs to avoid permission denied on bookmarks.
-- ============================================================

-- ==========================================
-- STEP 1: Revert owner_id back to user_id
-- ==========================================
ALTER TABLE collections RENAME COLUMN owner_id TO user_id;

ALTER INDEX IF EXISTS idx_collections_owner RENAME TO idx_collections_user;

-- ==========================================
-- STEP 2: Drop policies using owner_id
-- ==========================================
DROP POLICY IF EXISTS "collections_select_public" ON collections;
DROP POLICY IF EXISTS "collections_select_own" ON collections;
DROP POLICY IF EXISTS "collections_insert_own" ON collections;
DROP POLICY IF EXISTS "collections_update_own" ON collections;
DROP POLICY IF EXISTS "collections_delete_own" ON collections;
DROP POLICY IF EXISTS "service_role_collections" ON collections;

-- ==========================================
-- STEP 3: Recreate policies for collections using user_id
-- ==========================================
CREATE POLICY "collections_select_public" ON collections
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "collections_select_own" ON collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "collections_insert_own" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_update_own" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "collections_delete_own" ON collections
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_collections" ON collections
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- STEP 4: Update collection_artworks policies
-- ==========================================
DROP POLICY IF EXISTS "View collection artworks" ON collection_artworks;
CREATE POLICY "View collection artworks" ON collection_artworks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_artworks.collection_id
        AND (c.is_public = true OR c.user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Manage collection artworks" ON collection_artworks;
CREATE POLICY "Manage collection artworks" ON collection_artworks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_artworks.collection_id
        AND c.user_id = auth.uid()
    )
);

-- ==========================================
-- STEP 5: Fix bookmarks permission denied
-- UsersService db.getClient() relies on table-level access before evaluating RLS.
-- Bookmarks were missing anon SELECT access, which blocked the client.
-- ==========================================
GRANT SELECT ON TABLE public.bookmarks TO anon;
