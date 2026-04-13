DELETE FROM forum_categories;

-- Insert default categories with explicit UUIDs to match frontend fallback systems
INSERT INTO forum_categories (id, name, slug, description, icon, sort_order, is_active) VALUES
('bc5c6d36-8aed-4fd3-9b6f-7d1c67d710f1', 'Museums & Galleries', 'museums-galleries', 'Share your visits, reviews, and explore exhibitions across Indonesia.', '🏛️', 1, true),
('d2ea67f9-3d57-4180-a681-37faba49fb42', 'Cultural Heritage & Sites', 'cultural-heritage', 'Discussions about historical sites, artifacts, and heritage preservation.', '🏺', 2, true),
('e1c9a173-6a9b-4e08-912c-0e868a2cbbe1', 'Traditional to Digital Arts', 'traditional-digital', 'Bridging traditional cultural spaces with modern and digital art technologies.', '🎨', 3, true),
('f875dc91-3b7c-48c4-b778-90f77ea6bbcd', 'AI & Tech Innovations', 'ai-tech-innovations', 'Explore AI storytelling, digitization, and interactive tech in art.', '🤖', 4, true),
('a571c482-5d9c-4b36-9b8e-32b0051e4590', 'Community Hub & Announcements', 'community-hub', 'Official SeniQu updates, Q&A, and general community interactions.', '📢', 5, true);
