# SeniQu WebApp — Photography Hub & Web3 Marketplace Documentation

This document describes the design, database schema, APIs, and Web3 Solana transaction simulation implemented for the **SeniQu Photography Hub**.

---

## 1. Feature Overview
The Photography Hub is a decentralized social network and marketplace for digital art, heritage, and modern photography. It supports:
- **Public & Private Collections**: Photographers can bundle works into collections, choosing to showcase them or make them for sale.
- **Discover Feed**: Browse trending, latest, or category-filtered photography submissions.
- **Social Interactions**: Double-tap to like, leave threaded comments, and view EXIF technical metadata.
- **Web3 Solana Purchases**: Buy licenses instantly for SOL tokens.
- **Bids & Offers Negotiation**: Users can make offers in SOL for any creation (even if not listed for sale), allowing the author to accept or reject them.
- **Photographer Profiles**: Sleek, theme-aware layout showing brand cooperations, verification badges, stats, and **Total Solana Earnings** collected from sales.

---

## 2. Database Schema

The Photography Hub leverages the following PostgreSQL tables via Supabase:

### `photo_collections`
Stores collections created by photographers.
- `id` (UUID, Primary Key)
- `user_id` (UUID, references users)
- `title` (text, non-empty)
- `description` (text)
- `cover_photo_id` (UUID, references photos)
- `is_public` (boolean, default true)
- `created_at` / `updated_at` (timestamps)

### `photos`
Individual photo uploads indexed with Cloudflare R2 URLs and EXIF details.
- `id` (UUID, Primary Key)
- `user_id` (UUID, references users)
- `title` (text)
- `description` (text)
- `original_url` (text)
- `thumbnail_url` (text)
- `is_for_sale` (boolean, default false)
- `price` (numeric, represented in SOL)
- `currency` (text, default 'SOL')
- `camera_make` / `camera_model` / `lens` / `aperture` / `shutter_speed` / `iso` (EXIF strings)
- `likes_count` / `comments_count` / `downloads_count` (integers)
- `status` (text, default 'active')

### `photo_offers`
Bidding records for purchase proposals.
- `id` (UUID, Primary Key)
- `photo_id` (UUID, references photos)
- `buyer_id` (UUID, references users)
- `amount` (numeric, amount of SOL bid)
- `currency` (text, 'SOL')
- `status` (text: 'pending', 'accepted', 'rejected', 'cancelled')

### `photo_purchases`
Successful transactions recording asset download licenses.
- `id` (UUID, Primary Key)
- `photo_id` (UUID, references photos)
- `buyer_id` (UUID, references users)
- `seller_id` (UUID, references users)
- `amount` (numeric)
- `currency` (text, 'SOL')
- `transaction_ref` (text, blockchain simulation hash)
- `status` (text: 'completed')

---

## 3. Backend REST APIs

All routes are mounted under the `/photos` endpoint in NestJS:

- **GET `/photos`**: Fetch public photos with filters (category, query, sort).
- **POST `/photos/upload`**: Multipart upload handling R2 storage upload.
- **POST `/photos/:id/comments`**: Post comments.
- **GET `/photos/:id/comments`**: Fetch threaded comments.
- **POST `/photos/:id/offers`**: Make bid on a photo.
- **GET `/photos/:id/offers`**: Fetch bids for a photo.
- **PATCH `/photos/offers/:offerId/status`**: Update bid status (Accepting automatically rejects all other pending bids and creates a completed purchase).
- **GET `/photos/photographers/:userId/stats`**: Get photographer profile stats, including total Solana earnings.

---

## 4. Frontend Architecture

- **`MyCollectionsPage.tsx`**: Main landing hub displaying photographer's own collections and photo uploads. Mapped to theme-aware variables.
- **`PhotoLightbox.tsx`**: Dual-pane overlays for photo details. Supports:
  - High-resolution preview.
  - Interactive Like and Threaded Comments.
  - Bid submission for both listed and unlisted creations.
  - Automatic avatar loading for photo owner, comment authors, and offer buyers.
- **`PhotographerProfile.tsx`**: Slide-over layout containing creator verification details, contact actions, horizontal brand cooperation tags, and a **Solana Marketplace Earnings** summary card.
- **`SolanaPurchaseModal.tsx`**: Checkout process simulation communicating with mock Web3 wallet providers (Phantom / Solflare) for instant purchases.

---

## 5. Secure E2E In-App Chat & Photography Requests

SeniQu WebApp features an integrated, high-security transaction/commission coordination system that prevents scammers while allowing seamless communications.

### 5.1 Photography Requests (`RequestBoard`)
The photography requests dashboard allows users to open commissions for photo shoots or post-processing work:
* **Multi-Currency Support**: Budget specification in **Solana (SOL)**, **Indonesian Rupiah (IDR)**, or **US Dollars (USD)**.
* **Light / Dark Theme Adaptive**: Beautiful glassmorphic design adapting to system-wide theme tokens (`var(--bg-primary)`, `var(--text-gold)`, etc.).
* **Submitter Chat Coordination**: Direct link for clients to securely message photographers who submit bids to their projects.

