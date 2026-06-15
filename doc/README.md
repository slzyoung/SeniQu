# SeniQu — Technical Documentation

> **SeniQu** is Indonesia's leading digital cultural heritage infrastructure — a digital sanctuary for Indonesia's heritage spanning museums, galleries, and historical sites where assets are verified, digitized, and preserved for long-term conservation to enable accessible cultural exploration and tourism guidance.

---

## 📚 Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [Architecture Overview](./01-Architecture.md) | High-level system design, monorepo structure, technology stack, security layers, database ER diagram |
| 2 | [Frontend Guide](./02-Frontend-Guide.md) | React/Vite setup, atomic component library, Zustand state, Tailwind theming, Web3 wallet integration |
| 3 | [Backend Guide](./03-Backend-Guide.md) | NestJS modular architecture, API endpoints, security middleware, environment configuration |
| 4 | [Authentication & Security](./04-Authentication-Security.md) | Multi-provider auth (JWT, OAuth, Privy, Wallet Signature), RBAC, OWASP Top 10 compliance |
| 5 | [Feature Specifications](./05-Feature-Documentation.md) | Cultural discovery platform, AI-enhanced tools, tourism optimization, institutional dashboards |
| 6 | [Development Workflow](./06-Development-Workflow.md) | Environment setup, TypeScript coding standards, semantic commits, CI/CD deployment |
| 7 | [Database Schema](./07-Database-Schema.md) | PostgreSQL tables, PostGIS geolocation, Row Level Security (RLS), migration history |
| 8 | [API Reference](./08-API-Reference.md) | REST endpoints, request/response schemas, authentication requirements, Swagger |
| 9 | [Wallet Integration](./09-Wallet-Integration.md) | Hybrid wallet strategy: Privy embedded + manual (Phantom/Solflare/MetaMask), backend sync |
| 10 | [Cloudflare R2 Integration](./10-Cloudflare-R2-Integration.md) | S3-compatible storage, signed upload URLs, geo-distributed CDN asset delivery |
| 11 | [Security Incident Response](./11-Security-Incident-Response.md) | Incident procedures, key rotation, and forensic auditing guidelines |
| 12 | [Enterprise Admin Architecture](./12-Enterprise-Admin-Architecture.md) | Unified UI/UX, RBAC enhancements, and admin dashboard modernization |
| 13 | [Hybrid Mapping & Cost Optimization](./13-Hybrid-Mapping-Cost-Optimization.md) | Architectural details on hybrid map rendering and budget-protection Google Maps API practices |
| 14 | [Geolocation Detection & Testing](./14-Geolocation-Testing-Guide.md) | Technical explanation of IP-based geolocation issues and developer testing instructions |
| 15 | [Cloudflare Workers AI & Generative Artwork Engine](./15-Cloudflare-Workers-AI.md) | Overview of Cloudflare Workers AI Flux image generation, multi-tier fallback architecture, and UI/UX feed enhancements |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (Node 24 recommended)
- **npm** 9+
- **Supabase** account with service key
- **Privy** Project ID & App ID (for embedded wallets)
- **Reown/WalletConnect** Project ID (for native Web3 users)

### Installation

```bash
# Clone
git clone https://github.com/siabang35/seniquwebapp.git
cd seniquwebapp

# Install all dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your Supabase, Privy, and OAuth credentials
```

### Running the Servers

```bash
# Terminal 1 — Frontend (Vite)
cd frontend && npm run dev
# → http://localhost:5173

# Terminal 2 — Backend (NestJS)
cd backend && npm run start:dev
# → http://localhost:3001
# → Swagger Docs: http://localhost:3001/api/docs
```

---

## 🏗️ Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | Interactive UI framework with type safety |
| Vite | Lightning-fast build tool with HMR |
| Tailwind CSS | Utility-first styling with custom design tokens (gold/charcoal/cream) |
| Zustand | Lightweight, performant global state management |
| React Router v6 | Client-side routing with lazy-loaded code splitting |
| Framer Motion | Cinematic micro-animations and page transitions |
| Recharts | Data visualization for analytics dashboards |
| Reown AppKit | WalletConnect & multi-chain modal integration |
| Ethers.js | EVM blockchain interaction layer |

### Backend

| Technology | Purpose |
|------------|---------|
| NestJS + TypeScript | Enterprise-grade modular Node.js framework |
| Supabase (PostgreSQL) | Auto-scaling relational database |
| PostGIS | Geolocation queries for cultural site mapping |
| Passport.js | Multi-strategy authentication (JWT, OAuth, Privy, Wallet) |
| class-validator | DTO validation with whitelist enforcement |
| Swagger/OpenAPI | Interactive API documentation |
| Helmet | Security HTTP headers |
| Throttler | 3-tier rate limiting |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Cloudflare R2 | S3-compatible geo-distributed asset storage |
| Solana RPC | Blockchain transaction verification and indexing |
| Privy | Embedded non-custodial wallets for mainstream user onboarding |
| Google Maps API | Institution geolocation, nearby discovery, route directions proxy |
| Google Routes API v2 | Real-time driving directions with polyline encoding (server-side proxy) |

