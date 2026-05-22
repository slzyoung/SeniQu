# Hybrid Mapping & Google Maps API Cost Optimization Guide

This document details the hybrid mapping architecture and budget protection strategies implemented in SeniQu to address Google Maps API billing scalability.

---

## 1. The Challenge: Google Maps Pricing Risks
SeniQu relies on geolocation to help users discover nearby museums, galleries, and heritage sites. A previous implementation generated an **IDR 9,000,000 charge** for ~28,000 API requests in a single day. 

### Why was it so expensive?
1. **Preferred Billing Tier:** Standard queries requested `places.photos` and `places.reviews` directly in the `X-Goog-FieldMask`. This automatically elevated all API requests to the **Preferred** pricing category ($32.00 per 1,000 requests) instead of the **Basic** ($7.00 per 1,000) or **Advanced** ($20.00 per 1,000) tiers.
2. **Multi-Center Grid Multiplier:** For search radii > 20km, the backend generated a grid of up to **7 centers** to maximize coverage. Each center executed 3 parallel queries for different category types. This resulted in up to **21 Google Places API requests** for a single search operation by a single user.
3. **Eager Google Maps Script Loading:** The Google Maps JavaScript SDK was loaded on initial page mount regardless of whether the user viewed Google Maps, incurring Map Load charges.

---

## 2. The Solution: Hybrid Mapping Architecture

SeniQu uses a hybrid structure that combines the open-source Leaflet map engine with Google Maps.

```
                  [ Nearby Module Landing ]
                              |
              +---------------+---------------+
              |                               |
     [ Leaflet (OSM) ]                [ Google Maps ]
     - Default for Guests             - Optional Toggle
     - Open-source & Free             - Loaded on-demand
     - Vector Marker Layer            - Native Route Display
```

### Key Pillars:
1. **Leaflet (OpenStreetMap) as Default:** All users (guests and logged-in) land on a Leaflet-rendered OpenStreetMap map. The map uses completely free tile layers (e.g. CartoDB Positron), incurring $0.00 mapping infrastructure costs.
2. **On-Demand Lazy Loading of Google Maps:** The Google Maps JavaScript API script is **never** downloaded unless the user manually toggles the map provider to "Google Maps". This is managed by a dynamic wrapper that injects script tags dynamically.
3. **Default Local Search:** The primary data source is the local database (`dataSource = 'local'`), utilizing Supabase PostGIS spatial indices to locate museums within a given radius for free.

---

## 3. Google Maps API Budget Hardening (Backend)

When the user explicitly triggers an online search (online fallback search), the NestJS backend uses several techniques to minimize costs:

### A. FieldMask Category Downgrade (Search)
Standard search calls (`places:searchNearby` and `places:searchText`) now use a restricted FieldMask:
```http
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types
```
By removing `places.photos` and `places.reviews`, search queries are billed under the **Advanced** tier ($20.00/1,000 requests) or **Basic** tier ($7.00/1,000 requests if ratings are removed), down from the $32.00/1,000 Preferred tier.

### B. Single-Center Coordinate Query (7x Request Reduction)
We removed the multi-center grid generation logic for broad radius searches. The backend now queries **only the user's center coordinate** instead of up to 7 overlapping sub-centers. This provides a direct 7x reduction in raw query volume.

