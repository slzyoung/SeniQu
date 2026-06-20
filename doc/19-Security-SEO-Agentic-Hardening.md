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

### C. Permanent 301 Edge Redirections & CSP Alignment (`netlify.toml`, `_redirects`, `_headers`)
*   Added domain-specific redirection rules at the top of Netlify redirect parameters.
*   Requests hitting `https://seniquapp.netlify.app/*` are permanently redirected (`301!`) to `https://seniqu.art/:splat` to transfer SEO juice and preserve page rank.
*   CORS origin configuration in NestJS (`main.ts`) and domain verification in the wallet service (`wallet.service.ts`) were updated to explicitly support `seniqu.art` and `www.seniqu.art`.
*   Aligned the `Content-Security-Policy` header in both `netlify.toml` and `frontend/public/_headers` to allow `https://challenges.cloudflare.com` and `https://static.cloudflareinsights.com` (under `script-src`, `connect-src`, and `frame-src`). This ensures Cloudflare Turnstile bot protection widgets and Cloudflare Analytics beacons load successfully without browser CSP violations.

---

## 🤖 3. Agentic Browsing & Accessibility

To prepare the site for autonomous AI agents and improve page-speed checks, we fixed the accessibility tree and introduced standard agentic guides.

### A. Button Discernible Text
*   PageSpeed accessibility validation requires all interactive buttons to contain readable content.
*   Icon-only actions (like the favorite button and details navigation button in `CollectionCard` and `FeaturedCollections`) were updated with appropriate `aria-label` tags (e.g., `aria-label="Add to favorites"`, `aria-label="View details of title"`), validating accessibility trees.

### B. Standardized `llms.txt`
*   Created `/llms.txt` inside the public directory.
*   Provides structured information formatted as markdown with a required `H1` header and links, helping AI browsers map and interact with the application routes.

---

## 🎨 4. Premium Light/Dark Theme UI/UX Enhancements (`AuthModal.tsx`)

To ensure a cohesive, professional appearance across all devices (with special priority on mobile responsiveness), we polished the visual style of the authentication modal (`AuthModal.tsx`) in both Light and Dark modes.

### A. High-Contrast Modal Containers & Footer
*   **Modal Card**: Replaced the low-contrast glassmorphic background (`bg-theme-glass`) with a solid, premium ivory-white (`bg-[#FAF9F5]`) in light mode and deep charcoal-black (`bg-[#0D0D0D]`) in dark mode, solving contrast bleed against the backdrop.
*   **Dialog Footer**: Separated the footer using a subtle, clean container (`bg-neutral-100/50` in light mode, `bg-[#121212]` in dark mode) and a high-contrast border.
*   **Close Action**: Adjusted the hover state to use a neutral background-color change (`hover:bg-neutral-100` and `dark:hover:bg-neutral-800`), making the button easily discoverable.

### B. Crisp & Accessible Input Control Styles
*   **Form Input Fields**: Replaced the muddy grey backgrounds (`bg-black/[0.03]`) with solid white fields (`bg-white`) in light mode and dark inputs (`bg-neutral-900/60`) in dark mode. The border and focus ring states are aligned to the brand's signature gold color palette (`border-neutral-200 focus:border-gold/50`).
*   **Verification Grid & OTP Code Inputs**: Redesigned digit entries to use clear borders (`border-neutral-200` in light mode, `border-neutral-800/80` in dark mode) which transition to gold highlights upon verification or active interaction.

### C. Link Contrast & Legibility Alignment
*   **Secondary Actions**: Links like "Forgot password?", "Sign up", and "Sign in" were updated from low-contrast pure brand-gold (`text-gold`) to high-contrast dark amber (`text-amber-700 hover:text-amber-800`) in light mode, while retaining the premium gold colors (`text-gold dark:hover:text-gold-light`) in dark mode.

