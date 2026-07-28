# 16. Real-Time Gemini 3.6 Flash Heritage Analyzer & Fastify Optimizations

This document details the architectural design, performance optimizations, API endpoints, and UI/UX design choices implemented for the **Heritage Scanner (Genre Identifier)** feature in SeniQu powered by **Gemini 3.6 Flash**.

---

## 1. Overview & Architecture

The **Heritage Scanner** allows users to perform real-time AR camera scanning or upload images of Nusantara cultural artifacts, traditional batik, reliefs, weapons, and historical art pieces. The image is processed through a high-performance NestJS/Fastify backend service and analyzed by Google's **Gemini 3.6 Flash** multimodal AI model.

```
[ Mobile/Desktop Frontend ] 
       │ 
       ├─► Real-Time WebRTC Camera / Gallery Picker
       ├─► Client-side Image Compression (max 1600x1600, quality 0.85)
       │
       ▼ (POST /api/v1/ai/heritage-scan)
[ NestJS + Fastify Backend Service ]
       │
       ├───► Quota Verification (5 scans / user / day)
       │
       ├───► Promise.all (Parallel Execution) ──┐
       │     │                                  │
       │     ├─► Google Gemini 3.6 Flash API    ├─► Total Latency Reduced by 400ms–1.2s!
       │     └─► Cloudflare R2 CDN Storage      │
       │                                        │
       ▼                                        │
[ Supabase PostgreSQL DB ] ◄────────────────────┘
       │
       ▼
[ Structured JSON Identification Result ]
 (Name, Origin, Era, Pattern Meaning, Audio Guide Script, Genres & Tags)
```

---

## 2. Gemini 3.6 Flash Integration & Resilient Fallback Chain

### Primary Model Selection
- **Primary Model**: `gemini-3.6-flash`
- **Configuration**:
  - `responseMimeType: "application/json"`
  - `temperature: 0.1` (Low temperature for deterministic, highly accurate cultural identification)
  - `maxOutputTokens: 2048`

### Resilient Fallback Chain
In the event of API rate limits or regional availability issues on Gemini 3.6 Flash, the backend `AiService.scanHeritage` automatically executes an integrated fallback attempt loop:
1. `gemini-3.6-flash` (Primary)
2. `gemini-3.5-flash`
3. `gemini-2.5-flash`
4. `gemini-2.0-flash`
5. `gemini-1.5-flash`

---

## 3. Fastify & Backend Speed Optimizations

To achieve instant response times on mobile networks, two key backend optimizations were introduced:

1. **Parallel R2 Storage & AI Analysis (`Promise.all`)**:
   Instead of sequentially waiting for R2 CDN uploads to finish before initiating AI analysis, `AiService` executes the Cloudflare R2 upload task concurrently with the Gemini 3.6 Flash API request using `Promise.all`.
2. **Fastify Multipart Streaming**:
   Fastify processes incoming multipart form data directly into memory buffers without writing intermediate files to disk, eliminating IO bottlenecks.

---

## 4. Mobile & Desktop UI/UX Best Practices

### A. Title Cleaning (`cleanArtworkTitle`)
Raw artwork titles from historical datasets (e.g. `"weelde ziet toe / Dalam Kelimpahan Waspadalah)"`) are automatically parsed and sanitized into:
- **Main Title**: `Dalam Kelimpahan Waspadalah` (Displayed in prominent serif font)
- **Original / Subtitle**: `"weelde ziet toe"` (Displayed in elegant italic text)

### B. High-Contrast Theme System (Light & Dark Mode)
- **No Faint Yellows**: Replaced washed-out yellow text on beige backgrounds with crisp HSL theme tokens (`var(--text-primary)` and `var(--text-muted)`).
- **Theme Badges**:
  - **Accuracy Badge**: Green zamrud (`#15803D` on `#F0FDF4` in Light mode; `#4ADE80` in Dark mode).
  - **Art Style Badge**: Amber bronze (`#92400E` on `#FEF3C7` in Light mode; `#FDE68A` in Dark mode).
- **Cards & Text**: Cards use responsive borders (`var(--border-color)`) and high-contrast typography across both Light and Dark mode.

### C. Web Speech API Audio Narration
Integrates browser `SpeechSynthesisUtterance` configured for `id-ID` (Indonesian locale) to provide spoken historical narration for visually impaired users and museum visitors.

---

## 5. API Reference

### POST `/api/v1/ai/heritage-scan`
- **Auth**: Required (`Bearer JWT`)
- **Content-Type**: `multipart/form-data`
- **Form Key**: `image` (File object)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Candi Borobudur / Relief Karmawibhangga",
    "origin": "Magelang, Jawa Tengah",
    "century": "Abad ke-8 hingga ke-9",
    "type": "Relief Batu Andesit",
    "confidence": 96,
    "description": "Deskripsi mendalam...",
    "audioScript": "Naskah narasi audio guide...",
    "patternMeaning": "Penjelasan detail filosofi relief...",
    "tags": ["Borobudur", "Relief", "Budha", "JawaTengah"],
    "genres": [
      { "name": "Relief Batu Candi", "confidence": 0.96 }
    ],
    "style": "Klasik Jawa Syailendra",
    "medium": "Batu Andesit",
    "collection": "Museum Nasional Indonesia"
  }
}
```

### GET `/api/v1/ai/heritage-scan/quota`
- **Auth**: Required
- **Response**: `{ "limit": 5, "used": 1, "remaining": 4 }`

### GET `/api/v1/ai/heritage-scan/history`
- **Auth**: Required
- **Query Params**: `limit` (default: 20)
- **Response**: Array of historical heritage scans per user.
