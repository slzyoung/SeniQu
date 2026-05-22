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

---

## 6. Summary of Code References

| File | Component / Method | Description |
|------|-------------------|-------------|
| **`PublicNearbyPage.tsx`** | `PublicNearbyPage` | Uses `useAuthStore` to conditionally fetch Google Maps API key only when authenticated, bypassing requests for guest users. |
| **`PublicNearbyPage.tsx`** | `NearbyPageInner` | Dynamically hides map selection controls and defaults to OpenStreetMap for guest users. Defaults mapProvider to OSM for logged-in users to save load costs. |
| **`museumService.ts`** | `getPlaceDetails` | Client API client method for detailed place lookups. |
| **`museums.controller.ts`** | `getMapsConfig` | Secured NestJS route using `@UseGuards(JwtAuthGuard)` to prevent client-key leakage. |
| **`museums.controller.ts`** | `searchNearbyPlaces`, `getPlaceDetails`, `getRoute` | Public, rate-limited and cached proxy NestJS routes. |
| **`museums.service.ts`** | `searchNearbyPlaces` | Budget-hardened search query with optimized FieldMask, single center query, local PostGIS fallback, and Memory Cache. |
| **`museums.service.ts`** | `getPlaceDetails` | Fetches full place details (with reviews/photos) on-demand. |

