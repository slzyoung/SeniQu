-- Up Migration
ALTER TABLE forum_threads ADD COLUMN media_url TEXT;
ALTER TABLE forum_threads ADD COLUMN media_type VARCHAR(50);

ALTER TABLE forum_posts ADD COLUMN media_url TEXT;
ALTER TABLE forum_posts ADD COLUMN media_type VARCHAR(50);
