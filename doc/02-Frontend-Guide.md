# Frontend Development Guide

## 1. Setup & Installation

The frontend is built with **Vite**, offering a lightning-fast development experience.

```bash
cd frontend
npm install
npm run dev
```

## 2. Core Concepts

### 2.1 Component Library
We use a custom-built, atomic design system located in `src/components/ui`.
- **Card**: Versatile container with variants (`default`, `elevated`, `gold`, etc.)
- **Button**: Standardized buttons with loading states and icon support.
- **Input**: Accessible form inputs.
- **Badge**: Status indicators.

**Usage Example:**
```tsx
import { Card, Button, Input } from '../components/ui';

<Card variant="elevated">
  <Input label="Email" placeholder="Enter email" />
  <Button variant="gold" fullWidth>Submit</Button>
</Card>
```

### 2.2 Routing Strategy
We use `react-router-dom` with a centralized configuration in `src/routes/index.tsx`.
- **Lazy Loading**: All pages are imported using `React.lazy` to split the code.
- **Route Guards**: 
  - `ProtectedRoute`: Checks authentication and Roles.
  - `PublicOnlyRoute`: Prevents authenticated users from accessing login pages.
- **Layouts**: Wrap pages in functional layouts (e.g., `UserLayout`, `AdminLayout`, `GalleryLayout`).

### 2.3 Authentication & Authorization
Authentication state is managed via `useAuthStore` (Zustand).
- **Access Control**: Roles are defined in `src/lib/constants.ts` and checked via `ProtectedRoute`.
- **Persistance**: Auth state is persisted to `localStorage` securely.

```tsx
// Example Protection API
<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
  <AdminDashboard />
</ProtectedRoute>
```

### 2.4 Styling & Theming
- **Tailwind CSS**: Used for all layout and styling.
- **Theme Provider**: `src/hooks/useTheme.tsx` manages Dark/Light mode.
- **Colors**: Defined in `tailwind.config.js`. Use `bg-theme-bg`, `text-theme-text` for dark-mode compatible semantic colors.

### 2.5 Web3 Integration & Wallets
We use a **Hybrid Wallet Strategy**:
- **Internal**: `PrivyProvider` wraps the app to provide embedded wallets for email users.
- **Sync**: `PrivySyncManager` component runs globally to keep auth states in sync.
- **External**: `useManualWallet` hook handles direct connections (Phantom/MetaMask) for crypto-native users.

Detailed documentation: [09-Wallet-Integration.md](./09-Wallet-Integration.md)

### 2.6 Folder Structure Best Practices
When creating a new feature:
1. Create a folder in `src/features/[feature-name]`.
2. Create `pages/` for route components.
3. Create `components/` for feature-specific components.
4. Create `index.ts` to export public pages/components.

### 2.7 Error Handling & Security Details
Our frontend utilizes specialized patterns for stability and security:
- **Error Boundaries**: Core layouts (`AdminLayout`, `ArtistLayout`) are wrapped in an `ErrorBoundary` component to gracefully catch rendering errors and offer a "Retry" mechanism rather than a blank screen.
- **Input Sanitization**: We use `src/lib/sanitize.ts` to strip XSS attack vectors from user forms (like `UploadArtwork`) before API transmission. 
- **Anti-Chunking (Debounce)**: API-heavy inputs (like search bars in `MyArtworks`) use debounced state updates to prevent excessive requests. Mutation events use state locks to prevent double-submissions.

## 3. Key Libraries

- **Lucide React**: Universal icon set.
- **Framer Motion**: Smooth entry/exit animations for pages and modals.
- **Recharts**: Professional charts for Analytics dashboards.
- **Zustand**: Minimalistic global state management.
- **React Hook Form (Recommended)**: For complex forms.

## 4. Linting & Formatting

The project uses strict ESLint and TypeScript configuration.
- No unused variables.
- Strict type checking.
- Run `npm run lint` before committing.
