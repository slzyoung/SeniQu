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
6. **Adaptive Mobile Header Overlay & Full-Bleed Video Canvas**:
   * **Guest (Unauthenticated) Layout**: The video feed container (`.reels-container.reels-guest`) is pinned at `top: 0` on mobile, producing a seamless cinematic display. The mobile header navbar (`Navbar`) overlays on top of the video container using a vertical dark gradient background (`bg-gradient-to-b from-black/80 via-black/30 to-transparent`) and glassy translucent circular buttons (`bg-white/10`) for the search, theme toggle, and hamburger menu. This ensures maximum text legibility and button contrast regardless of whether light or dark mode is active. The Solana badge is hidden on mobile reels to optimize height.
   * **Member (Authenticated) Layout**: To preserve standard dashboard layouts, the container (`.reels-container.reels-auth`) defaults back to `top: 64px` on mobile, aligning right below the dashboard's persistent navigation header. This restores user access to the notifications drawer, search toggle, and the mobile sidebar toggle button.
7. **Search Overlay Collision Prevention**:
   * **Global Body State Class**: Opening the Reels in-page search overlay mounts a temporary `.reels-search-active` class to `document.body`.
   * **Visual Navbar De-collision**: A responsive CSS selector (`body.reels-search-active nav.fixed`) hides the global navbar on mobile by setting `opacity: 0`, `visibility: hidden`, and `pointer-events: none`. This eliminates overlapping and clashing between the global logo/icons and the search panel.
   * **Safe Area Margin Preservation**: The search panel utilizes mobile safe area top margins (`env(safe-area-inset-top)`) to ensure the search input row is perfectly aligned with the device's status bar.

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

## 2. Forum Media Uploads & Display Customization

Extends the Community Forum (both public and dashboard-level thread creation) to support rich, multi-media threads with validation, client-side preprocessing, and interactive layouts.

### 2.1. Media Validation & Constraints
* **Photos**: Supports selecting and uploading multiple photos (up to a maximum of **5 photos** per thread).
* **Videos**: Supports uploading standard video formats (MP4, WebM, OGG, MOV) up to **150MB** and capped at a maximum duration of **1 minute (60 seconds)**. Videos are validated on the client side using HTML5 metadata extraction.
* **Mutual Exclusivity**: Threads support either multiple images or a single video file to keep discussions clean and high-fidelity.

### 2.2. Interactive Display Layouts
When attaching multiple images, users can select how they want their media organized. This layout configuration is saved on the backend and rendered interactively on the client:
* **Separates (Vertical Stack)**: Displays images sequentially in full width.
* **Grid Collage**: A responsive grid collage presenting images beautifully based on the count.
* **Carousel**: A mobile-first, touch-friendly slider using swipe gestures and dot indicators.

### 2.3. Premium Animations & UX Polish
* **Framer Motion Transitions**: Added `<AnimatePresence>` around image preview grids, enabling spring-animated slide-ins when selecting images and smooth scale-outs when removing them.
* **Client-Side Image Compression**: Performs real-time canvas-based resizing down to target width presets (e.g. 1080p, 720p, etc.) before uploading, significantly saving bandwidth on mobile devices.
* **Upload Progress Tracker**: An animated progression bar showing three stages: *Compressing Media*, *Uploading to Server*, and *Processing on Cloud*.
* **Inline Custom Video Players**: Responsive native-wrapped video players with custom controls, play state tracking, mute toggles, and metadata previews.

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
* Designed a custom SVG icon for the **Forum** feature representing three user silhouettes under a speech bubble with three dots (`...`), matching the requested layout design.
* Replaced the **Messages** icon (envelope) with the `<MessageSquare>` icon previously used by the Forum feature.

---

## 5. Client-Side Image Compression & Aspect Ratio Controls

To optimize network usage, eliminate memory exhaustion on smaller cloud instances (such as a $7/month Render tier), and guarantee fast client transfers, SeniQu employs a robust client-side image compression pipeline before uploading to the server or Cloudflare R2 CDN.

### Granular Scale and Aspect Ratio Customization
When users upload media to a Forum thread or Reply, they are presented with detailed compression presets:
* **Aspect Ratio Selection**: Allows cropping to standardized dimensions:
  * `Original`: Preserves native canvas bounding boxes.
  * `1:1`: Square layout, typical for profile photos or artwork cards.
  * `4:3` & `3:4`: Traditional photography bounds.
  * `16:9` & `9:16`: Cinema/Reels widescreen formats.
