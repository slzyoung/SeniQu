-- Migration: 049_add_heritage_curation_public.sql
-- Description: Adds is_public boolean column to heritage_curations table and configures Row Level Security (RLS) policies to allow viewing public curations.

-- 1. Add is_public column if not exists
ALTER TABLE public.heritage_curations 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop existing own curations select policy to recreate it or modify it
DROP POLICY IF EXISTS "Users can view own curations" ON public.heritage_curations;

-- 3. Create updated select policy that allows users to view their own curations OR any public curations
CREATE POLICY "Users can view own or public curations" ON public.heritage_curations
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- 4. Create an index on is_public and created_at to speed up public feed loading
CREATE INDEX IF NOT EXISTS idx_heritage_curations_public_date 
ON public.heritage_curations (is_public, created_at DESC);
