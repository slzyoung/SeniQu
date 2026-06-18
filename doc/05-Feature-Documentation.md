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
