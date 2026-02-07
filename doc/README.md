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
| **Geolocation Search** | Find nearby museums and galleries |
| **Community Forum** | Discussions for art enthusiasts |
| **AI Art Analysis** | Genre detection and curation tools |
| **Artist Dashboard** | Analytics, artwork management, sales |
| **Admin Panel** | Content moderation, user management |

---

## 📦 Backend Modules

| Module | Description |
|--------|-------------|
| `auth` | Authentication (JWT, OAuth, Privy) |
| `users` | User profiles and settings |
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
- ✅ OAuth 2.0 (Google, GitHub)
- ✅ Privy Web3 wallet auth
- ✅ Role-based access control (RBAC)
- ✅ Row Level Security (RLS)
- ✅ Rate limiting (3-tier)
- ✅ XSS sanitization
- ✅ SQL injection prevention
- ✅ Security headers (Helmet)
- ✅ Comprehensive audit logging

---

## 📊 Database Migrations

Run SQL migrations in Supabase SQL Editor:

1. `001_initial_schema.sql` - Tables and types
2. `002_functions.sql` - PostgreSQL functions
3. `003_security_policies.sql` - RLS policies
4. `004_indexes.sql` - Performance indexes

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
