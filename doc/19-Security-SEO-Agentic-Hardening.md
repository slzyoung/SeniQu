# 19. Security, SEO & Agentic Hardening Documentation

This document describes the security hardening, SEO enhancements, and agentic browsing improvements implemented across the SeniQu web application.

---

## 🛡️ 1. Security Hardening

To mitigate automated bot registrations, brute-force attacks, and distributed spam, we implemented a multi-layered defense architecture.

### A. Cloudflare Turnstile Integration
We integrated Cloudflare's non-intrusive CAPTCHA alternative, Turnstile:
*   **Frontend (`AuthModal.tsx`, `authService.ts`)**: Loads the `@marsidev/react-turnstile` component with the environment site key (`VITE_TURNSTILE_SITE_KEY`). The token is collected during user registration and passed in the headers (`X-Turnstile-Token`) to the backend.
*   **Backend (`turnstile.guard.ts`)**: Intercepts registration requests. It extracts the client token, issues a backend validation POST request to Cloudflare's verification API (`https://challenges.cloudflare.com/turnstile/v0/siteverify`), using the `TURNSTILE_SECRET_KEY` config. Requests are rejected if token verification fails.

### B. Honeypot Input Trap
*   A hidden form field named `website` was added to the registration form.
*   The field is hidden visually and excluded from tab indexing/screen readers (`aria-hidden="true"`, `tabIndex={-1}`).
*   Automated registration bots scanning the DOM typically auto-fill all form fields. If this field contains any value upon submission, the backend silently intercepts it and returns a mock success response, neutralizing the bot without revealing detection.

### C. Disposable Email Blocklist
*   A custom validator checks incoming registration emails against an array of 200+ known temporary/disposable email domains (such as `web-library.net`).
*   Requests matching these domains are rejected instantly with a `400 Bad Request` before any password hashing or DB checks execute, conserving server resources.

### D. Fine-Grained API Throttling
Using NestJS `@Throttle` overrides, key authentication endpoints have custom rate limit parameters to prevent credential stuffing:
*   **Register (`/auth/register`)**: Max 3 requests per minute.
*   **Login (`/auth/login`)**: Max 5 requests per minute.
*   **OTP Resend (`/auth/resend-otp`)**: Max 2 requests per minute.
*   **Forgot Password Request (`/auth/forgot-password/request`)**: Max 2 requests per minute.
*   **Forgot Password Verification (`/auth/forgot-password/verify`)**: Max 5 requests per minute.

---

## 📈 2. SEO Best Practices & Domain Alignment

To optimize search engine presence and prevent duplicate indexing penalties on Google Search Console, we aligned all web entry points with the custom domain `seniqu.art` instead of Netlify's default subdomain `seniquapp.netlify.app`.

### A. Metadata & Canonical URLs
*   **Dynamic Headings (`SEOHead.tsx`)**: Aligned the `BASE_URL` constant with `https://seniqu.art`, ensuring canonical tags automatically compute as `https://seniqu.art/path` for all pages.
*   **Primary HTML (`index.html`)**: Swapped hardcoded Netlify subdomains for `https://seniqu.art` in canonical tags, Open Graph meta tags, Twitter cards, and structured JSON-LD data.

### B. Indexer Routing
*   **Sitemap (`sitemap.xml`)**: Updated all page `<loc>` targets to point to `https://seniqu.art`.
*   **Robots (`robots.txt`)**: Set the `Sitemap` declaration to point directly to `https://seniqu.art/sitemap.xml`.

### C. Permanent 301 Edge Redirections (`netlify.toml`, `_redirects`)
*   Added domain-specific redirection rules at the top of Netlify redirect parameters.
*   Requests hitting `https://seniquapp.netlify.app/*` are permanently redirected (`301!`) to `https://seniqu.art/:splat` to transfer SEO juice and preserve page rank.
*   CORS origin configuration in NestJS (`main.ts`) and domain verification in the wallet service (`wallet.service.ts`) were updated to explicitly support `seniqu.art` and `www.seniqu.art`.

---

## 🤖 3. Agentic Browsing & Accessibility

To prepare the site for autonomous AI agents and improve page-speed checks, we fixed the accessibility tree and introduced standard agentic guides.

### A. Button Discernible Text
*   PageSpeed accessibility validation requires all interactive buttons to contain readable content.
*   Icon-only actions (like the favorite button and details navigation button in `CollectionCard` and `FeaturedCollections`) were updated with appropriate `aria-label` tags (e.g., `aria-label="Add to favorites"`, `aria-label="View details of title"`), validating accessibility trees.

### B. Standardized `llms.txt`
*   Created `/llms.txt` inside the public directory.
*   Provides structured information formatted as markdown with a required `H1` header and links, helping AI browsers map and interact with the application routes.
