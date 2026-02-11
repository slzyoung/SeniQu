# Seniqu WebApp Documentation

Welcome to the official documentation for the **Seniqu WebApp**, an enterprise-grade Indonesian art gallery and NFT marketplace platform.

## 📚 Documentation Structure

| # | Document | Description |
|---|----------|-------------|
| 1 | [Architecture Overview](./01-Architecture.md) | System design, tech stack, patterns |
| 2 | [Frontend Guide](./02-Frontend-Guide.md) | React/Vite, components, state, styling |
| 3 | [Backend Guide](./03-Backend-Guide.md) | NestJS modules, services, middleware |
| 4 | [Authentication & Security](./04-Authentication-Security.md) | JWT, OAuth, RBAC, OWASP compliance |
| 5 | [Feature Specifications](./05-Feature-Documentation.md) | Gallery, marketplace, dashboards |
| 6 | [Development Workflow](./06-Development-Workflow.md) | Setup, coding standards, deployment |
| 7 | [Database Schema](./07-Database-Schema.md) | Supabase tables, functions, RLS |
| 8 | [API Reference](./08-API-Reference.md) | Endpoints, parameters, examples |
| 9 | [Wallet Integration](./09-Wallet-Integration.md) | Hybrid Wallet Strategy and Auto-Sync |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account
- Google OAuth credentials (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/seniqu-webapp.git
cd seniqu-webapp

# Install all dependencies
npm install

# Setup environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your credentials

# Start development servers
npm run dev  # Runs both frontend and backend
```

### Individual Services

```bash
# Frontend only (Vite)
cd frontend && npm run dev
# → http://localhost:5173

# Backend only (NestJS)
cd backend && npm run start:dev
# → http://localhost:3001
# → Swagger: http://localhost:3001/api/docs
```

---

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Zustand (state management)
- React Router v6
- Framer Motion

### Backend
- NestJS + TypeScript
- Supabase (PostgreSQL)
- Passport.js (JWT, OAuth, Privy)
- class-validator
- Swagger/OpenAPI

### Database
- PostgreSQL (via Supabase)
- PostGIS (geolocation)
- Row Level Security

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **Virtual Museums** | Immersive digital galleries for institutions |
| **NFT Marketplace** | Secure minting and trading of digital art |
| **Manual Wallet Auth** | Direct login via Phantom, Solflare, MetaMask signature |
| **Privy Embedded Wallet** | Auto-created non-custodial wallet for all users |
| **Deposit & Withdraw** | Transfer tokens to/from embedded wallet |
| **Geolocation Search** | Find nearby museums and galleries |
| **Community Forum** | Discussions for art enthusiasts |
| **AI Art Analysis** | Genre detection and curation tools |
| **Artist Dashboard** | Analytics, artwork management, sales |
| **Admin Panel** | Content moderation, user management |

---

## 📦 Backend Modules

| Module | Description |
|--------|-------------|
| `auth` | Authentication (JWT, OAuth, Privy, Wallet Signature) |
| `users` | User profiles and settings |
| `wallet` | Wallet connections, balances, transactions, deposit/withdraw |
| `artworks` | Artwork CRUD and management |
| `nfts` | NFT minting and marketplace |
| `museums` | Museums/galleries with geolocation |
| `collections` | User artwork collections |
| `bookmarks` | User bookmarks/favorites |
| `forum` | Community threads and posts |
| `search` | Global search and autocomplete |
| `analytics` | Artist and admin dashboards |
| `notifications` | User notification system |
| `audit` | Security audit logging (OWASP) |
| `admin` | Admin management tools |

---

## 🔒 Security Features

- ✅ JWT with refresh tokens
- ✅ OAuth 2.0 (Google)
- ✅ Manual wallet signature verification (Phantom, Solflare, MetaMask)
- ✅ WalletConnect / Reown mobile wallet connection
- ✅ Privy non-custodial embedded wallets
- ✅ Role-based access control (RBAC)
- ✅ Row Level Security (RLS)
- ✅ Rate limiting (3-tier + wallet-specific)
- ✅ XSS sanitization
- ✅ SQL injection prevention
- ✅ Security headers (Helmet)
- ✅ Single-use nonce anti-replay protection
- ✅ Device fingerprinting for wallet sessions
- ✅ Comprehensive audit logging

---

## 📊 Database Migrations

Run SQL migrations in Supabase SQL Editor:

1. `001_initial_schema.sql` — Core tables and types
2. `002_functions.sql` — PostgreSQL functions
3. `003_security_policies.sql` — RLS policies
4. `004_indexes.sql` — Performance indexes
5. `005_fix_user_schema.sql` — User schema fixes
6. `006_seed_users.sql` — Seed data
7. `007_dashboard_enhancements.sql` — Dashboard enhancements
8. `008_add_category_and_missing_columns.sql` — Category support
9. `009_add_google_id.sql` — Google OAuth ID
10. `010_wallet_infrastructure.sql` — Wallet connections, nonces, sessions
11. `011_security_hardening.sql` — Security hardening
12. `012_fix_remaining_security.sql` — Security fixes
13. `013_secure_spatial_ref_sys.sql` — PostGIS security
14. `014_wallet_transactions.sql` — Transactions, balances, embedded wallet

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage

# Frontend tests
cd frontend
npm run test
```

---

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📧 Contact

For questions or support, contact the development team.
