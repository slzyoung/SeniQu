# 20. Short-form Reels, Forum Video Uploads, and Social Follow System

This document details the architecture, design, database schema, and implementation of SeniQu's rich social interactions, video processing pipelines, and social follow networks.

---

## 1. Short-form Reels (Shorts) Feature

The Reels feature brings engaging, vertical short-form video streaming to the SeniQu platform. It is modeled after modern high-engagement media feeds, optimized for fast loading and micro-animations.

### Key Architecture Components
1. **Video Transcoding & Processing**: 
   * Videos uploaded to the Reels module are processed asynchronously via a server-side storage and transcoding worker.
   * Keyframes are extracted to generate video thumbnails (`video_thumbnail_url`) to display static previews before playback starts.
2. **Streaming Optimization**:
   * Delivers responsive HLS/DASH streaming endpoints or fallback standard mp4 streaming.
   * Utilizes Cloudflare CDN caching for video distribution.
3. **Frontend Player Experience**:
   * Uses a custom video player overlay with controls for volume, play/pause state, progress indicator, and immersive full-screen vertical feed scrolling.
   * Integrated interaction panel for liking, commenting, and bookmarking.

### DB Schema / Table structure:
```sql
CREATE TABLE public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    caption TEXT,
    video_url TEXT NOT NULL,
    video_thumbnail_url TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Forum Video Uploads

Extends the Community Forum threads and replies to support video content uploads, bridging standard discussions with rich-media assets.

### Features
* **Multi-Format Upload Support**: Accepts standard video formats (mp4, mov, avi).
* **Automated Processing**: Integrates with the backend media service for security screening, transcode queue, and preview thumbnail generation.
* **Inline Players**: Renders custom React video players directly inside forum threads and replies with responsive bounds.

---

## 3. Public Profile and Follow System

A unified social layer allowing users to explore creator portfolios, follow artists/users, and interact across all features.

### Unified Navigation
The profile viewing flow is connected across all platforms:
* Clicking a profile avatar/name inside **Photography Hub**, **AI Curation**, **Create with AI**, **Reels**, or **Forum** opens the user's professional public profile page.

### Features
* **Dynamic Follow/Unfollow**: Direct interaction buttons with real-time UI/UX state updates.
* **Followers / Following Lists**: Tabbed panel displaying user network connections.
* **Engagement Counts**: Dynamically computes posts counts (sum of user's reels and forum threads) and follower counts.

### Database Tables:
```sql
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);
```

---

## 4. Enterprise Sidebar UX and Navigation

Reordered the platform sidebar to conform to enterprise-grade dashboard architecture, reducing visual clutter and cognitive overload.

### Sections Hierarchy
1. **Overview**: Essential dashboard entry points.
2. **Explore**: Visual discovery feeds (**Art Gallery**, **Photography Hub**, **Nearby Museums**).
3. **AI Studio**: High-value tools (**AI Curation**, **Create with AI**, **Analyze**).
4. **Commerce**: Artwork transactions (**Arts Marketplace**, **My Arts**).
5. **Community**: Social elements (**Reels**, **Forum**, **Messages**).
6. **Library**: User assets and saves (**Bookmarks**, **Wallet**).
7. **Settings**: Account configuration (**Profile**, **Settings**).

### Iconography Improvements
* Swapped the generic single-image icon on the **Art Gallery** to `GalleryHorizontal` (Lucide-react), representing a curated wall structure and visually highlighting the gallery context.
