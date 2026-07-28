# 07. PostgreSQL & Supabase Database Schema

This document details the core database schema, relationships, and migration history for the SeniQu platform.

---

## 1. Overview & Connection Architecture
SeniQu uses PostgreSQL hosted on **Supabase** with the `pgvector` and `PostGIS` extensions enabled.
- **ORM & Access**: Supabase Client JS (`@supabase/supabase-js`) in NestJS backend and React frontend via Service Role Key & RLS policies.
- **Geospatial Features**: `PostGIS` is used for ST_DWithin geolocation queries on `institutions` and `reels`.

---

## 2. Table Definitions & Schemas

### 2.1. `users` Table
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    privy_did TEXT UNIQUE NOT NULL,
    email TEXT,
    wallet_address TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user', -- 'user', 'artist', 'admin', 'institution_owner'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2. `reels` Table (Short-Form Videos)
```sql
CREATE TABLE public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_key TEXT,
    thumbnail_url TEXT,
    thumbnail_key TEXT,
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    duration NUMERIC DEFAULT 0,
    width INT DEFAULT 0,
    height INT DEFAULT 0,
    file_size INT DEFAULT 0,
    aspect_ratio TEXT DEFAULT '9:16',
    audio_metadata JSONB DEFAULT '{}'::jsonb,
    location_name TEXT,     -- Added in Migration 072
    location_lat NUMERIC,  -- Added in Migration 072
    location_lng NUMERIC,  -- Added in Migration 072
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3. `follows` Table
```sql
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);
```

### 2.4. `institutions` Table (Museums & Galleries)
```sql
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'museum', -- 'museum', 'gallery', 'heritage'
    description TEXT,
    street TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'Indonesia',
    location GEOGRAPHY(POINT, 4326),
    cover_image_url TEXT,
    logo_url TEXT,
    rating NUMERIC(3,2) DEFAULT 5.0,
    total_artworks INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    reviews JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Recent Migration History

| Migration File | Description |
| :--- | :--- |
| `060_reels_feature.sql` | Initial schema for reels table, video key storage, audio metadata JSONB |
| `065_forum_media_support.sql` | Added support for multi-image collages and silent video flags |
| `070_privy_sync_role_column.sql` | Added role column & sync triggers for Privy DID integration |
| `072_add_reels_location_columns.sql` | Added `location_name`, `location_lat`, and `location_lng` columns to `reels` table |
