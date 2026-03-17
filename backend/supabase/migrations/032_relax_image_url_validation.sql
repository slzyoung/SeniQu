-- ============================================================
-- MIGRATION 032: RELAX IMAGE URL VALIDATION
-- Allow Base64 Data URIs for Artwork Images
-- Date: 2026-03-17
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_validate_artwork_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate title length (prevents data bombs)
    IF LENGTH(NEW.title) > 255 THEN
        RAISE EXCEPTION 'Artwork title exceeds maximum length of 255 characters';
    END IF;

    -- Validate description length
    IF NEW.description IS NOT NULL AND LENGTH(NEW.description) > 50000 THEN
        RAISE EXCEPTION 'Artwork description exceeds maximum length of 50,000 characters';
    END IF;

    -- Sanitize title and description
    NEW.title := sanitize_text_input(NEW.title, 255, FALSE);
    IF NEW.description IS NOT NULL THEN
        NEW.description := sanitize_text_input(NEW.description, 50000, FALSE);
    END IF;

    -- Validate image URL format (allow http, https, and data URIs for Base64)
    IF NEW.primary_image_url IS NOT NULL THEN
        -- Allow http://, https://, or data:image/... base64 strings
        IF NEW.primary_image_url !~ '^(https?://|data:image/)' THEN
            RAISE EXCEPTION 'Image URL must start with http://, https://, or data:image/';
        END IF;
        
        -- Base64 strings can be large (up to 5MB)
        IF NEW.primary_image_url !~ '^data:image/' AND LENGTH(NEW.primary_image_url) > 2048 THEN
             RAISE EXCEPTION 'Image URL exceeds maximum length of 2048 characters';
        ELSIF NEW.primary_image_url ~ '^data:image/' AND LENGTH(NEW.primary_image_url) > 5000000 THEN
             RAISE EXCEPTION 'Base64 Image URL exceeds maximum length of 5MB';
        END IF;
    END IF;

    -- Validate slug format
    IF NEW.slug IS NOT NULL AND NEW.slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
        -- Auto-fix slug instead of rejecting
        NEW.slug := regexp_replace(LOWER(TRIM(NEW.slug)), '[^a-z0-9-]', '-', 'g');
        NEW.slug := regexp_replace(NEW.slug, '-+', '-', 'g');
        NEW.slug := TRIM(BOTH '-' FROM NEW.slug);
    END IF;

    RETURN NEW;
END;
$$;
