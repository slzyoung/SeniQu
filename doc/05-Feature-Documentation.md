# Feature Specifications

This document outlines the core public and private features of SeniQu, aligned with its mission as Indonesia's leading digital cultural heritage infrastructure.

## 1. Public Features (The Cultural Discovery Layer)
Accessible to all visitors.

### 1.1 Centralized Cultural Platform (Landing)
- **Hero Section**: High-impact "Indonesia: A Cultural Superpower" visual intro.
- **Stats Metrics**: Live tracking of Digitized Artworks, Cultural Sites, Museums, and Heritage Items.
- **Search**: Global search overlay indexing the geographical mapping of Nusantara's assets.
- **Mobile Notifications**: Real-time alerts with read/unread status for upcoming exhibitions.

### 1.2 Interactive & Immersive Experience (Gallery Module)
- **Public Heritage Hub**: Browsable grid of all 12,000+ public artworks with advanced Nusantara heritage filtering.
  - **Expandable Filter Panel**: Collapsible panel with three filter dimensions — **Era/Period** (Pre-Historic, Hindu-Buddhist, Islamic Sultanate, Colonial, Post-Independence, Contemporary), **Medium/Material** (Canvas, Batik Textile, Wood Carving, Wayang Kulit, Stone Relic, Digital Art), and **Origin Region** (Sumatra, Java, Kalimantan, Sulawesi, Nusa Tenggara, Papua, Bali).
  - **Active Filter Pills**: When the filter panel is collapsed, active filters appear as dismissible gold pill tags below the toolbar.
  - **Filter Count Badge**: The Filters button displays a real-time count of active filter dimensions.
  - **Gallery Page City Filter Optimization**: For logged-in users, the 'All Cities' option is hidden to enforce localized cultural exploration, defaulting the active city filter initially to 'Jakarta'. The filter chips are redesigned as a nowrap, horizontally scrollable slider to optimize screen real estate on mobile viewports and provide a premium interactive feel.
- **Museum & Gallery Geolocation**: Dedicated pages for 450+ institutions to showcase their collections, exhibition hours, and physical locations.
- **Artwork Deep-Dive** (`ArtworkView`):
  - **AI Genre & Style Insights Panel**: Computer vision pipeline classification with animated confidence progress bars (e.g., `Modernism 94%`, `Expressionism 78%`).
  - **Proof of Art (PoA) Provenance Timeline**: Step-by-step blockchain provenance tracker — Masterpiece Creation → Institutional Verification → On-chain Registration.
  - **Interactive Web3 Privy Checkout Modal**: 4-step purchase flow — Wallet Connection → Cryptographic Nonce Signing (OWASP A7 replay prevention) → Transaction Confirmation with gas estimation → Success with Etherscan transaction hash link.
  - Zoomable high-res viewing and "More like this" contextual engine.
- **Artwork Card Enhancements**:
  - **AI Genre Tag Badges**: Each card displays `Cpu`-prefixed genre classification chips.
  - **PoA Shield Indicator**: Cards with blockchain-verified artworks display a `ShieldCheck PoA` badge.
  - **Collector Pricing**: Cards show ETH price for listed artworks or view count for non-listed ones.
- **Featured Artworks Carousel**: A premium, horizontal snap-scrolling carousel that displays a curated list of Indonesian masterpieces.
  - **Manual Navigators**: Sleek, absolute-positioned manual navigation arrows (`ChevronLeft`, `ChevronRight`) appear on hover.
  - **Autoplay Engine**: Autoplays every 4.5 seconds with a smooth, CSS-accelerated transition.
  - **Pause-on-Hover**: Intelligently pauses autoplay when the user hovers over the carousel, preventing interruptions.
  - **Mobile Touch Optimization**: Supports native horizontal swipe-snapping for mobile and tablet browsers, showing partial adjacent cards to prompt discovery.

### 1.3 Curated Collections
- **Premium Carousel Display**: Curated Collections page features a matching horizontal swipe-snap scroll carousel with auto-swipe behavior.
- **Aesthetic Header Integration**: Optimized top layout padding (narrowed from `pt-20` to `pt-12`) to align curations with the hamburger navbar menu.
- **Unified Category Tabs**: Synchronized filter tabs with smooth Framer Motion `layoutId` active-indicator transitions.

### 1.4 Dynamic Geolocation & Interactive Routing (Nearby Module)
- **Hybrid Mapping Architecture**: Implemented a multi-provider hybrid map system rendering OpenStreetMap (OSM) via Leaflet.js as the primary default and Google Maps as an optional togglable provider.
  - **Lazy Script Loading**: Google Maps JavaScript SDK is only downloaded on-demand when the user activates the Google Maps provider toggle.
  - **Universal Default**: Guest and authenticated users default to Leaflet OSM maps, eliminating map load charges for general browsing.
- **Geocoding & Discovery**: Geolocation-enabled dashboard fetching nearby heritage hotspots, museums, and galleries within 15km using custom backend APIs. Defaults to free local PostGIS queries (`dataSource: 'local'`).
- **Classic Blue Dot & Pulse Radar**: Renders user location dynamically.
  - **Silky Smooth Radar**: Circle overlay pulses continuously up to a wide radius of 750 meters with custom-fade opacity calculations and a 12ms tick rate, yielding 83fps.
