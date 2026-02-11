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
| POST | `/auth/privy` | Login with Privy embedded wallet | No |
| POST | `/auth/wallet` | Login with manual wallet signature | No |
| POST | `/auth/refresh` | Refresh access token | Refresh Token |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/auth/link-wallet` | Link Solana wallet to account | Yes |

### Email/Password Authentication

```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password1!", "username": "johndoe", "displayName": "John"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password1!"}'
```

### Manual Wallet Authentication

Authenticate with any supported wallet extension (Phantom, Solflare, MetaMask) via signature verification.

**Step 1 — Request nonce:**

```bash
curl -X POST http://localhost:3001/api/v1/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "7xKX...abc", "chain": "solana"}'
```

**Response:**
```json
{
  "nonce": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Sign this message to authenticate with Seniqu:\n\nNonce: a1b2c3d4-e5f6-7890-abcd-ef1234567890\nWallet: 7xKX...abc\nTimestamp: 2026-02-11T10:30:00Z"
}
```

**Step 2 — Submit signature:**

```bash
curl -X POST http://localhost:3001/api/v1/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7xKX...abc",
    "signature": "3xYz...encoded_signature",
    "nonce": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "chain": "solana"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": null,
    "username": "wallet_user_123",
    "walletAddress": "7xKX...abc",
    "role": "user"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "dGhpcyBp..."
}
```

### Google OAuth (Hardened Server-Side Flow)

1. Frontend calls `GET /api/v1/auth/google/initiate`
   - Backend generates PKCE pair, signed state, nonce
   - Stores them in a signed httpOnly cookie `__oauth_params`
   - Returns `{ authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }`
2. Frontend redirects user to `authUrl`
3. Google redirects to `GET /api/v1/auth/google/callback?code=xxx&state=yyy`
4. Backend validates state (HMAC + 10-min expiry), exchanges code with PKCE, verifies nonce
5. Backend redirects to frontend with JWT in hash fragment

> [!NOTE]
> Security: PKCE (RFC 7636), HMAC-SHA256 signed state, nonce replay protection, signed httpOnly cookies.

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

## 4. Wallet

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/wallet/nonce` | Request a signature nonce | No |
| GET | `/wallet/connections` | List user's connected wallets | Yes |
| POST | `/wallet/connections` | Connect a new wallet | Yes |
| DELETE | `/wallet/connections/:id` | Disconnect wallet | Yes |
| GET | `/wallet/balances` | Get cached wallet balances | Yes |
| GET | `/wallet/balances/refresh` | Force-refresh balances from chain | Yes |
| GET | `/wallet/transactions` | List wallet transactions | Yes |
| POST | `/wallet/withdraw` | Initiate withdrawal | Yes |

### Withdrawal Request

```bash
curl -X POST http://localhost:3001/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "uuid-of-embedded-wallet-connection",
    "toAddress": "7xKX...recipient",
    "amount": "1.5",
    "tokenMint": null,
    "chain": "solana"
  }'
```

**Response:**
```json
{
  "transactionId": "uuid",
  "status": "pending",
  "txHash": null,
  "estimatedFee": "0.000005"
}
```

### Transaction History

```bash
curl -X GET "http://localhost:3001/api/v1/wallet/transactions?page=1&limit=20&type=deposit" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `type` | string | Filter: `deposit`, `withdraw`, `transfer_in`, `transfer_out` |
| `status` | string | Filter: `pending`, `confirmed`, `failed` |
| `chain` | string | Filter by chain: `solana`, `ethereum` |

---

## 5. Artworks

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

## 6. Museums

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

## 7. Bookmarks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookmarks` | Get user's bookmarks | Yes |
| POST | `/bookmarks` | Add bookmark | Yes |
| DELETE | `/bookmarks/:artworkId` | Remove bookmark | Yes |
| GET | `/bookmarks/:artworkId/check` | Check if bookmarked | Yes |

---

## 8. Forum

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

## 9. Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Global search | No |
| GET | `/search/artworks` | Advanced artwork search | No |
| GET | `/search/nearby` | Nearby institutions | No |
| GET | `/search/suggestions` | Autocomplete | No |

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
    { "field": "walletAddress", "message": "must be a valid wallet address" }
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
| 409 | Conflict (wallet already linked, duplicate) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## 13. Rate Limits

| Tier | Limit | Window |
|------|-------|--------|
| Short | 10 requests | 1 second |
| Medium | 50 requests | 10 seconds |
| Long | 100 requests | 1 minute |

**Wallet-specific limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /wallet/nonce` | 5 requests | 1 minute |
| `POST /auth/wallet` | 3 requests | 1 minute |
| `POST /wallet/withdraw` | 3 requests | 5 minutes |

When rate limited, response includes:

```
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1675432800
```
