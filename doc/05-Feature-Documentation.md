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

### 1.3 Tourism Optimization
- **Curated Cultural Routes**: Smart paths guiding tourists through historically linked physical heritage sites.
- **Geolocation Discovery**: Finding "Nearby Cultural Hotspots" via PostGIS integration.

### 1.4 AI-Enhanced Cultural System
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
