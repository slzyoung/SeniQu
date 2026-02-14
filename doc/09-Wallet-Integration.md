# Wallet Integration Guide

## 1. Overview
Seniqu uses a **Hybrid Wallet Strategy** combining:
1.  **Embedded Wallets (Privy)**: Auto-generated for all users (email/social logins) for a seamless Web3 experience.
2.  **External Wallets (Manual)**: Direct connections for crypto-native users (MetaMask, Phantom).
3.  **Mobile Wallets (Reown)**: WalletConnect integration for mobile users with deep linking support.

---

## 2. Embedded Wallets (Privy)

### 2.1 Architecture
We use [Privy](https://privy.io/) to generate non-custodial embedded wallets. This ensures every user has a wallet address to interact with the blockchain, even if they sign in with Google or Email.

- **Frontend**: `@privy-io/react-auth` SDK.
- **Backend**: Verifies Privy tokens and handles syncing.
- **Auth Flow**: Custom Authentication (JWT-based).

### 2.2 Global Auto-Sync Mechanism
To ensure the app and Privy are always in sync, we implemented a global **`PrivySyncManager`**.

#### How it works:
1.  **User logs in** to Seniqu (via Email/Google).
2.  **Backend generates** a standard JWT *and* a specific `privyToken` (signed with Privy's App Secret).
3.  **Frontend (`PrivySyncManager`)** detects the login.
4.  **Frontend** calls `useSyncJwtBasedAuthState` from Privy SDK v3.
5.  **Privy SDK** uses the `privyToken` to authenticate the user within the embedded wallet iframe.
6.  **Result**: The user is logged in to both Seniqu and Privy simultaneously without extra popups.

**File:** `frontend/src/components/providers/PrivySyncManager.tsx`

```tsx
// Simplified Logic
useSyncJwtBasedAuthState({
  getExternalJwt: async () => {
     const { privyToken } = await authService.getPrivySyncToken();
     return privyToken;
  },
  // Subscribes to Zustand store to trigger sync on login/logout
  subscribe: (onChange) => useAuthStore.subscribe(...)
});
```

### 2.3 Wallet Creation & Linking
When a user visits the **Wallet Page** (`/dashboard/wallet`):
1.  **Backend vs Frontend Truth**: The system prioritizes the **Backend Database (`privy_wallets`)** as the single source of truth for wallet addresses.
    -   If the backend return a wallet address, it is displayed **immediately**, even if the client-side Privy SDK is still initializing or syncing.
    -   This eliminates "flickering" or "Not Found" states for users with existing wallets.
2.  **Auto-Creation**: If no wallet exists in the DB, the frontend triggers `createWallet()` (Privy SDK).
3.  **Sync**: Immediately calls `POST /users/me/sync-wallets` to persist the new wallet to the `privy_wallets` table.

### 2.4 Deposit & Withdraw Flows
We have standardized all operations to use the **Mainnet** (or Environment RPC) to ensure consistency.

#### Deposit (Receive) - **Instant Access**
-   **Display Logic**: The UI forces the display of the address found in `activeBackendWallet` (derived from `privy_wallets`).
-   **QR Code**: Generated from the verified backend address.

#### Withdraw (Send) - **Robust Execution**
-   **Button State**: The "Withdraw" button is **always enabled** as long as a wallet address is known (from Backend or Frontend).
-   **Styling**: When active, the button features a **White Gradient** text and border effect (`bg-gradient-to-r from-white to-gray-300`) to distinguish it as a premium feature.
-   **Execution**: The system dynamically locates the correct **Privy Signer Object** (`getProvider`) at the moment of transaction.

---

## 3. Connected Wallets & Profile
Strict filtering logic is applied to the "Connected Wallets" section in the User Profile (`ConnectedWallets.tsx`).

### 3.1 Display Logic (Strict Filtering)
To prevent confusion between "Embedded" and "External" wallets:
1.  **Source**: We iterate strictly through `backendUser.wallets` (which aggregates `wallet_logins` and `privy_wallets`).
2.  **Filter**: We applied a **Strict Filter** to exclude any wallet flagged as `isEmbedded`.
    -   **Allowed**: External wallets (Phantom, MetaMask) from `wallet_logins`.
    -   **Hidden**: Auto-generated Privy wallets from `privy_wallets`.
3.  **Result**: The "Connected Wallets" list *only* shows the external wallets the user explicitly connected or logged in with.

### 3.2 External Wallets (Manual)

For users who prefer their own keys (Phantom, MetaMask).

#### Direct Connection (Desktop)
We bypass Privy's connectors for desktop extensions to avoid conflicts and provide a faster, native feel.

**Flow:**
1.  **Connect**: `window.solana.connect()`
2.  **Sign**: User signs a simplified message with a **nonce**.
3.  **Verify**: Backend validates signature & nonce.
4.  **Auth**: Returns a JWT session.

**File:** `frontend/src/hooks/useManualWallet.ts`

#### Mobile Connection (Reown / WalletConnect)
We use **Reown AppKit** (formerly WalletConnect Web3Modal) for mobile support.
- **Project ID**: Configured in `.env` (`VITE_WALLETCONNECT_PROJECT_ID`).
- **Flow**: Opens native mobile apps via deep links.

#### Mobile Optimization & Session Persistence
Mobile wallets often require switching apps, which can cause the browser release. To handle this:
1.  **Session Persistence**: The `useManualWallet` hook persists the "connecting" state in `sessionStorage` before the deep link redirect.
2.  **Auto-Resume**: Upon reloading, the hook checks `sessionStorage` and automatically resumes the connection process if a pending attempt is found (valid for 5 minutes).
3.  **Relaxed Rate Limits**: Rate limits for mobile are higher (10 requests/min) to account for retries and app swithcing delays.

### 3.3 Signature Handling
The system supports multiple signature formats to ensure compatibility across all providers (Reown, Phantom, MetaMask):
-   **Uint8Array**: Standard Solana signature format.
-   **Hex String**: Standard Ethereum (0x...) or some WalletConnect responses.
-   **Object**: Some providers return `{ signature: ... }` objects.
The `useManualWallet` hook includes robust logic to parse and normalize these into a consistent format for backend verification.

---

## 4. Backend Wallet Service

**Microservice:** `AppWalletModule`
**Path:** `backend/src/wallet/`

### 4.1 Key Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/wallet/nonce` | Generate a single-use login nonce. |
| `POST` | `/api/v1/users/me/sync-wallets` | **Authoritative Sync**: Forces `privy_wallets` table update from Privy. |
| `GET` | `/api/v1/wallet/assets` | Fetch portfolio balance (Helius/RPC). |

### 4.2 Database Schema
- **`wallet_nonces`**: Stores login challenges (expires in 5m).
- **`privy_wallets`**: Stores embedded wallet data (Source of Truth for Wallet Page).
- **`wallet_logins`**: Stores external wallet connections (Source of Truth for Profile Page).

---

## 5. Troubleshooting

### `TypeError: loginWithCustomToken is not a function`
**Cause**: This function was deprecated and removed in Privy v3.
**Fix**: We migrated to `useSyncJwtBasedAuthState` (Auto-Sync). **Do not use `loginWithCustomToken`**.

### "Profile Redirect Loop"
**Cause**: `user` object in state missing `username` or `displayName`.
**Fix**: Ensure `needsProfileCompletion(user)` returns false before redirecting to dashboard.

### "Sign In Failed" on Mobile
**Cause**: App switching caused state loss or signature format mismatch.
**Fix**:
1.  Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set.
2.  The `useManualWallet` hook now handles session persistence to recover state after app switches.
3.  Signature parsing logic in `loginWithProvider` handles various return formats from Reown.