---

## 🌟 Platform Features

| Category | Features |
|----------|----------|
| **Cultural Discovery** | Unified browsable hub of 12,000+ artworks, filterable by era, medium, ethnic group |
| **Museum & Gallery Mapping** | PostGIS-powered geolocation of 450+ institutions with exhibition hours and directions |
| **Interactive Route Navigation** | Real-time driving directions from user to heritage sites via Google Routes API v2 proxy, rendered as decoded polylines on the map |
| **User Location Radar** | Google Maps-style blue dot with 750m expanding radar pulse animation (83fps, 12ms tick) |
| **Premium Carousel UX** | Horizontal snap-scroll carousels for Featured Artworks & Curated Collections with autoplay, pause-on-hover, and overlay navigation arrows |
| **AI Cultural Engine** | Auto-generated summaries, genre detection, multilingual translation, audio guides |
| **Smart Tourism Routes** | Curated paths linking historically connected heritage sites |
| **Proof of Art (PoA)** | Blockchain-verified provenance and certificates of authenticity |
| **Institutional Dashboards** | Digitization wizard, visitor analytics, engagement metrics |
| **Community Forum** | Threaded discussions for cultural enthusiasts |
| **Mobile Notifications** | Real-time alerts for exhibitions, events, and cultural updates |
| **Security Audit** | Zero-leak environment isolation, runtime API key delivery, git history auditing |

---

## 📦 Backend Modules

| Module | Endpoint | Description |
|--------|----------|-------------|
| `auth` | `/auth/*` | JWT, Google OAuth, Privy embedded, Phantom/Solflare wallet signature |
| `users` | `/users/*` | Profiles, roles (USER, ARTIST, INSTITUTION, ADMIN), preferences |
| `wallet` | `/wallet/*` | Nonce generation, wallet linking, balances, deposit/withdraw |
| `artworks` | `/artworks/*` | Cultural properties CRUD, digitization status, metadata mapping |
| `museums` | `/museums/*` | Geolocation-enabled institutions, nearby search, exhibitions |
| `collections` | `/collections/*` | User curations, bookmark lists, cultural route planning |
| `search` | `/search/*` | Full-text search, autocomplete, geospatial queries |
| `analytics` | `/analytics/*` | Artist dashboards, visitor metrics, engagement time-series |
| `notifications` | `/notifications/*` | Push notifications with read/unread tracking |
| `forum` | `/forum/*` | Community threads and posts |
| `audit` | `/audit/*` | OWASP-compliant security event logging |
| `admin` | `/admin/*` | Institution approval workflow, content moderation, system health |

---

## 🔒 Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Authentication** | JWT + refresh tokens, Google OAuth, Privy, wallet signature verification |
| **Authorization** | Role-Based Access Control (RBAC) with 4 tiers |
| **Database** | Row Level Security (RLS) policies on all Supabase tables |
| **Input Validation** | class-validator DTOs with whitelist + forbidNonWhitelisted |
| **Rate Limiting** | 3-tier Throttler (10 req/s, 50 req/10s, 100 req/min) |
| **XSS Prevention** | Global XssSanitizerInterceptor on all inputs |
| **SQL Injection** | SqlInjectionGuard detecting attack patterns |
| **Anti-Replay** | Single-use nonces for all wallet signature flows |
| **Device Tracking** | Fingerprinting for wallet session validation |
| **Audit Trail** | Comprehensive security event logging with request IDs |

---

## 📊 Database Migrations

Run in Supabase SQL Editor sequentially:

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | Core tables, types, user roles |
| `002_functions.sql` | PostgreSQL stored functions |
| `003_security_policies.sql` | Row Level Security policies |
| `004_indexes.sql` | Composite, partial, and GIN indexes |
| `005_fix_user_schema.sql` | User schema refinements |
| `006_seed_users.sql` | Development seed data |
| `007_dashboard_enhancements.sql` | Analytics dashboard support |
| `008_add_category_columns.sql` | Category and classification fields |
| `009_add_google_id.sql` | Google OAuth user linking |
| `010_wallet_infrastructure.sql` | Wallet connections, nonces, sessions |
| `011_security_hardening.sql` | Advanced security policies |
| `012_fix_remaining_security.sql` | Security patch |
| `013_secure_spatial_ref_sys.sql` | PostGIS security hardening |
| `014_wallet_transactions.sql` | Transactions, balances, embedded wallets |

---

## 🧪 Testing

```bash
# Backend
cd backend
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report

# Frontend
cd frontend
npm run test
```

---

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/cultural-routes`)
3. Commit changes (`git commit -m 'feat: add smart museum navigation'`)
4. Push to branch (`git push origin feature/cultural-routes`)
5. Open Pull Request

---

## 📄 License

SeniQu is proprietary software. All rights reserved.

**© 2026 SeniQu — Preserving Nusantara's Heritage, Digitally.**
