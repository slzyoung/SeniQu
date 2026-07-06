-- ============================================================
-- SEED ARTWORKS AND INSTITUTIONS FOR JAKARTA & YOGYAKARTA
-- Migration: 071_seed_jakarta_yogyakarta_artworks.sql
-- Purpose: Populates database with R2-hosted artworks for Sonobudoyo, Bank Indonesia, Galeri Nasional, and Paseban
-- ============================================================

DO $$
DECLARE
    admin_id UUID;
    sonobudoyo_id UUID;
    bank_indonesia_id UUID;
    galeri_nasional_id UUID;
    paseban_id UUID;
BEGIN
    -- 1. Get a valid user ID for owner/artist (typically the super admin or admin)
    SELECT id INTO admin_id FROM users WHERE role = 'super_admin' OR role = 'admin' OR role = 'artist' LIMIT 1;
    
    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No user found in users table. Please register or seed users first.';
    END IF;

    -- 2. Insert/Ensure Institutions exist with exact names matching the frontend config
    -- Museum Sonobudoyo
    INSERT INTO institutions (id, owner_id, name, slug, city, type, is_verified, created_at, updated_at)
    VALUES (
        'ca6ac138-bfa2-46cd-b81c-b3bc64ea5801',
        admin_id,
        'Museum Sonobudoyo',
        'museum-sonobudoyo-74',
        'Yogyakarta',
        'museum',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        is_verified = TRUE
    RETURNING id INTO sonobudoyo_id;

    -- Museum Bank Indonesia
    INSERT INTO institutions (id, owner_id, name, slug, city, type, is_verified, created_at, updated_at)
    VALUES (
        '9bb474b7-07e5-4474-ae93-571b417d9c3f',
        admin_id,
        'Museum Bank Indonesia',
        'museum-bank-indonesia',
        'Jakarta',
        'museum',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        is_verified = TRUE
    RETURNING id INTO bank_indonesia_id;

    -- Galeri Nasional Indonesia
    INSERT INTO institutions (id, owner_id, name, slug, city, type, is_verified, created_at, updated_at)
    VALUES (
        'dfb761b8-6ec5-455b-b13e-fcc8766e85db',
        admin_id,
        'Galeri Nasional Indonesia',
        'galeri-nasional-indonesia',
        'Jakarta',
        'gallery',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        is_verified = TRUE
    RETURNING id INTO galeri_nasional_id;

    -- Museum Paseban
    INSERT INTO institutions (id, owner_id, name, slug, city, type, is_verified, created_at, updated_at)
    VALUES (
        'ee8fa764-08a5-4e41-9a8d-e3eb467ffca9',
        admin_id,
        'Museum Paseban',
        'museum-paseban',
        'Jakarta',
        'museum',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        is_verified = TRUE
    RETURNING id INTO paseban_id;

    -- 3. Seed Artworks for Museum Sonobudoyo (Yogyakarta)
    INSERT INTO artworks (id, artist_id, institution_id, title, slug, description, genres, medium, year_created, price, currency, is_for_sale, primary_image_url, status, is_art, region, category, created_at, updated_at)
    VALUES 
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Wayang Kulit Sonobudoyo #1', 'wayang-kulit-sonobudoyo-1',
        'Wayang Kulit warisan budaya adiluhung koleksi Museum Sonobudoyo Yogyakarta.', ARRAY['Traditional', 'Nusantara Style'], 'Buffalo Parchment & Gold Leaf', 1920, 0.45, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133046_216.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Wayang Kulit Sonobudoyo #2', 'wayang-kulit-sonobudoyo-2',
        'Preservasi digital karakter pewayangan legendaris di Museum Sonobudoyo.', ARRAY['Traditional', 'Nusantara Style'], 'Buffalo Parchment & Gold Leaf', 1925, 0.50, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133107_822.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Keris Pusaka Mataram', 'keris-pusaka-mataram',
        'Senjata tradisional keris dengan pamor meteorit indah era Mataram Islam.', ARRAY['Traditional', 'Metal Work'], 'Iron, Nickel Meteorite & Wood', 1750, 1.20, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133118_020.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Topeng Kayu Klasik Yogyakarta', 'topeng-kayu-klasik-yogyakarta',
        'Topeng tari klasik Panji yang diukir dengan detail halus khas Yogyakarta.', ARRAY['Traditional', 'Sculpture'], 'Teak Wood & Natural Dyes', 1940, 0.35, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133123_598.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Batik Tulis Klasik Nitik', 'batik-tulis-klasik-nitik',
        'Motif batik nitik legendaris yang sarat akan makna filosofi kehidupan keraton.', ARRAY['Traditional', 'Textile'], 'Natural Dye on Cotton', 1950, 0.60, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133131_672.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, sonobudoyo_id, 'Patung Perunggu Ganesha Kuno', 'patung-perunggu-ganesha-kuno',
        'Arca Ganesha perunggu bersejarah tinggi peninggalan abad ke-9.', ARRAY['Traditional', 'Bronze Sculpture'], 'Bronze', 850, 2.50, 'ETH', TRUE,
        'https://cdn.seniqu.art/Yogyakarta/Museum/Museum%20Sonobudoyo/IMG_20260419_133139_581.jpg', 'published', TRUE, 'Yogyakarta', 'Heritage', NOW(), NOW()
    )
    ON CONFLICT (slug) DO NOTHING;

    -- 4. Seed Artworks for Museum Bank Indonesia (DKI Jakarta)
    INSERT INTO artworks (id, artist_id, institution_id, title, slug, description, genres, medium, year_created, price, currency, is_for_sale, primary_image_url, status, is_art, region, category, created_at, updated_at)
    VALUES 
    (
        uuid_generate_v4(), admin_id, bank_indonesia_id, 'Uang Kertas Gulden Kolonial', 'uang-kertas-gulden-kolonial',
        'Mata uang kertas De Javasche Bank bernilai sejarah tinggi era kolonial.', ARRAY['Historical', 'Numismatics'], 'Paper Currency', 1930, 0.25, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Barat/Museum/Museum%20Bank%20Indonesia/20260308_125530.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, bank_indonesia_id, 'Koin Perak Vereenigde Oostindische Compagnie', 'koin-perak-voc',
        'Koin perak VOC bertahun 1780 koleksi numismatik Museum Bank Indonesia.', ARRAY['Historical', 'Numismatics'], 'Silver Coin', 1780, 0.30, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Barat/Museum/Museum%20Bank%20Indonesia/20260308_130248.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, bank_indonesia_id, 'Brankas Besi Kuno De Javasche Bank', 'brankas-besi-kuno',
        'Brankas penyimpanan emas bersejarah dari masa operasional awal bank sirkulasi.', ARRAY['Historical', 'Metal Work'], 'Cast Iron & Steel', 1900, 1.50, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Barat/Museum/Museum%20Bank%20Indonesia/20260308_130629.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, bank_indonesia_id, 'Gold Bar Reserve Replika', 'gold-bar-reserve-replika',
        'Emas batangan replika cadangan devisa negara pameran sejarah moneter.', ARRAY['Historical', 'Metal Work'], 'Gold Plated Alloy', 2026, 0.15, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Barat/Museum/Museum%20Bank%20Indonesia/20260308_130903.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, bank_indonesia_id, 'Mesin Cetak Uang Klasik', 'mesin-cetak-uang-klasik',
        'Mesin cetak mekanik kuno yang digunakan untuk mencetak obligasi awal negara.', ARRAY['Historical', 'Industrial'], 'Cast Iron', 1920, 0.80, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Barat/Museum/Museum%20Bank%20Indonesia/20260308_131006.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    )
    ON CONFLICT (slug) DO NOTHING;

    -- 5. Seed Artworks for Galeri Nasional Indonesia (DKI Jakarta)
    INSERT INTO artworks (id, artist_id, institution_id, title, slug, description, genres, medium, year_created, price, currency, is_for_sale, primary_image_url, status, is_art, region, category, created_at, updated_at)
    VALUES 
    (
        uuid_generate_v4(), admin_id, galeri_nasional_id, 'Komposisi Bidang Abstrak', 'komposisi-bidang-abstrak',
        'Lukisan abstrak modern dengan kombinasi warna primer yang memukau.', ARRAY['Abstract', 'Fine Art'], 'Oil on Canvas', 1985, 1.10, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Pusat/Galeri/Galeri%20Nasional%20Indonesia/20260310_121356.jpg', 'published', TRUE, 'DKI Jakarta', 'Art', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, galeri_nasional_id, 'Potret Kehidupan Urban Jakarta', 'potret-kehidupan-urban-jakarta',
        'Lukisan ekspresionis bertema dinamika sosial masyarakat modern ibu kota.', ARRAY['Expressionism', 'Fine Art'], 'Acrylic on Canvas', 1995, 0.95, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Pusat/Galeri/Galeri%20Nasional%20Indonesia/20260310_121506.jpg', 'published', TRUE, 'DKI Jakarta', 'Art', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, galeri_nasional_id, 'Refleksi Nusantara Klasik', 'refleksi-nusantara-klasik',
        'Karya seni rupa modern yang terinspirasi dari simbolisme ukiran tradisional.', ARRAY['Modern', 'Fine Art'], 'Mixed Media on Wood', 2005, 1.40, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Pusat/Galeri/Galeri%20Nasional%20Indonesia/20260310_121559.jpg', 'published', TRUE, 'DKI Jakarta', 'Art', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, galeri_nasional_id, 'Landscape Pesisir Sunda Kelapa', 'landscape-sunda-kelapa',
        'Pemandangan pelabuhan bersejarah Sunda Kelapa dalam balutan warna impresif.', ARRAY['Impressionism', 'Fine Art'], 'Oil on Canvas', 1978, 1.80, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Pusat/Galeri/Galeri%20Nasional%20Indonesia/20260310_122042.jpg', 'published', TRUE, 'DKI Jakarta', 'Art', NOW(), NOW()
    ),
    (
        uuid_generate_v4(), admin_id, galeri_nasional_id, 'Garis Waktu dan Ruang Kontemporer', 'garis-waktu-ruang-kontemporer',
        'Eksplorasi garis minimalis kontemporer yang mewakili perubahan sosial perkotaan.', ARRAY['Contemporary', 'Minimalism'], 'Acrylic on Canvas', 2015, 0.75, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Pusat/Galeri/Galeri%20Nasional%20Indonesia/20260310_122153.jpg', 'published', TRUE, 'DKI Jakarta', 'Art', NOW(), NOW()
    )
    ON CONFLICT (slug) DO NOTHING;

    -- 6. Seed Artworks for Museum Paseban (DKI Jakarta)
    INSERT INTO artworks (id, artist_id, institution_id, title, slug, description, genres, medium, year_created, price, currency, is_for_sale, primary_image_url, status, is_art, region, category, created_at, updated_at)
    VALUES 
    (
        uuid_generate_v4(), admin_id, paseban_id, 'Dokumen Bersejarah Paseban Senen', 'dokumen-bersejarah-paseban',
        'Arsip digital dokumentasi sejarah lokal kawasan Paseban peninggalan abad ke-19.', ARRAY['Historical', 'Documentary'], 'Archival Print', 1890, 0.20, 'ETH', TRUE,
        'https://cdn.seniqu.art/DKI%20JAKARTA/Jakarta%20Timur/Museum/Museum%20Paseban/20260312_120759.jpg', 'published', TRUE, 'DKI Jakarta', 'Heritage', NOW(), NOW()
    )
    ON CONFLICT (slug) DO NOTHING;

END $$;
