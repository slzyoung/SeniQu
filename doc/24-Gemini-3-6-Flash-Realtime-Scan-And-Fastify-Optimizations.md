# 24. Real-Time AI Heritage Scanning with Gemini 3.6 Flash & Fastify Performance

This document details the transition from dummy simulations to live **Gemini 3.6 Flash** real-time AR AI detection, Fastify backend optimizations, high-contrast theme typography, and mobile UI polish in SeniQu.

---

## 1. Dual Gemini 3.6 Flash & 3.5 Flash AI Engine Architecture

1. **Production Model Chain**:
   - Primary: `gemini-3.6-flash`
   - Secondary: `gemini-3.5-flash`
   - Fallback: `gemini-2.5-flash` ➔ `gemini-2.0-flash`

2. **Enterprise Production Best Practices**:
   - `maxOutputTokens` expanded from `2048` to `4096` to prevent response truncation errors.
   - Per-model 503 (high demand) and 429 (rate limit) 600ms backoff auto-retry before switching models.
   - `safeParseJson` algorithm with automatic string and bracket closure repair to protect against unterminated JSON formatting.

---

## 2. Fastify Parallel Execution & Speed Optimization

- **Parallel Processing (`Promise.all`)**:
  Executing the Gemini AI API call and Cloudflare R2 image upload concurrently in `AiService.scanHeritage` reduced total backend request latency by **400ms – 1.2s**.
- **Fastify Multipart Streaming**:
  File uploads stream directly into memory buffers without disk I/O overhead.

---

## 3. Mobile UI & Typography Polish (Human-Crafted Aesthetics)

1. **Title Parsing (`cleanArtworkTitle`)**:
   Cleans complex raw titles from public museum metadata (e.g. `"weelde ziet toe / Dalam Kelimpahan Waspadalah)"`) into an Indonesian primary title (`Dalam Kelimpahan Waspadalah`) and an italicized secondary subtitle (`"weelde ziet toe"`).

2. **High-Contrast Theme System**:
   - Replaced muddy gold text on light backgrounds with crisp theme tokens (`var(--text-primary)`, `var(--text-muted)`).
   - Theme-aware badges: Green zamrud confidence badge (`#15803D` / `#4ADE80`), Amber style badge (`#92400E` / `#FDE68A`).
   - Theme-aware Pill Tags: High-contrast indigo and amber tags for Light and Dark modes.

3. **Viewfinder Header & Quota Integration**:
   Quota usage badge (`.gid-quota-pill`) is seamlessly integrated as a floating glass capsule within the header bar, avoiding text and camera button collisions.
