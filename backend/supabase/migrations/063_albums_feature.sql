-- ============================================================
-- Migration 063: Albums Feature
-- Separate albums system independent from collections/photo_collections
-- ============================================================

-- Albums table (user-created albums for artworks/photos/digital art)
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT,
    theme VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT true,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Album items table (photos/artworks/digital art inside albums)
CREATE TABLE IF NOT EXISTS public.album_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) DEFAULT 'photo',  -- 'photo', 'artwork', 'digital_art'
    original_url TEXT NOT NULL,
    medium_url TEXT,
    thumbnail_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    is_public BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_is_public ON public.albums(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_items_album_id ON public.album_items(album_id);
CREATE INDEX IF NOT EXISTS idx_album_items_user_id ON public.album_items(user_id);
CREATE INDEX IF NOT EXISTS idx_album_items_is_public ON public.album_items(is_public) WHERE is_public = true;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_items ENABLE ROW LEVEL SECURITY;

-- Albums policies
DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
CREATE POLICY "Public albums are viewable by everyone" ON public.albums
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own albums" ON public.albums;
CREATE POLICY "Users can view own albums" ON public.albums
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own albums" ON public.albums;
CREATE POLICY "Users can create own albums" ON public.albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own albums" ON public.albums;
CREATE POLICY "Users can update own albums" ON public.albums
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own albums" ON public.albums;
CREATE POLICY "Users can delete own albums" ON public.albums
    FOR DELETE USING (auth.uid() = user_id);

-- Album items policies
DROP POLICY IF EXISTS "Public album items are viewable" ON public.album_items;
CREATE POLICY "Public album items are viewable" ON public.album_items
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own album items" ON public.album_items;
CREATE POLICY "Users can view own album items" ON public.album_items
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own album items" ON public.album_items;
CREATE POLICY "Users can insert own album items" ON public.album_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own album items" ON public.album_items;
CREATE POLICY "Users can update own album items" ON public.album_items
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own album items" ON public.album_items;
CREATE POLICY "Users can delete own album items" ON public.album_items
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Triggers (updated_at auto-update)
-- ============================================================
DROP TRIGGER IF EXISTS trigger_albums_updated_at ON public.albums;
CREATE TRIGGER trigger_albums_updated_at
    BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_album_items_updated_at ON public.album_items;
CREATE TRIGGER trigger_album_items_updated_at
    BEFORE UPDATE ON public.album_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Permissions
-- ============================================================
GRANT ALL ON public.albums TO authenticated;
GRANT SELECT ON public.albums TO anon;
GRANT ALL ON public.album_items TO authenticated;
GRANT SELECT ON public.album_items TO anon;
GRANT ALL ON public.albums TO service_role;
GRANT ALL ON public.album_items TO service_role;

-- ============================================================
-- DONE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Migration 063: Albums Feature          ';
    RAISE NOTICE '  - Created albums table                 ';
    RAISE NOTICE '  - Created album_items table            ';
    RAISE NOTICE '  - Added indexes, RLS, triggers         ';
    RAISE NOTICE '========================================';
END $$;
