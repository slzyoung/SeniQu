# API Reference

## 1. Overview

The Seniqu API is a RESTful API built with NestJS. All endpoints are prefixed with `/api/v1/`.

**Base URL:** `http://localhost:3001/api/v1`

**Swagger Documentation:** `http://localhost:3001/api/docs`

## 2. Authentication

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with email/password | No |
| GET | `/auth/google/initiate` | Initiate Google OAuth (returns auth URL, sets cookie) | No |
| GET | `/auth/google/callback` | Google OAuth callback (PKCE + state + nonce verified) | No |
| POST | `/auth/privy` | Login with Privy wallet | No |
| POST | `/auth/refresh` | Refresh access token | Refresh Token |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/auth/link-wallet` | Link Solana wallet to account | Yes |

### Request Examples

```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password1!", "displayName": "John"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password1!"}'
```

### Google OAuth (Hardened Server-Side Flow)

The Google OAuth flow uses PKCE, HMAC-signed state, and nonce verification:

1. Frontend calls `GET /api/v1/auth/google/initiate`
   - Backend generates PKCE pair, signed state, nonce
   - Stores them in a signed httpOnly cookie `__oauth_params`
   - Returns `{ authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }`
2. Frontend redirects user to `authUrl`
3. Google redirects to `GET /api/v1/auth/google/callback?code=xxx&state=yyy`
4. Backend validates state (HMAC signature + 10-min expiry), exchanges code with `code_verifier` (PKCE), verifies `nonce` in ID token
5. Backend redirects to frontend with JWT in hash fragment:
   ```
   https://seniquapp.netlify.app/auth/callback#access_token=...&refresh_token=...&user=...
   ```

> **Security:** PKCE (RFC 7636), HMAC-SHA256 signed state, nonce replay protection, signed httpOnly cookies.

---

## 3. Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update current user | Yes |
| GET | `/users/:id` | Get user by ID | No |
| GET | `/users/:id/artworks` | Get user's artworks | No |
| POST | `/users/:id/follow` | Follow user | Yes |
| DELETE | `/users/:id/follow` | Unfollow user | Yes |

---

## 4. Artworks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/artworks` | List published artworks | No |
| GET | `/artworks/:id` | Get artwork by ID | No |
| POST | `/artworks` | Create artwork | Artist |
| PUT | `/artworks/:id` | Update artwork | Owner |
| DELETE | `/artworks/:id` | Delete artwork | Owner/Admin |
| POST | `/artworks/:id/like` | Like artwork | Yes |
| DELETE | `/artworks/:id/like` | Unlike artwork | Yes |

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `style` | string | Filter by style |
| `medium` | string | Filter by medium |
| `priceMin` | number | Minimum price |
| `priceMax` | number | Maximum price |
| `sort` | string | Sort by: newest, popular, price |

---

## 5. Museums

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/museums` | List verified museums | No |
| GET | `/museums/:id` | Get museum by ID | No |
| GET | `/museums/nearby` | Find nearby museums | No |
| POST | `/museums` | Create museum | Institution |
| PUT | `/museums/:id` | Update museum | Owner |
| DELETE | `/museums/:id` | Delete museum | Admin |
| PUT | `/museums/:id/verify` | Verify museum | Admin |
| PUT | `/museums/:id/feature` | Feature museum | Admin |

### Nearby Search

```bash
GET /museums/nearby?lat=-6.2088&lng=106.8456&radius=25
```

---

## 6. Bookmarks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookmarks` | Get user's bookmarks | Yes |
| POST | `/bookmarks` | Add bookmark | Yes |
| DELETE | `/bookmarks/:artworkId` | Remove bookmark | Yes |
| GET | `/bookmarks/:artworkId/check` | Check if bookmarked | Yes |

---

## 7. Forum

### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forum/categories` | List categories | No |
| GET | `/forum/categories/:id` | Get category | No |

### Threads

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forum/threads` | List threads | No |
| GET | `/forum/threads/:id` | Get thread | No |
| POST | `/forum/threads` | Create thread | Yes |
| PUT | `/forum/threads/:id/pin` | Pin thread | Admin |
| PUT | `/forum/threads/:id/lock` | Lock thread | Admin |

### Posts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forum/threads/:id/posts` | List posts | No |
| POST | `/forum/threads/:id/posts` | Create post | Yes |
| PUT | `/forum/posts/:id` | Update post | Owner |
| DELETE | `/forum/posts/:id` | Delete post | Owner/Admin |

---

## 8. Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Global search | No |
| GET | `/search/artworks` | Advanced artwork search | No |
| GET | `/search/nearby` | Nearby institutions | No |
| GET | `/search/suggestions` | Autocomplete | No |

### Search Parameters

```bash
# Global search
GET /search?q=batik&type=all

# Advanced artwork search
GET /search/artworks?q=batik&style=traditional&priceMin=1000000&priceMax=10000000

# Nearby search
GET /search/nearby?lat=-6.2088&lng=106.8456&radius=50
```

---

## 9. Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/artist` | Artist dashboard stats | Artist |
| GET | `/analytics/artist/artworks` | Artwork performance | Artist |
| GET | `/analytics/artist/sales` | Sales analytics | Artist |
| GET | `/analytics/admin` | Admin dashboard | Admin |
| GET | `/analytics/admin/users` | User growth | Admin |
| GET | `/analytics/admin/content` | Content metrics | Admin |
| POST | `/analytics/track` | Track event | Yes |

---

## 10. Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List user notifications | Yes |
| GET | `/notifications/unread-count` | Get unread count | Yes |
| PUT | `/notifications/:id/read` | Mark as read | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |

---

## 11. Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List all users | Admin |
| PUT | `/admin/users/:id/role` | Change user role | Admin |
| PUT | `/admin/users/:id/ban` | Ban user | Admin |
| GET | `/admin/artworks/pending` | Pending artworks | Admin |
| PUT | `/admin/artworks/:id/approve` | Approve artwork | Admin |
| PUT | `/admin/artworks/:id/reject` | Reject artwork | Admin |
| GET | `/admin/audit-logs` | View audit logs | Security Admin |

---

## 12. Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "email", "message": "must be a valid email" }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## 13. Rate Limits

| Tier | Limit | Window |
|------|-------|--------|
| Short | 10 requests | 1 second |
| Medium | 50 requests | 10 seconds |
| Long | 100 requests | 1 minute |

When rate limited, response includes:

```
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1675432800
```
