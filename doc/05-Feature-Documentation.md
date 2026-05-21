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
- **Public Heritage Hub**: Browsable grid of all 12,000+ public artworks with filtering (Era, Medium, Ethnic Group).
- **Museum & Gallery Geolocation**: Dedicated pages for 450+ institutions to showcase their collections, exhibition hours, and physical locations.
- **Artwork Deep-Dive**: Zoomable high-res viewing, verified blockchain provenance, and "More like this" contextual engine.
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
- **Geocoding & Discovery**: Geolocation-enabled dashboard fetching nearby heritage hotspots, museums, and galleries within 15km using custom backend APIs.
- **Classic Blue Dot & Pulse Radar**: Renders user location dynamically using a vector-mapped Google Maps blue dot with a high-fidelity white border.
  - **Silky Smooth Radar**: Circle overlay pulses continuously up to a wide radius of 750 meters with custom-fade opacity calculations and a 12ms tick rate, yielding 83fps.
- **Dynamic Route Directions**: Provides real-time directions from the user's location to the selected heritage site.
  - **Secure Proxy Architecture**: Bypasses client-side API key exposure by sending coordinate queries to backend proxy routes.
  - **Polyline Decoding & Rendering**: Decodes Google's Route polyline client-side and plots a premium blue navigation path (`#4285F4`, width 5) directly onto the Google Map.
  - **Auto-Viewport Fit**: Automatically calls map `fitBounds` with padding to dynamically frame both the user's location and the destination.
- **Consolidated Search Header**: Removed redundant floating navigation triggers (floating compass/map buttons) and embedded the Map Switcher directly into the search bar for an ultra-clean vertical height.
- **Contrast-Preserving Filter Chips**: Fully custom-tailored active chips in light mode (e.g. "Heritage", "Museum") maintaining pure white text (`#fff !important`) even on hover, overcoming standard default overrides.

### 1.5 AI-Enhanced Cultural System
- **Generative Summaries**: AI creating fast, digestible narratives of complex historical artifacts.
- **Multilingual Support**: Auto-translation of exhibition descriptions for international tourists.
- **Smart Metadata Standardizer**: AI engine classifying unstructured institutional catalogs into the unified SeniQu database.

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
