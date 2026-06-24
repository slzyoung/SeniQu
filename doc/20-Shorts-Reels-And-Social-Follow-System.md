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
3. **Immersive Video Editing & Audio Controls**:
   * **Multi-Step Upload Wizard**: A clean 3-step creator funnel (File Upload → Aesthetic Editing & Audio Binding → Metadata & Publication).
   * **Aesthetic Visual Filters**: Support for real-time CSS filters on video playback (Original, Cinematic, Vintage, Mono, Warm, Cool, Vibrant).
   * **Video Editing Controls**: Granular video trimming (start/end sliders), aspect ratio cropping (9:16 portrait, 1:1 square, 16:9 landscape, original size), and playback speed selection (0.5x, 1x, 1.5x, 2x).
   * **Custom Soundtracks & Audio Selection**:
     * *Original Audio*: Native soundtrack volume controls.
     * *Spotify Soundtrack*: Searchable library of global/traditional tracks with real-time preview playback, audio offset selection (0s - 30s), and volume mixing.
     * *Device Audio Upload*: Local audio file upload support (MP3, WAV, M4A, OGG) with preview playback and offset adjustments.
4. **Frontend Player Experience**:
   * Uses a custom video player overlay with controls for volume, play/pause state, progress indicator, and immersive full-screen vertical feed scrolling.
   * Dynamically applies playback speeds, aesthetic filters, volume, and synchronized custom audio tracks based on the Reel's database configuration.
   * Integrated interaction panel for liking, commenting, and bookmarking.
5. **High-Fidelity Social Sharing Sheet**:
   * **React Portal Mount**: To prevent the share drawer from being hidden behind or cut off by the mobile bottom navigation bar (`MobileBottomNav` with `z-50`), the modal backdrop and menu are mounted directly into `document.body` using a React Portal (`createPortal`), bypassing local CSS stacking contexts.
   * **Social Network Integrations**: Built-in support for sharing to WhatsApp, Telegram, Facebook, and X (formerly Twitter) using brand-compliant colored backgrounds and high-quality vector brand logos, along with standard link copying.
   * **Theme-Aware Adaptability**: Uses specialized CSS selectors (`.reel-share-icon--x` / `.dark .reel-share-icon--x`) to dynamically transition the X (Twitter) icon styling between light mode (charcoal logo on light-grey circular backdrop) and dark mode (pure white logo on translucent backdrop) for optimal legibility.

### DB Schema / Table structure:
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
    audio_metadata JSONB DEFAULT '{}'::jsonb, -- Stores selected Spotify/internal track info, offset, speed, volume, and filter configurations
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
