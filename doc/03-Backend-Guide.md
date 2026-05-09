# Backend Development Guide

## 1. Overview

The backend is a **NestJS** application providing RESTful APIs for the SeniQu digital cultural heritage infrastructure platform. It handles authentication, data persistence, business logic, and integrates with Supabase for database operations.

## 2. Technology Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Framework for building scalable server-side applications |
| **TypeScript** | Type-safe development |
| **Supabase** | PostgreSQL database with Row Level Security |
| **Passport.js** | Authentication strategies (JWT, OAuth, Privy) |
| **class-validator** | DTO validation |
| **Swagger** | API documentation |
| **Helmet** | Security HTTP headers |
| **Throttler** | Rate limiting |

## 3. Directory Structure

```
backend/src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
│
├── common/                    # Shared utilities
│   ├── decorators/           # Custom decorators
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth & security guards
│   ├── interceptors/         # Request/response interceptors
│   └── middleware/           # HTTP middleware
│
├── config/                    # Configuration module
│   └── configuration.ts      # Environment validation
│
├── database/                  # Database module
│
├── auth/                      # Authentication
│   ├── strategies/           # Passport strategies
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   ├── decorators/           # @GetUser, @Roles, @Public
│   └── dto/                  # LoginDto, RegisterDto
│
├── users/                     # User management
├── artworks/                  # Artwork CRUD
├── nfts/                      # NFT minting & trading
├── collections/               # User collections
├── governance/                # DAO governance
├── admin/                     # Admin dashboard
│
├── museums/                   # Museums & galleries (NEW)
│   ├── museums.module.ts
│   ├── museums.controller.ts
│   ├── museums.service.ts
│   └── dto/
│       ├── create-museum.dto.ts
│       ├── update-museum.dto.ts
│       └── search-museum.dto.ts
│
├── bookmarks/                 # User bookmarks (NEW)
├── forum/                     # Community forum (NEW)
├── search/                    # Global search (NEW)
├── analytics/                 # Dashboard analytics (NEW)
├── audit/                     # Security audit logging (NEW)
└── notifications/             # User notifications (NEW)
```

## 4. API Modules

### 4.1 Core Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `/auth/*` | Login, register, OAuth, refresh tokens |
| **Users** | `/users/*` | User profiles, settings |
| **Artworks** | `/artworks/*` | CRUD for artworks |
| **NFTs** | `/nfts/*` | Minting, listing, trading |
| **Collections** | `/collections/*` | User artwork collections |
| **Wallet** | `/wallet/*` | Nonce generation, wallet linking, balance checks |

### 4.2 New Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Museums** | `/museums/*` | Museums/galleries with geolocation |
| **Bookmarks** | `/bookmarks/*` | User artwork bookmarks |
| **Forum** | `/forum/*` | Community threads & posts |
| **Search** | `/search/*` | Global search, nearby, autocomplete |
| **Analytics** | `/analytics/*` | Artist & admin dashboards |
| **Notifications** | `/notifications/*` | User notification system |

## 5. Security Best Practices (OWASP)

### 5.1 Input Validation

All inputs are validated using `class-validator` DTOs with whitelist mode:

```typescript
// Validation pipe in main.ts
app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,           // Strip unknown properties
        forbidNonWhitelisted: true, // Reject unknown properties
        transform: true,            // Auto-transform types
    }),
)
```

### 5.2 Rate Limiting

Three-tier throttling protects against abuse:

```typescript
ThrottlerModule.forRoot({
    throttlers: [
        { name: 'short', ttl: 1000, limit: 10 },   // 10 req/sec
        { name: 'medium', ttl: 10000, limit: 50 }, // 50 req/10sec
        { name: 'long', ttl: 60000, limit: 100 },  // 100 req/min
    ],
})
```

### 5.3 Security Middleware

| Middleware | Purpose |
|------------|---------|
| `XssSanitizerInterceptor` | Sanitizes HTML entities in input |
| `SqlInjectionGuard` | Detects SQL injection patterns |
| `SecurityHeadersInterceptor` | Adds X-Frame-Options, CSP headers |
| `RequestIdMiddleware` | Tracks requests for audit logging |

### 5.4 Authentication Guards

```typescript
// Protect endpoint with JWT authentication
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@GetUser() user: User) {
    return user;
}

// Role-based access control
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Delete(':id')
deleteUser(@Param('id') id: string) { }
```

## 6. Environment Variables

Create `.env` from `.env.example`:

```bash
# Server
NODE_ENV=development
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.seniqu.art/api/v1/auth/google/callback

# Frontend URL (for OAuth redirects back to frontend)
FRONTEND_URL=https://seniquapp.netlify.app

# OAuth Cookie Secret (HMAC signing for signed httpOnly OAuth cookie)
OAUTH_COOKIE_SECRET=your-oauth-cookie-secret-min-32-chars

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 7. Database (Supabase)

### 7.1 Running Migrations

SQL migrations are in `backend/supabase/migrations/`:

```bash
# Run in Supabase SQL Editor in order:
001_initial_schema.sql    # Tables & types
002_functions.sql         # PostgreSQL functions
003_security_policies.sql # Row Level Security
004_indexes.sql           # Performance indexes
```

### 7.2 Key Tables

- `users` - User accounts with RBAC
- `institutions` - Museums & galleries with geolocation
- `artworks` - Art pieces with AI detection
- `nfts` - NFT tokens linked to artworks
- `forum_threads`, `forum_posts` - Community forum
- `audit_logs` - Security audit trail

## 8. Development Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Linting
npm run lint

# Testing
npm run test
npm run test:e2e
```

## 9. API Documentation

Swagger documentation is available at:
```
http://localhost:3001/api/docs
```

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Example payloads
