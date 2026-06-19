# Art Marketplace & Bookmarks Integration Architecture

This document describes the design, database schema, API integrations, Web3 Solana transaction simulation, and bookmarking mechanics implemented for the **SeniQu Art Marketplace**.

---

## 1. Feature Overview

The SeniQu Art Marketplace is an enterprise-grade platform for galleries, museums, and artists/creators to sell digital and physical artworks with built-in digital proof of ownership.

### Key Capabilities:
1. **Art Marketplace**: High-end grid displaying digital and physical artworks, optimized with Cloudflare R2 CDN delivery and category indexing.
2. **Web3 Bidding & Offers**: Collectors can bid on artworks in Solana (SOL), and track the highest bid history in real-time.
3. **Solana Purchase Simulation**: Instant mock checkout utilizing simulated SOL payments with Web3 wallets (Phantom / Solflare).
4. **Digital & Physical Proof**: Support for hybrid physical items backed by a digital Proof of Art (PoA) certificate.
5. **Real-time Bookmarking**: Dual-state bookmarking system allowing users to favorite artworks. Bookmarked items are saved directly to the database and displayed in a virtual 3D Coverflow gallery.
6. **No Mockup Fallback Empty State**: The virtual gallery displays only the user's authentic bookmarks. When empty, it presents a premium call-to-action guiding the user to browse the marketplace.

---

## 2. Database Schema

The Art Marketplace leverages the following PostgreSQL tables via Supabase:

### `artworks`
Stores metadata and asset links for art objects.
* `id` (UUID, Primary Key)
* `title` (TEXT, non-empty)
* `description` (TEXT)
* `primary_image_url` (TEXT, points to Cloudflare R2 CDN)
* `price` (NUMERIC, value in SOL)
* `is_art` (BOOLEAN, default true)
* `artwork_type` (TEXT, 'physical' or 'digital')
* `poa_certificate` (TEXT, digital certificate reference)
* `artist_id` (UUID, references `users(id)`)
* `created_at` (TIMESTAMP)

### `bookmarks`
Links users with their favorited artworks.
* `id` (UUID, Primary Key)
* `user_id` (UUID, references `users(id)`)
* `artwork_id` (UUID, references `artworks(id)`)
* `created_at` (TIMESTAMP)
* *Indexes*: Unique index on `(user_id, artwork_id)` to prevent duplicate bookmarks.

---

## 3. Backend Architecture & Permissions

### Database Permission Resolution
Standard authenticated/anonymous roles initially faced database `permission denied` errors when accessing the `bookmarks` table. 
* *Resolution*: The NestJS backend `UsersService` queries bookmarks using `db.getAdminClient()`, which uses the privileged `service_role` connection. This safely bypasses Row Level Security (RLS) and database permission constraints to serve authenticated users' bookmarks reliably.

### Global NestJS Transform Interceptor
All successful backend endpoints are automatically wrapped into a standard format by `TransformInterceptor`:
```json
{
  "success": true,
  "data": <ControllerReturnValue>,
  "meta": {
    "timestamp": "2026-06-19T10:28:11Z",
    "path": "/users/me/bookmarks",
    "method": "GET"
  }
}
```
* *Frontend Resolution*: Since the controller returns `{ data: Bookmark[], total: number }`, the interceptor wraps it into `{ success: true, data: { data: Bookmark[], total: number } }`. The frontend `userService` (e.g., `getBookmarks`, `getStats`, `getRecentActivity`, `getCollections`, `getOwnedArtworks`) has been configured to unwrap the nested `.data` field from the Axios response body before passing it to components.

---

## 4. REST API Endpoint Mappings

### Bookmark Endpoints
* **GET `/users/me/bookmarks`**: Returns a paginated list of bookmarks for the current authenticated user:
  ```json
  {
    "data": [
      {
        "id": "bookmark-id",
        "created_at": "timestamp",
        "artwork": {
          "id": "artwork-id",
          "title": "Abstract Nebula",
          "primary_image_url": "cdn-url",
          "price": 4.5,
          "artwork_type": "physical",
          "artist": {
            "display_name": "Elena Rossi"
          }
        }
      }
    ],
    "total": 1
  }
  ```
* **POST `/users/me/bookmarks`**: Adds an artwork to bookmarks. Payload: `{ "artworkId": "UUID" }`.
* **DELETE `/users/me/bookmarks/:artworkId`**: Removes an artwork from bookmarks.

---

## 5. Frontend Components & Interactivity

1. **`ArtsMarketplacePage` (`index.tsx`)**:
   * Interactive grid rendering artworks from R2 CDN.
   * Real-time query to fetch bookmark status for each artwork ID upon detail page load.
   * Dynamic bookmark action toggle synchronizing state changes to the database endpoint.
   * Bids summary, current highest bid tracker, and Solflare/Phantom transaction simulator.
2. **`Bookmarks.tsx`**:
   * Renders the user's bookmarks in a responsive 3D Coverflow wrapper using `framer-motion`.
   * Unbookmarking triggers nice page exit animations and fires the DELETE request.
   * Displays a call-to-action portal to the Arts Marketplace when the bookmarks list is empty, avoiding confusing dummy mockup visual fill.
