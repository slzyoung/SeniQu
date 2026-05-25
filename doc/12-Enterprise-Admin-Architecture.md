# Enterprise Admin Architecture & Modernization

This document details the comprehensive modernization of the SeniQu platform's administrative and operational infrastructure, focusing on UI/UX overhauls, security hardening, database schema stabilization, and multi-tenant scaling for large-scale operations.

---

## 1. Unified Glassmorphic UI/UX Redesign

A major initiative was undertaken to transition all administrative dashboards away from fragmented designs into a cohesive, premium interface suitable for enterprise-grade B2B and B2G users.

### 1.1 Scope of UI Overhaul
- **Super Admin Dashboard**: Centralized governance interface for platforms and system health metrics.
- **Museum Admin**: Curatorial management interface for institutional collection administrators.
- **Gallery Admin**: Commercial exhibition management and marketplace metrics.
- **Heritage/Sites Admin**: Cultural site preservation, geolocation tracking, and place details.
- **Artist Dashboard**: Personal portfolio, marketplace listings, and sales analytics.

### 1.2 Design Language ("The SeniQu Standard")
- **Glassmorphism**: Implementation of subtle translucent backgrounds (`bg-white/80 backdrop-blur-md`) combined with crisp white panels.
- **Rounded 3XL Geometry**: Standardization of border radii to `rounded-3xl` for main containers, fostering a modern, approachable, and premium feel.
- **Micro-interactions**: Consistent hover scaling (`hover:scale-[1.02]`) and dynamic shadow elevation for interactive cards.
- **Light Mode Default**: Aligned the institutional management interfaces with professional enterprise software norms by strictly adopting a clean light-mode theme.

---

## 2. Multi-Admin Scoping & RBAC Isolation

SeniQu is built to support a large hierarchy of administrators: Super Admin, Museum Managers (independent admins for Museum A, B, C across different cities), Gallery Managers (Gallery A, B, C across different cities), and Heritage managers.

### 2.1 Database RBAC Scoping
- **`admin_scope_id` Constraint**: Added to the `users` table, creating a hard relationship between an institutional admin user and their designated `institutions` record.
- **Row-Level Authorization**: Museum/Gallery/Heritage admins are restricted at the controller and database level to only manage, view, and list assets matching their specific `admin_scope_id`.
- **Dynamic Provisioning**: Super Admins can provision pre-verified administrator accounts for museums or galleries, setting their credentials and domain bounds in a 4-step wizard interface.

### 2.2 Storage Tenant Isolation Partitioning
To keep media assets structured, manageable, and performant at a massive scale, the platform enforces directory partitioning within the Cloudflare R2 bucket:
- **Scoping Parameters**: The file upload endpoint accepts optional `scopeId` (representing `admin_scope_id` or artist UUID) and `city` fields.
- **Hierarchical Layout**:
  `[base-folder]/[city]/[scope-id]/[filename].webp`
- **Security & Purging**:
  - Segregates data, making indexing and searching extremely fast on Cloudflare R2.
  - Allows clean deletion of all assets corresponding to a deleted institution by purging the prefix `[base-folder]/[city]/[scope-id]/`.
  - Simplifies folder-level access control policies (S3 bucket delegation).

---

## 3. Terminology Standardization

To align with SeniQu's core mission of cultural preservation and enterprise professionalization, all legacy Web3 "crypto" terminology was purged from the platform's presentation and logic layers.

- **"NFT" to "Art"**: All references to NFTs were replaced with "Art", "Digital Art", or "Digitized Asset".
- **Code Refactoring**: 
  - Frontend components (`nftCount` → `artCount`).
  - React Query hooks (`useAdminStats`, `useArtistStats` updated to parse `artCount`).
  - Form labels and DataGrid headers normalized.

---

## 4. Database Schema & API Stabilization

Significant backend stability updates were executed to resolve complex data-fetching errors and improve the database architecture.

### 4.1 Foreign Key Disambiguation (Resolving 500 Errors)
Resolved critical `500 Internal Server Error` API crashes caused by Supabase/PostgREST relationship ambiguities:
- **The Issue**: With the addition of multiple foreign keys between `institutions` and `users` (`owner_id` and `admin_scope_id`), PostgREST queries using `owner:users(...)` failed to determine which relationship to embed.
- **The Fix**: Implemented explicit constraint references across all services (`MuseumsService`, `AdminService`, `SearchService`, `BookmarksService`).
  - **Institutions**: Updated `.select("*, owner:users!institutions_owner_id_fkey(...)")`.
  - **Artworks**: Updated `.select("*, artist:users!artist_id(...)")`.

---

## 5. Advanced Security Hardening

Authentication and user account security were fortified to prevent unauthorized takeovers and resolve false-positive security blocks.

### 5.1 OTP-Based Password Changes
Migrated the password change workflow from a direct submission model to a secure, Two-Step OTP verification flow:
1. **Request**: User submits current password. Backend generates a 6-digit OTP stored in `otp_codes` and emails it via Brevo SMTP (with a distinct "SECURITY ALERT" subject).
2. **Verify**: User inputs OTP and new password. The system enforces a 5-attempt limit and a 5-minute expiration window before hashing and saving the new password.

### 5.2 Resolving SQL Injection Guard False-Positives
- **The Issue**: The custom OWASP `SqlInjectionGuard` aggressively blocked authentication requests if a user's password contained special characters (e.g., `--`, `#`, `/*`), resulting in `400 - Invalid characters in request` crashes.
- **The Fix**: Applied the custom `@BypassSecurity()` decorator to raw credential endpoints (`/auth/login`, `/auth/register`, `/auth/change-password/*`). Security remains uncompromised as the underlying Prisma/Supabase ORM layer inherently protects against actual SQL injections via query parameterization.

---

## 6. Performance & Data Fetching (Anti-Chunking)

Enterprise dashboards fetching massive amounts of aggregate data are prone to rendering bottlenecks and API throttling.

- **React Query Optimization**: Centralized all data fetching through TanStack React Query.
- **Anti-Chunking**: Configured queries with `staleTime`, `cacheTime`, and `enabled` flags to prevent cascading/duplicated re-renders.
- **Graceful Fallbacks**: Implemented strict empty-state checks (`?? 0`, `?? []`) and default fallback images (`generateAvatar`) to ensure the UI never crashes due to malformed or incomplete payload structures.

---
*Document Version: 1.2.0*
*Last Updated: 2026-05-26*
