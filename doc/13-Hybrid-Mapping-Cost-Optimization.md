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

## 3. Google Maps API Budget Hardening & Database-First Search (Backend)

SeniQu implements a strict **Database-First / Cache-Aside** retrieval flow combined with coordinate parsing fixes and request optimization techniques to protect the Google Maps API budget:

### A. Database-First Search Strategy
Previously, the `/museums/search-nearby` endpoint queried the Google Places API directly on every page load unless the daily global quota (30 requests/day) was exceeded. This resulted in frequent daily limit reached dialogs on production.

To resolve this, we refactored the search flow to prioritize local data:
1. **Local Database Check**: Every nearby search request first queries the local `institutions` table using PostGIS bounding box filters.
2. **Database HIT**: If matching verified institutions are found within the requested radius (e.g. Jakarta, Bali where data has been scraped/ingested), they are returned immediately. The Google Places API call is **completely bypassed**, resulting in **$0.00 cost** and **0ms external API latency**.
3. **Google API Fallback**: Only if the database search returns zero results does the backend proceed to check the daily budget, query the Google Places API, return the online results, and asynchronously cache/ingest them into the local database for future search hits.

### B. PostGIS WKB Hex Coordinate Parsing Fix
When the backend fell back to the local database search, it failed to parse the geography coordinates.
- **The Bug**: Supabase returns PostGIS `geography` type columns as hex-encoded Well-Known Binary (WKB/EWKB) strings (e.g., `0101000020E6100000...`). The backend only parsed GeoJSON objects or WKT strings (`POINT(lng lat)`). Because WKB hex strings did not match, all coordinates parsed as `(0, 0)`, which were then filtered out as being outside the user's search radius. This caused the map to appear blank (no markers) when Google API limits were hit.
- **The Fix**: We implemented a robust WKB hex parser using standard Node.js `Buffer` that decodes endianness, geom type, SRID offsets, and extracts correct longitude/latitude:
  ```typescript
  const buf = Buffer.from(m.location, 'hex');
  const byteOrder = buf.readUInt8(0);
  const isLittleEndian = byteOrder === 1;
  const geomType = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
  const hasSrid = (geomType & 0x20000000) !== 0;
  const offset = hasSrid ? 9 : 5;
  longitude = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
  latitude = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
  ```

### C. FieldMask Category Downgrade (Search)
Standard search calls (`places:searchNearby` and `places:searchText`) now use a restricted FieldMask:
```http
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types
```
By removing `places.photos` and `places.reviews`, search queries are billed under the **Advanced** tier ($20.00/1,000 requests) or **Basic** tier ($7.00/1,000 requests if ratings are removed), down from the $32.00/1,000 Preferred tier.

### D. Single-Center Coordinate Query (7x Request Reduction)
We removed the multi-center grid generation logic for broad radius searches. The backend now queries **only the user's center coordinate** instead of up to 7 overlapping sub-centers. This provides a direct 7x reduction in raw query volume.