- **Dynamic Route Directions**: Provides real-time directions from the user's location to the selected heritage site.
  - **Secure Proxy Architecture**: Bypasses client-side API key exposure by sending coordinate queries to backend proxy routes.
  - **Polyline Decoding & Rendering**: Decodes Google's Route polyline client-side and plots a premium blue navigation path (`#4285F4`, width 5) on the active map.
  - **Auto-Viewport Fit**: Automatically calls map `fitBounds` with padding to dynamically frame both the user's location and the destination.
- **Google Maps API Cost Mitigation**:
  - **FieldMask Downgrade**: Strips photos and reviews from search queries to avoid Preferred pricing ($32.00/1k requests).
  - **Single Center Lookup**: Restructures overlapping grids into 1 center query to achieve a 7x call volume reduction.
  - **On-Demand Details Fetching**: Lazy-loads photos and reviews through `/place-details/:placeId` only on explicit card clicks. If Google limits are exhausted or APIs fail, details are served directly from the database, and an asynchronous background ETL scraper automatically enriches the database record with Wikipedia summaries, images, and generated reviews.
- **Consolidated Search Header**: Removed redundant floating navigation triggers (floating compass/map buttons) and embedded the Map Switcher directly into the search bar for an ultra-clean vertical height.
- **Contrast-Preserving Filter Chips**: Fully custom-tailored active chips in light mode (e.g. "Heritage", "Museum") maintaining pure white text (`#fff !important`) even on hover, overcoming standard default overrides.

### 1.5 AI-Enhanced Cultural System
- **Create Artwork with AI (AI Studio)**: A state-of-the-art generative AI creation workspace integrated into the AI Studio Dashboard.
  - **Text Prompting**: Accepts complex descriptive text inputs to generate high-resolution artistic assets.
  - **Curated Heritage Styles**: Users can select from standard preset artistic styles (e.g., Oil Painting, Digital Art, Batik Heritage) to automatically guide the generation.
  - **Cloudflare Workers AI (Flux.1-schnell)**: Primary server-side image generation engine. Integrates `@cf/black-forest-labs/flux-1-schnell` model with a robust fallback chain (Pollinations AI → Curated Unsplash Art) to guarantee 100% service uptime even if API quotas are exhausted.
  - **Generation History & Management**: View past creations, download them to local storage, and publish them directly to the community feed.
- **Generative Summaries**: AI creating fast, digestible narratives of complex historical artifacts.
- **Multilingual Support**: Auto-translation of exhibition descriptions for international tourists.
- **Smart Metadata Standardizer**: AI engine classifying unstructured institutional catalogs into the unified SeniQu database.

### 1.6 Community Feed Enhancements
- **Interactive Masonry Community Grid**: Rebuilt the Community Feed as a highly-optimized masonry grid layout (2-column mobile, 3-column tablet, 4-column desktop) with lazy-loaded image shimmer skeletons, double-tap to like with interactive pop animations, and paging with a "Load More" action.
- **Featured Styles Carousel**: A premium, interactive carousel that showcases popular cultural styles (e.g. Batik, Digital Art, Oil Painting).
  - **Touch & Mouse Drag Scrolling**: Fully supports swipe-dragging on mobile and scroll-dragging on desktop.
  - **Autoplay & Navigation**: Slides auto-advance with a smooth, continuous CSS transition, pausing intelligently on hover or manual interaction.
  - **Visual Pagination & Indicator Dots**: Dynamic dots below the carousel tracking the active card index.

### 1.7 Optimized Local Fallback & Region Classification
- **PostGIS Spatial Fallback**: Fully offline-compatible geolocation fallback query using PostGIS `location` fields when third-party APIs fail.
- **Supabase PostgREST 1000-Limit Bypass**: Employs a paginated batch-fetching algorithm that fetches 100% of verified database institutions to prevent silent omission of entries beyond the first 1000 records.
- **Surabaya Regional Geotargeting**: Correctly parses postcodes and coordinates to classify and filter destinations into specific zones (Surabaya Timur, Surabaya Barat, Surabaya Utara, Surabaya Pusat, Surabaya Selatan).
- **R2 CDN Image Hosting**: All major regional cover images (including Surabaya East, West, and North) are hosted on Cloudflare R2 CDN and indexed in the Supabase database.

---

## 2. User & Visitor Experience
For general `USER` roles.
- **Overview**: Stats on viewed/collected cultural items.
- **My Digital Archive**: Group bookmarks into custom curation lists.
- **Bookmarks**: Saved artworks for later offline physical visits.
- **Settings Page**:
  - **Profile Management**: Update avatar, bio, and personal details.
  - **Security**: Toggle 2FA and Login Alerts.
  - **Notifications**: Configure email and push preferences (JSONB persistence).
  - **Theme**: Dark/Light mode toggle.

## 3. Institutional Dashboard (B2B & B2G)
For `MUSEUM_CURATOR` and `GALLERY_OWNER` roles.
- **Digitization Wizard**: Multi-step form to publish art to the blockchain registry.
- **Asset Management**: Table/Grid management of their digitized portfolio.
- **Visitor Analytics**:
  - Views & Engagement time-series charts (Recharts).
  - Geographic distribution of virtual and scanned physical visitors.
- **Proof of Art (PoA)**: Issuing certificates of authenticity.

## 4. Super Admin Panel
For `SUPER_ADMIN`.
- **System Overview**: Health status, user growth, digitization pipeline charts.
- **Institution Approval**: Workflow to verify new B2G museums or B2B galleries joining the network.
- **Content Moderation**: Review reported metadata anomalies.
- **System Logs**: View backend error/access logs for OWASP compliance.
- **Security Center**: Threat monitoring and API rate limit analytics.
