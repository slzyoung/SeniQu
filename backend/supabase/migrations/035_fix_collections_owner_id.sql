-- ============================================================
-- FIX: Backend expects collections.owner_id but table has user_id
-- Also: Backend expects "collection_items" but table is "collection_artworks"
-- ============================================================

-- ==========================================
-- STEP 1: Rename user_id -> owner_id
-- ==========================================
ALTER TABLE collections RENAME COLUMN user_id TO owner_id;

-- ==========================================
-- STEP 2: Rename index
-- ==========================================
ALTER INDEX IF EXISTS idx_collections_user RENAME TO idx_collections_owner;

-- ==========================================
-- STEP 3: Drop ALL existing policies on collections (they reference user_id)
-- ==========================================
DROP POLICY IF EXISTS collections_manage_own ON collections;
DROP POLICY IF EXISTS "Public collections viewable" ON collections;
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can manage own collections" ON collections;
DROP POLICY IF EXISTS collections_select_public ON collections;
DROP POLICY IF EXISTS collections_select_own ON collections;
DROP POLICY IF EXISTS collections_insert_own ON collections;
DROP POLICY IF EXISTS collections_update_own ON collections;
DROP POLICY IF EXISTS collections_delete_own ON collections;
DROP POLICY IF EXISTS service_role_collections ON collections;

-- ==========================================
-- STEP 4: Recreate policies using owner_id
-- ==========================================
CREATE POLICY "collections_select_public" ON collections
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "collections_select_own" ON collections
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "collections_insert_own" ON collections
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "collections_update_own" ON collections
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "collections_delete_own" ON collections
    FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "service_role_collections" ON collections
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- STEP 5: Fix collection_artworks policies (they also reference user_id)
-- ==========================================
DROP POLICY IF EXISTS "View collection artworks" ON collection_artworks;
CREATE POLICY "View collection artworks" ON collection_artworks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_artworks.collection_id
        AND (c.is_public = true OR c.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Manage collection artworks" ON collection_artworks;
CREATE POLICY "Manage collection artworks" ON collection_artworks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_artworks.collection_id
        AND c.owner_id = auth.uid()
    )
);

-- ==========================================
-- STEP 6: Create collection_items view (backend uses this name)
-- ==========================================
CREATE OR REPLACE VIEW collection_items AS
SELECT
    id,
    collection_id,
    artwork_id,
    added_at AS created_at
FROM collection_artworks;

-- Allow insert/delete through the view via INSTEAD OF triggers
CREATE OR REPLACE FUNCTION collection_items_insert_fn()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO collection_artworks (collection_id, artwork_id)
    VALUES (NEW.collection_id, NEW.artwork_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION collection_items_delete_fn()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM collection_artworks
    WHERE collection_id = OLD.collection_id AND artwork_id = OLD.artwork_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS collection_items_insert_trigger ON collection_items;
CREATE TRIGGER collection_items_insert_trigger
    INSTEAD OF INSERT ON collection_items
    FOR EACH ROW EXECUTE FUNCTION collection_items_insert_fn();

DROP TRIGGER IF EXISTS collection_items_delete_trigger ON collection_items;
CREATE TRIGGER collection_items_delete_trigger
    INSTEAD OF DELETE ON collection_items
    FOR EACH ROW EXECUTE FUNCTION collection_items_delete_fn();

-- ==========================================
-- STEP 7: Fix any views/functions that reference collections.user_id
-- ==========================================
-- Update the dashboard view that references c.user_id
DO $$
BEGIN
    -- Update admin_dashboard_stats if it references collections.user_id
    IF EXISTS (
        SELECT 1 FROM pg_views
        WHERE viewname = 'admin_dashboard_stats'
        AND definition LIKE '%collections%user_id%'
    ) THEN
        -- We just need to make sure queries still work.
        -- The RENAME COLUMN already updates the physical column, 
        -- but views may cache the old name. 
        -- Recreating dependent views would be ideal but we don't know exact definitions.
        RAISE NOTICE 'admin_dashboard_stats may need manual update if it breaks';
    END IF;
END $$;
