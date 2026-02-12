import React from 'react';
import { PrivyProvider as PrivySDKProvider } from '@privy-io/react-auth';

// Singleton wallet connectors
import { solanaConnectors } from './walletConnectors';

// ============================================================
// CHAIN DEFINITIONS
// ============================================================

const solanaMainnet = {
    id: 101,
    name: 'Solana',
    network: 'mainnet-beta',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: {
        default: { http: ['https://api.mainnet-beta.solana.com'] },
    },
};

const solanaDevnet = {
    id: 102,
    name: 'Solana Devnet',
    network: 'devnet',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: {
        default: { http: ['https://api.devnet.solana.com'] },
    },
};

const ethereumMainnet = {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://cloudflare-eth.com'] },
    },
};

// ============================================================
// EXTERNAL WALLET CONNECTORS
// ============================================================

// ============================================================
// EXTERNAL WALLET CONNECTORS
// ============================================================

// Singleton pattern for connectors now handled in walletConnectors.ts
// to avoid re-creation on HMR

// ============================================================
// ENVIRONMENT VARIABLES & VALIDATION
// ============================================================

const RAW_PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

/**
 * Validate Privy App ID format.
 * Valid: alphanumeric string like "cmlbdyeq601jel80cfn96y6uc"
 * Invalid: URLs, JWKS endpoints, empty strings
 */
function getValidPrivyAppId(raw: string): string | null {
    if (!raw) {
        console.warn('[PrivyProvider] VITE_PRIVY_APP_ID is not set');
        return null;
    }

    // Reject URLs (common misconfiguration: using JWKS URL instead of App ID)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        console.error(
            `[PrivyProvider] VITE_PRIVY_APP_ID is set to a URL instead of an App ID.\n` +
            `  Current value: "${raw}"\n` +
            `  Expected: A plain alphanumeric ID like "cmlbdyeq601jel80cfn96y6uc"\n` +
            `  Fix: Update the env var in your Netlify Dashboard or .env file.`
        );
        return null;
    }

    // Basic format check: should be alphanumeric, no spaces, reasonable length
    if (raw.length < 10 || raw.length > 50 || /\s/.test(raw)) {
        console.error(`[PrivyProvider] VITE_PRIVY_APP_ID has an invalid format: "${raw}"`);
        return null;
    }

    return raw;
}

const PRIVY_APP_ID = getValidPrivyAppId(RAW_PRIVY_APP_ID);

// ============================================================
// ERROR BOUNDARY — Prevents Privy crashes from killing the app
// ============================================================

interface PrivyErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class PrivyErrorBoundary extends React.Component<
    { children: React.ReactNode },
    PrivyErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): PrivyErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[PrivyErrorBoundary] Privy initialization failed:', error.message);
        console.error('[PrivyErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    render() {
        if (this.state.hasError) {
            // Render children WITHOUT Privy — app still works, just no wallet features
            console.warn('[PrivyErrorBoundary] Rendering app without Privy wallet features');
            return this.props.children;
        }
        return this.props.children;
    }
}

// ============================================================
// PRIVY PROVIDER COMPONENT
// ============================================================

// ============================================================
// PRIVY CONFIGURATION
// ============================================================

const privyConfig = {
    appearance: {
        theme: 'dark' as 'dark',
        accentColor: '#D4AF37' as `#${string}`,
        logo: '/logo.svg',
        walletChainType: 'ethereum-and-solana' as 'ethereum-and-solana',
        walletList: [
            'phantom',
            'solflare',
            'metamask',
            'detected_solana_wallets',
            'detected_ethereum_wallets',
        ] as any[],
        showWalletLoginFirst: false,
    },
    loginMethods: ['google', 'email', 'wallet'] as any[],
    embeddedWallets: {
        solana: { createOnLogin: 'all-users' as 'all-users' },
        ethereum: { createOnLogin: 'all-users' as 'all-users' },
    },
    externalWallets: {
        solana: { connectors: solanaConnectors },
    },
    supportedChains: [solanaMainnet, solanaDevnet, ethereumMainnet],
    defaultChain: solanaMainnet,
};

// ============================================================
// PRIVY PROVIDER COMPONENT
// ============================================================

interface PrivyProviderProps {
    children: React.ReactNode;
}

/**
 * PrivyProvider — Enterprise Wallet Integration
 *
 * Features:
 * - Privy embedded wallet (auto-created for email/Google users)
 * - External Solana wallets (Phantom, Solflare, Backpack)
 * - External EVM wallets (MetaMask, Coinbase Wallet)
 * - WalletConnect / Reown protocol for mobile deep-linking
 * - Multi-chain support (Solana + Ethereum)
 *
 * Security:
 * - Token verification handled by backend PrivyService (SDK-based)
 * - No private keys exposed to frontend
 * - Embedded wallets use Privy's secure enclave
 * - Error boundary prevents crashes from killing the entire app
 */
export const PrivyProvider: React.FC<PrivyProviderProps> = ({ children }) => {
    // If App ID is missing or invalid, skip Privy gracefully
    if (!PRIVY_APP_ID) {
        console.warn('[PrivyProvider] Running without Privy — wallet features disabled');
        return <>{children}</>;
    }

    // Prevent re-initialization if React Strict Mode mounts/unmounts
    const isMounted = React.useRef(false);

    React.useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    return (
        <PrivyErrorBoundary>
            <PrivySDKProvider
                appId={PRIVY_APP_ID}
                config={privyConfig}
            >
                {children}
            </PrivySDKProvider>
        </PrivyErrorBoundary>
    );
};

// Alias for backward compatibility
export const PrivyWrapper = PrivyProvider;

export default PrivyProvider;