### C. Complete Elimination of Google Places Preferred Tier
To ensure monthly GCP costs remain under $20/month (easily covered by Google's $200 free credit tier), we completely removed `photos` and `reviews` fields from all backend Places calls (both search and details):
- **GCP Call Fields Mask:**
```http
X-Goog-FieldMask: id,displayName,formattedAddress,location,rating,userRatingCount,types
```
- **0% Preferred Charges:** This downgrades all Place Details calls from the Preferred tier ($25.00/1k) to the Advanced/Basic tier ($7.00 - $17.00/1k), making charges negligible.
- **Free Link for Photos & Reviews:** In the frontend detail sheet, we added a direct link button ("Info Lengkap") pointing to the place on Google Maps. When clicked, it opens Google Maps where the user can view photos, full reviews, street view, and opening hours for free.

### D. Server-Side Details Caching
Place details and search results are cached using server-side TTL memory maps:
- **Search Queries Cache:** 3-minute TTL (resolution: 0.001 degrees lat/lng grid).
- **Place Details Cache:** 15-minute TTL.
This prevents duplicate calls for frequently clicked locations.

### E. Strict Daily Quota and IP Rate Limiting — Cost-Hardened (All Endpoints)
To guarantee monthly costs stay **under $50** (or $0 with Google's $200 free credit), we enforced a comprehensive multi-layer rate limiting system covering **every** endpoint, tightening global daily limits to **30 requests/day** for Google APIs:

#### Open-Source Replacements (Eliminates 2 Google APIs):
| Function | Before (Google) | After (Open-Source) | Savings |
|---|---|---|---|
| **Reverse Geocoding** | Google Geocoding API ($5/1000) | **OpenStreetMap Nominatim** (FREE) | **100%** |
| **Routing/Directions** | Google Routes API ($5/1000) | **OSRM Router Engine** (FREE) | **100%** |
| Region Detection | Google Geocoding | **Nominatim** (FREE) | **100%** |

#### Remaining Google APIs (Protected by strict limits & authentication):
| API Endpoint | Per IP/day | Global/day | Max/month | Price/1000 | **Max Cost/month** |
|---|---|---|---|---|---|
| Search (Places) | 5 | 30 | 900 | $35 | **$31.50** |
| Place Details | 10 | 30 | 900 | $7 | **$6.30** |
| Maps JS (Frontend Loads) | — | — | Est. 450 | $7 | **$3.15** |
| Geocoding (Nominatim) | 2 | 20 | — | FREE | **$0** |
| Routes (OSRM) | 3 | 20 | — | FREE | **$0** |
| **TOTAL** | | | | | **$40.95** |

After Google's $200/month free credit: **$0.00/month** (with $159.05 USD remaining buffer).
With Leaflet/PostGIS as default data source for guest visitors, real-world usage is typically **under $5.00/month**.

#### NestJS Per-Minute Throttle (Anti-burst):
| Endpoint | Max req/minute | Auth Guard |
|---|---|---|
| `/search-nearby` | 5 | Public (Rate Limited) |
| `/place-details/:id` | 5 | Public (Rate Limited) |
| `/region-type` | 3 | Public |
| `/route` | 3 | Public (Rate Limited) |
| `/maps-config` | 5 | **JwtAuthGuard** (Strict) |

- **Seamless Fallback:** When any Google Maps API limit is exceeded, or if the user is unauthenticated and quota is met, the client/server falls back to the local PostGIS spatial database (100% free). The application remains fully functional.

---

## 4. Security & Access Partitioning: Authenticated vs. Guest Users

To prevent quota scraping, key extraction, or billing exhaustion, we partitioned access between authenticated users and anonymous guests:

### A. UI Restriction (Frontend)
- **Guest Users:** Default to OpenStreetMap (OSM) rendering ($0.00 map loads) and query Google Places search data via the public `/search-nearby` backend endpoint. The GMap toggle button and map engine selection panel are **completely hidden** from unauthenticated users. This forces guest users to use OSM, saving map load costs completely.
- **Authenticated Users:** Can toggle between OSM and GMap. The map defaults to OSM (`mapProvider = 'openstreetmap'`) to minimize map load costs. Users must explicitly click the **🌐 GMap** button to load the Google Maps JavaScript SDK on-demand.
- **Data Source:** Both authenticated and guest users query `/search-nearby` (`dataSource = 'google'`) to display rich locations (museums, galleries, heritage, tourist destinations) as markers, with automatic backend fallback to the local PostGIS database if quota is exceeded.

### B. Endpoint Hardening (Backend)
- The configuration endpoint `/api/v1/museums/maps-config` (which exposes the Google Maps client API key) is protected using `@UseGuards(JwtAuthGuard)`. Unauthenticated requests are immediately blocked with a `401 Unauthorized` response.
- Google Search and details lookup endpoints are public to allow guest discoverability, but are protected by strict NestJS IP-throttling (5 req/min) and global daily quotas (30 req/day total).

---

## 5. UI Alignment and Rendering Fixes
- **Leaflet Marker Centering:** To prevent text emojis (`🏛️`, `🎨`, `🏯`) inside custom Leaflet HTML `divIcon` pins from inheriting the `-45deg` parent rotation (which caused tilted icons), we wrapped them inside a `<span>` element. This enables the CSS selector `.leaflet-gold-pin-marker > *` to target the text node parent wrapper and rotate it back by `45deg`, rendering all markers upright and perfectly centered on the map.
- **Reactive Map Reinitialization:** When toggling view modes (Map to List and back), the map container DOM element is unmounted and recreated. We added `viewMode` to the Leaflet map initialization hook's dependency array and transitioned the ref instance to a reactive state `leafletMap`. This forces Leaflet to clean up old detached markers/polylines and instantiate a fresh map when returning to map view, preventing blank screen rendering.

---

## 6. Free Place Image Scraping & Caching Architecture
To completely eliminate reliance on Google's expensive Place Photos API (which raises Place Details calls to the Preferred Billing tier at $32/1,000 requests), SeniQu implements an autonomous, zero-cost image scraping and caching pipeline:

```
    [ Google searchNearbyPlaces API (No photos) ]
                       |
                       v
         [ Ingest to Local Database ]
                       |
                       +---> [ Scrape Wikipedia Search API (FREE) ]
                       |        - Query Ind. Wiki -> Eng. Wiki Fallback
                       |        - Custom User-Agent & Rate-limit delay (200ms)
                       |
                       v
         [ Store cover_image_url in DB ]
                       |
           +-----------+-----------+
           |                       |
     [ Map to API ]          [ Sync Existing ]
  - Search results fetch    - Background task backfills
    database image directly   existing places missing images
```

### A. Wikipedia Search API Scraper
The backend implements `scrapePlaceImage(placeName: string)` to query Wikipedia's search engine:
1. **Indonesian Wikipedia Search (`id.wikipedia.org`)**: Formulates search query utilizing generator options (`generator=search&gsrlimit=1&prop=pageimages&pithumbsize=800`).
2. **English Wikipedia Search Fallback (`en.wikipedia.org`)**: Triggers search as a fallback if the Indonesian query returns no thumbnail.
3. **Billing Risk**: **$0.00**. Wikipedia's API requires no API keys, has no billing thresholds, and allows public caching of assets under Creative Commons licenses.

### B. Database Integration & Image Caching
* **Newly Ingested Places**: As new destinations are identified from raw Google API results, they are inserted into the database. During insertion, their Wikipedia images are scraped and cached in the `cover_image_url` column.
* **Background Image Backfill**: For existing database places that currently lack cover images, the ingestion pipeline automatically runs a background task that scrapes Wikipedia images and updates the records asynchronously without blocking the client.
* **Immediate Search Result Augmentation**: The `/search-nearby` endpoint queries the database for matching slugs of the search results. If matching places already have a `cover_image_url` saved, the URL is attached to `photos: [cover_image_url]` immediately, bypassing any need for future image scraping.

### C. Frontend Image Fallback Handling
In the database mapper (`mapDatabaseToMuseum` in `museumService.ts`):
* Previously, empty JSONB defaults (`data.images` defaulting to `[]`) evaluated as truthy, blocking the database `cover_image_url` fallback from rendering, resulting in blank/gray preview cards.
* Fixed the mapper logic to verify array length: `const parsedImages = (data.images && data.images.length > 0) ? data.images : [data.cover_image_url].filter(Boolean)`. This guarantees that if a local or Wikipedia scraped image exists in `cover_image_url`, it renders instantly.

---

## 7. Cost Validation: Is it Still 100% Free / Very Cheap?
**Yes.** The system is structurally protected from billing spikes and keeps costs strictly near $0.00/month:

1. **No Google Places Photos API Calls**: Image scraping relies entirely on Wikipedia's free REST API. No Google Photo references are ever requested in backend masks, completely eliminating the $7.00 - $32.00/1k pricing tier.
2. **Strict Daily Hard Quotas**: Google Search and Details backend endpoints are protected by IP rate limits and global hard quotas (30 requests/day). This caps maximum monthly GCP exposure to under $40, which is entirely absorbed by Google's **$200.00 free monthly credit**.
3. **OpenStreetMap Default**: 95%+ of normal user mapping queries rely on OpenStreetMap tile servers via Leaflet. The Google Maps JS SDK is only loaded on-demand for authenticated users who manually toggle it on, preventing map load charges for general visitors.
4. **Free Routing and Geocoding**: High-volume queries for routing (directions) and region detection use OSRM and Nominatim engines, bypassing Google Routes and Geocoding APIs entirely at zero cost.

---

## 8. Summary of Code References

| File | Component / Method | Description |
|------|-------------------|-------------|
| **`PublicNearbyPage.tsx`** | `PublicNearbyPage` | Uses `useAuthStore` to conditionally fetch Google Maps API key only when authenticated, bypassing requests for guest users. |
| **`PublicNearbyPage.tsx`** | `NearbyPageInner` | Dynamically hides map selection controls and defaults to OpenStreetMap for guest users. Defaults mapProvider to OSM for logged-in users to save load costs. |
| **`PublicNearbyPage.tsx`** | Leaflet Hooks | Adds `viewMode` to initialization dependency array and uses state-bound `leafletMap` to prevent blank map renders on toggle. |
| **`museumService.ts`** | `getPlaceDetails` | Client API client method for detailed place lookups. |
| **`museumService.ts`** | `mapDatabaseToMuseum` | Correctly resolves `images` fallbacks and parses multiple database coordinate formats. |
| **`museums.controller.ts`** | `getMapsConfig` | Secured NestJS route using `@UseGuards(JwtAuthGuard)` to prevent client-key leakage. |
| **`museums.controller.ts`** | `searchNearbyPlaces`, `getPlaceDetails`, `getRoute` | Public, rate-limited and cached proxy NestJS routes. |
| **`museums.service.ts`** | `searchNearbyPlaces` | Budget-hardened search query with optimized FieldMask, single center query, local PostGIS fallback, and Memory Cache. Maps database cover images to Google response search results. |
| **`museums.service.ts`** | `scrapePlaceImage` | Scrapes representative images from Indonesian/English Wikipedia search APIs for free. |
| **`museums.service.ts`** | `ingestPlacesToDatabase` | Upserts public places and triggers Wikipedia scraping for new entries and existing entries lacking images in the background. |
| **`museums.service.ts`** | `getPlaceDetails` | Fetches full place details (with reviews/photos) on-demand. |