### 5.2 Security Architecture: Client-Side E2E Encryption
All communications are fully encrypted client-side using the standard **Web Crypto API (SubtleCrypto)** before being sent to the backend. The backend stores only ciphertext and initialization vectors (IVs):
1. **Key Generation**: When a chat session starts, the browser generates an ephemeral Elliptic Curve key pair (`ECDH P-256`) in-memory. Keys are never saved to localStorage or exposed to network transport.
2. **Key Exchange & Shared Secret**: Browsers derive a shared AES-256-GCM symmetric key via `ECDH` from the recipient's public key.
3. **Fallback Symmetric Derivation**: If a key exchange is pending, a deterministic shared key is derived client-side via **PBKDF2 with SHA-256** using salted combinations of both user IDs.
4. **Anti-Scam Protection**:
   * **Suspicious Activity Reporting**: Users can report scam attempts or suspicious messages. Reports are logged in the database for admin audits.
   * **Direct Block List**: Users can block scammers directly in-app, preventing them from sending subsequent messages.
   * **Self-Messaging Prevention**: Action buttons are dynamically hidden when users view their own profiles, preventing self-messaging loops.

### 5.3 Messaging Database Schema

#### `conversations`
Initiates a secure chat channel between two participants.
* `id` (UUID, Primary Key)
* `participant_a` (UUID, References `public.users(id)`)
* `participant_b` (UUID, References `public.users(id)`)
* `last_message_at` (TIMESTAMP)
* `last_message_preview` (TEXT, stores ciphertext preview indicator)
* `created_at` (TIMESTAMP)

#### `messages`
Stores encrypted payloads.
* `id` (UUID, Primary Key)
* `conversation_id` (UUID, References `public.conversations(id)`)
* `sender_id` (UUID, References `public.users(id)`)
* `recipient_id` (UUID, References `public.users(id)`)
* `encrypted_content` (TEXT, Base64 AES-256-GCM ciphertext)
* `iv` (TEXT, Base64 initialization vector)
* `sender_public_key` (TEXT, JWK public key for key exchange)
* `is_read` (BOOLEAN, default false)
* `created_at` (TIMESTAMP)

#### `message_blocks`
Restricts communications between blocker and blocked users.
* `id` (UUID, Primary Key)
* `blocker_id` (UUID, References `public.users(id)`)
* `blocked_id` (UUID, References `public.users(id)`)
* `created_at` (TIMESTAMP)

#### `message_reports`
Audit logs for anti-scam flag submissions.
* `id` (UUID, Primary Key)
* `message_id` (UUID, References `public.messages(id)`)
* `reporter_id` (UUID, References `public.users(id)`)
* `reported_user_id` (UUID, References `public.users(id)`)
* `reason` (TEXT)
* `created_at` (TIMESTAMP)

### 5.4 Backend REST APIs (`/messages`)
Nested under NestJS `/messages` path with active JWT authentication guards:
* **POST `/messages/send`**: Validates rate limits (max 30 msgs/min), verifies user blocks, updates conversation, and inserts encrypted message payload.
* **GET `/messages/conversations`**: Lists all active chat sessions with other users' public names, avatar resources, and calculated unread message counts.
* **GET `/messages/conversations/:conversationId`**: Lists decrypted history client-side and marks all received messages as read.
* **GET `/messages/search-users`**: Searches all public user profiles on the platform by username or display name (with ilike query matching), automatically sorting followed users first and filtering out blocked users or self for security.
* **GET `/messages/followed-users`**: Lists users followed by the current user to display as online/active contacts, with real block-list filtering.
* **GET `/messages/unread`**: Fetches the total number of unread incoming messages.
* **POST `/messages/report`**: Registers anti-scam report flags.
* **POST `/messages/block/:userId`**: Blocks a user.
* **DELETE `/messages/block/:userId`**: Unblocks a user.

### 5.5 Messaging Frontend Architecture
* **`messagingService.ts`**: Web Crypto-based client service for AES encryption/decryption, ECDH key derivation, user search, followed contact fetch, and API integrations.
* **`ChatDrawer.tsx`**: Elegant, premium glassmorphic bottom drawer with smooth slide-up animation. Implements E2E decryption, typing checks, read receipts, and anti-scam block/report options.
* **`MessagesPage.tsx`**: A full-featured, premium double-pane messaging interface located at `/dashboard/messages`.
  * **Unified Search Input**: Modern pill-shaped input with a clear button that queries matching active chats and queries the global user database by username in real-time.
  * **Online Friends Carousel**: Horizontal story-style scrolling section displaying avatars of followed users with simulated/live active online indicator dots.
  * **Unread Message Badges**: Displays unread messages counter in a blue circle on conversation cards.
  * **Optimistic Channel Startup**: Supports starting secure conversations with new search/carousel users optimistically, upgrading the channel to a persistent database entry upon the first sent message.
  * **Adaptive Theme Support**: Complete, sleek glassmorphism adjusting seamlessly between light and dark themes.
* **`RequestBoard.tsx`**: Connects clients and bidding photographers using E2E direct messages.
* **`PhotographerProfile.tsx`**: Hides action bars automatically when viewing own profile to prevent self-chatting.

