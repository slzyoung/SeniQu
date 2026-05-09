DELETE FROM forum_categories;

-- Insert default categories with explicit UUIDs to match frontend fallback systems
INSERT INTO forum_categories (id, name, slug, description, icon, sort_order, is_active) VALUES
('aaaaa', 'Museums & Galleries', 'museums-galleries', 'Share your visits, reviews, and explore exhibitions across Indonesia.', '🏛️', 1, true),
('bbbbb', 'Cultural Heritage & Sites', 'cultural-heritage', 'Discussions about historical sites, artifacts, and heritage preservation.', '🏺', 2, true),
('ccccc', 'Traditional to Digital Arts', 'traditional-digital', 'Bridging traditional cultural spaces with modern and digital art technologies.', '🎨', 3, true),
('ddddd', 'AI & Tech Innovations', 'ai-tech-innovations', 'Explore AI storytelling, digitization, and interactive tech in art.', '🤖', 4, true),
('eeeee', 'Community Hub & Announcements', 'community-hub', 'Official SeniQu updates, Q&A, and general community interactions.', '📢', 5, true);
