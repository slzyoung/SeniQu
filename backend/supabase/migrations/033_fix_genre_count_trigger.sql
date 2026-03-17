-- ============================================================
-- MIGRATION 033: FIX GENRE COUNT TRIGGER
-- Fixes "UPDATE requires a WHERE clause" pg_safeupdate error
-- Date: 2026-03-17
-- ============================================================

CREATE OR REPLACE FUNCTION update_genre_count()
RETURNS TRIGGER AS $$
DECLARE
    v_affected_genres TEXT[];
BEGIN
    -- Determine which genres need to be updated based on the operation
    IF TG_OP = 'INSERT' THEN
        -- Only update genres present in the new artwork
        v_affected_genres := NEW.genres;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Safely combine OLD.genres and NEW.genres, handling NULLs
        IF OLD.genres IS NULL AND NEW.genres IS NOT NULL THEN
            v_affected_genres := NEW.genres;
        ELSIF OLD.genres IS NOT NULL AND NEW.genres IS NULL THEN
            v_affected_genres := OLD.genres;
        ELSIF OLD.genres IS NOT NULL AND NEW.genres IS NOT NULL THEN
            -- Use ARRAY_CAT and ARRAY_AGG to get distinct values
            SELECT ARRAY_AGG(DISTINCT g) INTO v_affected_genres
            FROM UNNEST(ARRAY_CAT(OLD.genres, NEW.genres)) g;
        ELSE
            -- Both are NULL, nothing to update
            RETURN NEW;
        END IF;
        
        -- If status changed but genres didn't, we still need to update the counts
        -- for the genres in the artwork
        IF OLD.status != 'published' AND NEW.status = 'published' THEN
           v_affected_genres := NEW.genres;
        ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
           v_affected_genres := OLD.genres;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Only update genres present in the deleted artwork
        v_affected_genres := OLD.genres;
    END IF;

    -- Update counts only for the affected genres
    -- This adds the required WHERE clause for pg_safeupdate
    IF v_affected_genres IS NOT NULL AND array_length(v_affected_genres, 1) > 0 THEN
        UPDATE genres g
        SET artwork_count = (
            SELECT COUNT(*) FROM artworks a 
            WHERE g.name = ANY(a.genres) 
            AND a.status = 'published'
        )
        WHERE g.name = ANY(v_affected_genres);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also need to ensure the trigger runs on DELETE as well
DROP TRIGGER IF EXISTS trg_update_genre_count ON artworks;
CREATE TRIGGER trg_update_genre_count
    AFTER INSERT OR UPDATE OR DELETE ON artworks
    FOR EACH ROW EXECUTE FUNCTION update_genre_count();
