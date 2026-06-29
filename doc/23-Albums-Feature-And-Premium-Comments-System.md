# 23. Albums Feature and Premium Comments System

This document outlines the architecture, design, database schemas, API integration, and user interface details of the **Albums & Album Items Feature**, the **Premium Instagram-style Threaded Comments & Interaction Overhaul**, and related theme-aware improvements in SeniQu.

---

## 1. Albums and Album Items Feature

The Albums feature provides users with a structured, independent system to curate, manage, and showcase their artworks, photography, and digital creations. This system runs completely parallel to global or institutional collections, giving individual creators direct control over their portfolios.

### 1.1. Key Architecture & Features
1. **Independent Curation**: Creators can establish custom folders (albums) with custom metadata (title, description, cover photo, theme) to organize their works.
2. **Flexible Item Types**: An album can house multiple types of content, including photos, digital art, and physical/generative artworks.
3. **Public Profile Integration**: User portfolios are visible on their Public Profile pages. The frontend queries a user's albums dynamically, applying strict filtering:
   * Only albums and album items configured as public (`is_public = true`) are visible to other users.
   * Private albums remain visible only to their owner under their private Dashboard workspace.
4. **Relational Constraints**: Changed previous configurations to ensure all database-level user references (`user_id`) bind correctly to the master user registry `public.users` rather than `auth.users` to maintain consistency across modules.

### 1.2. Database Schema

The albums and items are backed by two new tables with specialized indexes, foreign key cascading, RLS configurations, and automated timestamp triggers.

```sql
-- Albums table (user-created portfolios)
CREATE TABLE public.albums (
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

-- Album items table (assets inside albums)
CREATE TABLE public.album_items (
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
```

#### Custom Indexes for Fast Query Execution
```sql
CREATE INDEX idx_albums_user_id ON public.albums(user_id);
CREATE INDEX idx_albums_is_public ON public.albums(is_public) WHERE is_public = true;
CREATE INDEX idx_album_items_album_id ON public.album_items(album_id);
CREATE INDEX idx_album_items_is_public ON public.album_items(is_public) WHERE is_public = true;
```

#### Row Level Security (RLS) Policies
* **Albums**:
  * *Select*: Allowed for everyone if `is_public = true`. Allowed for owner if `auth.uid() = user_id`.
  * *Insert/Update/Delete*: Restricted to the authenticated owner (`auth.uid() = user_id`).
* **Album Items**:
  * *Select*: Allowed for everyone if `is_public = true`. Allowed for owner if `auth.uid() = user_id`.
  * *Insert/Update/Delete*: Restricted to the authenticated owner (`auth.uid() = user_id`).

### 1.3. REST API & UI Controls
* **Backend Modules**: A new `AlbumsModule` (with `AlbumsController` and `AlbumsService`) handles CRUD operations.
* **Add Custom Creation Modal**: The `AddArtModal` facilitates direct creation of an album item. Creators can drag-and-drop or select media assets, specify metadata, toggle visibility, and bind the asset to a specific user album.

---

## 2. Premium Instagram-style Threaded Comments

To enhance user retention and mimic standard micro-engagement platforms, the reels comments bottom sheet was completely redesigned into a highly interactive, fluid, and premium comments panel.

### 2.1. Dynamic Features
1. **Swipe-to-Dismiss Gestures**:
   * Uses mobile-native touch trackers. Dragging down from the top handle or header tracks the touch distance (`translateY`).
   * Crossing the threshold (>120px) triggers a smooth slide-out dismissal animation; otherwise, the drawer springs back to its active position.
2. **Expandable Reply Threads**:
   * Comments show a visual "View N replies" accordion button.
   * Tapping this button fetches child comments (`parent_id`) asynchronously from the backend and prints them in a nested layout with visual branch guides (`CornerDownRight`).
   * Nested reply targets can be cleared or changed dynamically with a sticky indicator bar ("Replying to USERNAME").
3. **Database-Backed Comment Liking**:
   * Integrates a heartbeat mechanism. Tapping the like button sends a request to the backend database to insert/delete records in the `reel_comment_likes` schema.
4. **Instant Self-Deletion**:
   * Users can immediately delete comments they authored, triggering optimistic UI updates to keep interactions feeling snappy.
5. **Fluid Animation Pipeline**:
   * Leverages keyframe transitions (`rcSlideUp`, `rcSlideDown`, `rcFadeIn`, `rcFadeOut`) to ensure that closing, opening, and navigating threads happens with fluid CSS dynamics.

### 2.2. Comment Liking Schema (`065_reel_comment_likes.sql`)
```sql
CREATE TABLE IF NOT EXISTS reel_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_comment_user
    ON reel_comment_likes(comment_id, user_id);
```

---

## 3. Light and Dark Mode UI Enhancements

To deliver a premium visual aesthetic across both themes, several contrast, visibility, and layout components were polished.

### 3.1. Lightbox Delete Buttons
* **Problem**: In light mode, the delete action inside image lightboxes (for both custom artworks and photography uploads) was either invisible due to color clashing, or completely absent on cover images.
* **Solution**:
  * Unified lightbox deletion buttons with appropriate margins and absolute coordinates.
  * Designed specialized icon overlays with solid translucent backdrops (`bg-black/60` and `backdrop-blur-sm`) that maintain high contrast on any background image.
  * Ensures that a user can delete their photography collection items or generated custom creations directly from the lightbox modal, in both light and dark modes.

### 3.2. Theme-Specific Visual Polish
* The global index layout incorporates dynamic theme variables (`var(--bg-surface)`, `var(--text-primary)`, and `var(--border-color)`) on the comments drawers to match system settings seamlessly.
* Solved style issues on public profiles and album cards to display descriptions and status overlays correctly.

---

## 4. Multi-Module Threaded Comments and Memory Leak Resolution

Following the successful deployment of the Reels comments drawer, the premium Instagram-style threaded comments, replies, and like systems were extended to the rest of the application's interactive portals:

1. **Broadened Comments Threading**:
   * Integrated full nested comment systems inside the **Photography Hub Lightbox** (`PhotoLightbox.tsx`), the **AI Curation Lab Detail Drawer** (`AICurationPage.tsx`), **Community Forum Threads** (`ThreadView` inside `src/features/community/index.tsx`), and the **AI Generation Dashboard** (`AIDashboardPage.tsx`).
   * Supported quick emoji reaction bars, input focus, dynamic parent-comment replying indicators, and custom date formatting.
   * Handled routing correctly when users click avatars or display names, pointing to `/profile/:id` while preserving other title and action targets.

2. **Memory Leak and Event Loop Prevention (`MaxListenersExceededWarning`)**:
   * Fixed critical background memory leak warnings in browser consoles.
   * Identified and replaced a common react anti-pattern: `useEffect` loops driven by reference-unstable raw arrays (such as the comments list fetched on every render) that update state locally, rescheduling renders and recreating array instances indefinitely.
   * Refactored like counters to compute values dynamically during render loops using the stable `localLiked` registry map instead of maintaining intermediate state variables and effects. This solved the issues completely, maintaining smooth 60fps performance and preventing listener limit threshold warnings.
   * Ensured compilation cleanliness across modules by removing unused imports, parameters, and hooks (e.g. resolving `useEffect is not defined` errors).

3. **Curation Result Access Optimization**:
   * Fine-tuned restoration lab transitions in AI Curation results. Users who are not the creator or curator of a specific generation are redirected gracefully to the default Restoration tab, avoiding display of privileged edit controls or blank states.