* **Resolution Quality Controls**: Options to select targeted scales (1080p, 720p, 480p, 4K, or Original).
* **Iterative Downscaling Loop**: The client-side `compressImage` utility automatically calculates target pixel boundaries and resizes the image via `OffscreenCanvas`. If the resulting file exceeds `maxSizeBytes` (default 5MB), it iteratively lowers JPEG/WebP quality (down to `0.3`) until the asset fits within the budget.
* **Metadata Scrubbing**: To protect privacy, canvas re-drawing automatically strips all original camera EXIF, GPS location tags, and sensitive capture timestamps.

---

## 6. Portaled Sharing System & Third-Party Link Access

SeniQu provides a comprehensive in-app sharing system that bridges internal threads with external messaging networks.

### React Portals & Absolute Positioning
* To prevent CSS stacking contexts (such as `overflow-hidden` or high `z-index` mobile elements) from clipping the sharing sheet, the drawer backdrop is mounted directly into `document.body` via React Portal (`createPortal`).
* Supports share drawers for reels, video threads, and standard text/image threads.

### Verified Auth Restrictions
* To prevent unauthorized scraping and protect community discussions, shareable links are restricted. If an unauthenticated guest user clicks a shared thread or reel link, the routing system automatically redirects them to the login flow before displaying the resource.

### Brand-Compliant Visual Design
* The sharing drawer features official third-party vector branding.
* **WhatsApp Icon**: Updated to use the official two-part SVG logo (white handset enclosed inside a `#25D366` green bubble background) for maximum brand accuracy.
* **Dynamic Sharing Layouts**: Seamless grid structures that transition gracefully between mobile sheets and desktop overlays.

---

## 7. Video Audio Editing: Mute and Spotify Integration

To provide creators with professional sound design options, SeniQu features active original-sound muting at both the player level and the transcoding pipeline level, alongside a Spotify-linked audio system.

### 7.1. Video Mute Pipeline (FFmpeg-Level Mute)
* **Backend Processing**: 
  * The backend `VideoProcessingService` detects if a video has been configured to have no audio (via `mute: true` or `originalVolume: 0` in the upload session/payload).
  * During FFmpeg compression, if muting is requested, the system omits the standard AAC encoder options (`-c:a aac -b:a 128k`) and appends the `-an` flag (disable audio stream).
  * This strips the audio track directly from the resulting `.mp4` file, saving storage and bandwidth while guaranteeing complete silence in all players.
* **Frontend Toggles**:
  * **Reels Upload Wizard**: Included in the trimming/audio step, allowing creators to mute original audio or mix Spotify sounds.
  * **Forum Thread Creator**: Added a checkbox toggle `"Mute original sound from this video (silent video)"` when a video attachment is selected. It transmits `mute: true` in the multipart or Direct-to-CDN upload requests.

### 7.2. Spotify Account Connection Guide (How it works)
SeniQu connects users to their personal Spotify accounts dynamically to retrieve metadata and play audio.

#### 1. OAuth Authentication
* To connect a Spotify account, the user must authorize SeniQu via Spotify's Accounts Service:
  ```
  GET https://accounts.spotify.com/authorize?
    client_id=YOUR_CLIENT_ID
    &response_type=code
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=user-read-private%20user-read-email%20streaming%20user-modify-playback-state
  ```
* Upon authorization, the backend exchanges the authorization code for an Access Token and Refresh Token, storing them securely in the user's session profile.

#### 2. Spotify Web Playback SDK Integration
* The frontend loads the Spotify Web Playback SDK (`https://sdk.scdn.co/spotify-player.js`) in a custom script element.
* When the SDK initializes, it creates an in-browser virtual playback device connected to the user's Spotify account:
  ```javascript
  const player = new window.Spotify.Player({
    name: 'SeniQu Reels Player',
    getOAuthToken: cb => { cb(accessToken); }
  });
  player.connect();
  ```

#### 3. High-Fidelity Audio Synchronization
* When a Reel starts playing, the custom video player uses Spotify's Web API to trigger playback of the selected Track ID on the virtual player device:
  ```javascript
  // Play selected Spotify track at the designated offset
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({
      uris: [`spotify:track:${trackId}`],
      position_ms: offsetSeconds * 1000
    })
  });
  ```