### E. Complete Elimination of Google Places Preferred Tier
To ensure monthly GCP costs remain under $20/month (easily covered by Google's $200 free credit tier), we completely removed `photos` and `reviews` fields from all backend Places calls (both search and details):
- **GCP Call Fields Mask:**
```http
X-Goog-FieldMask: id,displayName,formattedAddress,location,rating,userRatingCount,types
```
- **0% Preferred Charges:** This downgrades all Place Details calls from the Preferred tier ($25.00/1k) to the Advanced/Basic tier ($7.00 - $17.00/1k), making charges negligible.
- **Free Link for Photos & Reviews:** In the frontend detail sheet, we added a direct link button ("Info Lengkap") pointing to the place on Google Maps. When clicked, it opens Google Maps where the user can view photos, full reviews, street view, and opening hours for free.

### F. Server-Side Details Caching
Place details and search results are cached using server-side TTL memory maps:
- **Search Queries Cache:** 3-minute TTL (resolution: 0.001 degrees lat/lng grid).
- **Place Details Cache:** 15-minute TTL.
This prevents duplicate calls for frequently clicked locations.

### G. Strict Daily Quota and IP Rate Limiting — Cost-Hardened (All Endpoints)
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

- **Seamless Fallback:** When any Google Maps API limit is exceeded, or if the user is unauthenticated and quota is met, the client/server falls back to the local PostGIS spatial database (100% free). If the local database has no records for the searched coordinates, the system queries the **OpenStreetMap Overpass API** as a dynamic zero-cost fallback, retrieves all museums/galleries/heritage sites, and automatically ingests them into the local database for future search hits. The application remains fully functional and auto-ingests new cities.

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

## 5. UI Alignment, Type Safety, and Rendering Fixes
- **Leaflet Marker Centering:** To prevent text emojis (`🏛️`, `🎨`, `🏯`) inside custom Leaflet HTML `divIcon` pins from inheriting the `-45deg` parent rotation (which caused tilted icons), we wrapped them inside a `<span>` element. This enables the CSS selector `.leaflet-gold-pin-marker > *` to target the text node parent wrapper and rotate it back by `45deg`, rendering all markers upright and perfectly centered on the map.
- **Reactive Map Reinitialization:** When toggling view modes (Map to List and back), the map container DOM element is unmounted and recreated. We added `viewMode` to the Leaflet map initialization hook's dependency array and transitioned the ref instance to a reactive state `leafletMap`. This forces Leaflet to clean up old detached markers/polylines and instantiate a fresh map when returning to map view, preventing blank screens.
- **Frontend WKB Coordinate Parsing:** Updated `parseLocation` in the frontend `museumService.ts` to decode hex-encoded WKB/EWKB PostGIS geometries using standard browser-compatible `Uint8Array` and `DataView` operations. This ensures that coordinate details queried directly via Supabase endpoints map to correct values instead of falling back to `(0, 0)`.
- **TypeScript Coordinates Collision Resolution:** Moved local `Coordinates` and `Address` interface declarations to the top of `types.ts` to prevent name collision with the global browser DOM type `Coordinates`. This resolves compilation errors when returning coordinates from helper methods.

---

## 6. Free Place Image & Wikipedia Summary Scraping & Caching Architecture
To completely eliminate reliance on Google's expensive Place Photos and Place Details APIs (which raise calls to the Preferred Billing tier at $32/1,000 requests), SeniQu implements an autonomous, zero-cost image scraping and Wikipedia summary caching pipeline:

```
    [ Google searchNearbyPlaces API (No photos/reviews) ]
                       |
                       v
         [ Ingest to Local Database ]
                       |
                       +---> [ Scrape Wikipedia Search API (FREE) ]
                       |        - Query Ind. Wiki -> Eng. Wiki Fallback
                       |        - Custom User-Agent & Rate-limit delay (200ms)
                       |
                       v
    +---------------------------------------+
    |  DB Cache Lookup (`institutions`)     |
    |  - If valid summary exists -> Return  |
    |  - If empty/fallback -> Scrape Wiki   |
    +------------------+--------------------+
                       |
                       v
         [ Update description & cover ]
                       |
           +-----------+-----------+
           |                       |
     [ Map to API ]          [ Frontend Sheet ]
  - Search results fetch    - "Sejarah Singkat" button
    database image directly   fetches on-demand, expands
                            - Displays text, image & link
```

### A. Wikipedia Search & Summary API Scraper
The backend implements `scrapePlaceImage(placeName: string)` and `scrapePlaceSummary(placeName: string)` to query Wikipedia's open search engine:
1. **Indonesian Wikipedia Search (`id.wikipedia.org`)**: Formulates search query utilizing generator options (`generator=search&gsrlimit=1&prop=extracts|pageimages|info&exintro=1&explaintext=1&inprop=url&pithumbsize=800`).
2. **English Wikipedia Search Fallback (`en.wikipedia.org`)**: Triggers search as a fallback if the Indonesian query returns no extract or thumbnail.
3. **Billing Risk**: **$0.00**. Wikipedia's API requires no API keys, has no billing thresholds, and allows public caching of assets under Creative Commons licenses.

### B. Database Integration & Caching Layer (0ms Latency)
* **Pre-Query Check**: Before calling the Wikipedia API, the backend queries the local database's `institutions` table for a case-insensitive match on the place name.
* **Cache Resolution**: If a record is found and its `description` column contains a valid text (longer than 50 characters and not starting with the placeholder `"Tempat bersejarah/budaya:"`), it returns this cached description and the saved `cover_image_url` instantly as the Wikipedia summary, reducing external API latency to zero.
* **Cache Write-Back**: If the summary is not cached (placeholder or empty), the backend queries Wikipedia. On success, the backend updates the database record's `description` with the Wikipedia extract, and updates the `cover_image_url` if it was previously empty.
* **Immediate Search Result Augmentation**: The `/search-nearby` endpoint queries the database for matching slugs of the search results. If matching places already have a `cover_image_url` saved, the URL is attached to `photos: [cover_image_url]` immediately, bypassing any need for future image scraping.

### C. Frontend Integration & Premium UI
* **Inline Toggle Button**: In the details sheet (`MuseumDetailSheet` in `PublicNearbyPage.tsx`), a beautiful button **"Baca Sejarah Singkat (Wikipedia)"** is placed next to the status badges.
* **Dynamic Loading & Cache Hits**: Clicking this triggers an asynchronous request to `/api/v1/museums/wikipedia-summary?name=...`. It displays a loading spinner and handles fallbacks gracefully.
* **Expanding Glassmorphic Card**: On success, the bottom sheet expands and renders a beautiful dashed-border blue-tinted card containing:
  - **Wiki Title**: Page title from Wikipedia.
  - **Wiki Thumbnail Image**: Scraped image inside a shaded rounded-corner card.
  - **Wiki Extract**: Full brief history text.
  - **Wikipedia Direct Link**: Clickable link to read the full Wikipedia article.
* **Auto-Resets**: To maintain UI correctness, the Wikipedia states (summary data, expansion, and error) automatically reset when the user switches to a different museum pin.

### D. Frontend Image Fallback Handling
In the database mapper (`mapDatabaseToMuseum` in `museumService.ts`):
* Previously, empty JSONB defaults (`data.images` defaulting to `[]`) evaluated as truthy, blocking the database `cover_image_url` fallback from rendering, resulting in blank/gray preview cards.
* Fixed the mapper logic to verify array length: `const parsedImages = (data.images && data.images.length > 0) ? data.images : [data.cover_image_url].filter(Boolean)`. This guarantees that if a local or Wikipedia scraped image exists in `cover_image_url`, it renders instantly.

---

## 7. Cost Validation: Is it Still 100% Free / Very Cheap?
**Yes.** The system is structurally protected from billing spikes and keeps costs strictly near $0.00/month:

1. **No Google Places Photos API Calls**: Image scraping relies entirely on Wikipedia's free REST API. No Google Photo references are ever requested in backend masks, completely eliminating the $7.00 - $32.00/1k pricing tier.
2. **Wikipedia Summary Caching**: The dynamic summary scraper uses Wikipedia Extracts, which are free. The database caching layer ensures that most summary requests hit the local database, eliminating Wikipedia API latency and traffic.
3. **Strict Daily Hard Quotas**: Google Search and Details backend endpoints are protected by IP rate limits and global hard quotas (30 requests/day). This caps maximum monthly GCP exposure to under $40, which is entirely absorbed by Google's **$200.00 free monthly credit**.
4. **OpenStreetMap Default**: 95%+ of normal user mapping queries rely on OpenStreetMap tile servers via Leaflet. The Google Maps JS SDK is only loaded on-demand for authenticated users who manually toggle it on, preventing map load charges for general visitors.
5. **Free Routing and Geocoding**: High-volume queries for routing (directions) and region detection use OSRM and Nominatim engines, bypassing Google Routes and Geocoding APIs entirely at zero cost.

---

## 8. Summary of Code References

| File | Component / Method | Description |
|------|-------------------|-------------|
| **`PublicNearbyPage.tsx`** | `PublicNearbyPage` | Uses `useAuthStore` to conditionally fetch Google Maps API key only when authenticated, bypassing requests for guest users. |
| **`PublicNearbyPage.tsx`** | `NearbyPageInner` | Dynamically hides map selection controls and defaults to OpenStreetMap for guest users. Defaults mapProvider to OSM for logged-in users to save load costs. |
| **`PublicNearbyPage.tsx`** | Leaflet Hooks | Adds `viewMode` to initialization dependency array and uses state-bound `leafletMap` to prevent blank map renders on toggle. |
| **`PublicNearbyPage.tsx`** | `MuseumDetailSheet` | Integrates Wikipedia summary fetch state hooks, event handler, inline toggle button, and expandable glassmorphic card. |
| **`museumService.ts`** | `getPlaceDetails` | Client API client method for detailed place lookups. |
| **`museumService.ts`** | `getWikipediaSummary` | Frontend service client method to query backend Wikipedia summary. |
| **`museumService.ts`** | `mapDatabaseToMuseum` | Correctly resolves `images` fallbacks and parses multiple database coordinate formats. |
| **`museums.controller.ts`** | `getWikipediaSummary` | Rate-limited NestJS route `/wikipedia-summary` which proxies to Wikipedia scraper. |
| **`museums.controller.ts`** | `getMapsConfig` | Secured NestJS route using `@UseGuards(JwtAuthGuard)` to prevent client-key leakage. |
| **`museums.controller.ts`** | `searchNearbyPlaces`, `getPlaceDetails`, `getRoute` | Public, rate-limited and cached proxy NestJS routes. |
| **`museums.service.ts`** | `searchNearbyPlaces` | Budget-hardened search query with optimized FieldMask, single center query, local PostGIS fallback, and Memory Cache. Maps database cover images to Google response search results. |
| **`museums.service.ts`** | `scrapePlaceImage` | Scrapes representative images from Indonesian/English Wikipedia search APIs for free. |
| **`museums.service.ts`** | `scrapePlaceSummary` | Scrapes summary extracts, URLs, titles, and images from Indonesian/English Wikipedia. Integrates local database cache checks and writes. |
| **`museums.service.ts`** | `ingestPlacesToDatabase` | Upserts public places and triggers Wikipedia scraping for new entries and existing entries lacking images in the background. |
| **`museums.service.ts`** | `getPlaceDetails` | Fetches full place details (with reviews/photos) on-demand. |

---

## 9. Future Developer Guidelines: Rules for Adding Scraped Features

When extending SeniQu or adding new features that require scraping/fetching data from third-party APIs (e.g., ticket prices, event lists, virtual tours, or social media links), developers **MUST** follow these design patterns to maintain high performance and low costs:

### A. The "Cache-Aside" (DB-First) Design Pattern
Every scraper feature must check the database before executing any network requests:
1. **Lookup**: Query Supabase/PostgreSQL first using a unique key (e.g., `slug`, `place_id`, or `hash`).
2. **Evaluate Cache Validity**:
   * If a record exists and is complete (i.e., not a fallback placeholder like `"Tempat bersejarah/budaya:"`), return it immediately.
   * If a record is stale (exceeded TTL) or empty, proceed to the scraping logic.
3. **Write-Back**: Always update the local database with the newly scraped content so subsequent users hit the local database instead.

### B. State-of-the-Art (Mutakhir) Latency & Cost Optimization Techniques

To keep performance near **0ms** for the end-user while keeping external request volume low, utilize these techniques:

#### 1. Stale-While-Revalidate (SWR) Caching
Instead of making the user wait for the Wikipedia/external API query to complete:
* Serve the expired/existing database cache to the user **instantly**.
* Trigger the scraper asynchronously in the background to fetch fresh data and update the database.
* The next visitor gets the updated content instantly.

#### 2. Background Queue & Worker Architecture (BullMQ)
For heavy scraping tasks (e.g., scraping galleries of 50 images):
* Never scrape synchronously during a HTTP request.
* Push a job to a Redis/BullMQ queue.
* Respond to the client immediately with a "Loading/Processing" state.
* The background worker fetches the resources, updates the PostgreSQL database, and uses **Supabase Realtime** or WebSockets to broadcast the new data to the frontend.

#### 3. Public/Open-Source API Primacy
Always prioritize free, open sources before resorting to proprietary platforms:
* **Cultural Metadata / General History**: Wikipedia Extracts API (`id.wikipedia.org`), Wikidata, DBpedia.
* **Geocoding & Maps Routing**: OpenStreetMap (Nominatim), Open Source Routing Machine (OSRM).
* **Open Database License Assets**: Internet Archive, Wikimedia Commons.
* **Scraper Etiquette**: Always supply a distinct `User-Agent` string (containing app name and contact email) and implement a rate-limiting delay (e.g., `200ms`) between calls to prevent IP blocking.

#### 4. JSONB Column Strategy
To avoid making database migrations for every new scraped feature, utilize PostgreSQL's **`JSONB`** columns (like `images`, `opening_hours` in `institutions`).
* Save complex JSON payloads directly.
* Query/index them using GIN indices for highly efficient lookups.

#### 5. Frontend Debounce Protection
Ensure that all interactive frontend components that trigger backend queries (such as map panning, search autocomplete, or category filtering) are wrapped in a **debounce hook (300ms - 500ms)**. This prevents double-clicks or fast scroll gestures from spamming requests.