* Playback states (play, pause, volume, time update) are synchronized between the HTML5 `<video>` tag and the Spotify Player object.

#### 4. Important Considerations & Spotify Terms
* **Spotify Premium Requirement**: Spotify's Web Playback SDK is strictly limited to **Spotify Premium** subscribers. Users with free accounts will get a 30-second audio preview via `preview_url` rather than a full, synced playback experience.
* **Copyright Restrictions**: Under Spotify Developer Terms, Spotify audio streams cannot be combined/multiplexed directly into the MP4 file on the backend for raw download or sharing to platforms like WhatsApp. Audio remains hosted on Spotify, synced dynamically on-client in the browser.

### 7.3. Hybrid Soundtrack Search & iTunes API Fallback
To provide a bulletproof user experience for all creators—regardless of whether they have a Spotify Premium subscription or are authenticated with Spotify—SeniQu implements a **Hybrid Soundtrack Search** pipeline in the Upload Reel modal:

1. **Automatic Fallback on Spotify API Restrictions**: 
   * Due to Spotify's developer portal policies (where apps in Development Mode restrict Web API calls to Spotify Premium users added to the sandbox user whitelist), any call to `/v1/search` or `/v1/me` that returns a `403 Forbidden` or `401 Unauthorized` status is automatically caught by the search hook.
   * The application immediately falls back to querying the **iTunes Music Search API** (`https://itunes.apple.com/search`).
2. **Seamless Public Access**:
   * If a user is not logged into Spotify, the search input searches the iTunes Music Library by default.
   * This provides a 100% free search database requiring no user login, credentials, token generation, or API key configuration.
3. **Property Alignment**:
   * iTunes Search results are dynamically mapped on the client side to match our standard unified track interface:
     * `id`: Prefixed as `itunes_${trackId}` to prevent collision with Spotify Track IDs.
     * `title` / `artist`: Standardized string mappings.
     * `artwork`: Automatically swapped from `100x100bb` to `400x400bb` resolutions for premium visuals in the modal player.
     * `url`: Bound to high-quality 30-second AAC preview audio streams (`previewUrl`).
4. **Content Security Policy Integration**:
   * To prevent browser-level blocks during search requests, `https://itunes.apple.com` is whitelisted under the `connect-src` header in the production hosting config (`netlify.toml` and `_headers`).

---

## 8. Real-Time Location Tagging & Interactive Map Routing

To empower content creators to tag precise geographical origins for their videos—and to allow viewers to instantly discover tagged heritage sites on an interactive map—SeniQu implements a production-ready, real-time location tagging system.

### 8.1. Debounced Location Search Pipeline
During Step 2 and Step 3 of the Reels Upload funnel (`UploadReelModal.tsx`), creators can search for location tags in real time:
1. **Google Places API Proxy**: Queries `museumService.searchNearbyPlaces(lat, lng, radius, query)`, routing requests safely through NestJS backend proxy endpoints to keep API keys hidden and enforce rate-limiting.
2. **OpenStreetMap (Nominatim) Fallback**: If fewer than 5 results return, the search queries OpenStreetMap Nominatim for global coverage without extra API cost.
3. **Heritage Presets & Custom Locations**: Preserves curated Indonesian museum presets while enabling creators to select `"Gunakan lokasi kustom: ..."` for unindexed or newly discovered locations.

### 8.2. Metadata Persistence & CDN Pipeline
* **Payload Structure**: Captures `locationName`, `locationLat`, and `locationLng`.
* **Database Indexing**: Stored in PostgreSQL `reels` table columns (`location_name`, `location_lat`, `location_lng`).
* **Direct-to-CDN Uploads**: Forwarded seamlessly via `useUploadStore` during both legacy API and direct Cloudflare R2 CDN background uploads.

### 8.3. Interactive Feed Tagging & Map Synchronization
* **Reel Feed Badge**: `ReelItem.tsx` renders a theme-aware MapPin pill showing the location tag.
* **Instant Map Navigation**: Clicking the location pill navigates directly to:
  ```
  /nearby?lat={lat}&lng={lng}&search={locationName}
  ```
* **URL Search Parameter Parsing**: On page mount, `PublicNearbyPage.tsx` parses `lat`, `lng`, and `search` query parameters, automatically centering the map, placing a target pin, and fetching nearby places for the selected coordinates.



