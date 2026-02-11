import api from '../lib/api';
import { generateCSRFToken, checkRateLimit, generateFingerprint } from '../lib/security';

// ============================================================
// TYPES
// ============================================================

export interface NonceResponse {
    nonce: string;
    message: string;
    expiresAt: string;
}

export interface VerifySignatureResponse {
    verified: boolean;
    walletAddress: string;
}

export interface WalletConnection {
    id: string;
    walletAddress: string;
    chain: string;
    provider: string;
    label?: string;
    isPrimary: boolean;
    isEmbedded: boolean;
    status: string;
    verifiedAt?: string;
    lastUsedAt?: string;
    createdAt: string;
}

export interface LinkWalletParams {
    walletAddress: string;
    chain: string;
    provider: string;
    signature: string;
    nonce: string;
    label?: string;
    isPrimary?: boolean;
    isEmbedded?: boolean;
}

// ============================================================
// RATE LIMIT KEYS
// ============================================================

const RATE_LIMIT_KEYS = {
    NONCE: 'wallet_nonce',
    VERIFY: 'wallet_verify',
    LINK: 'wallet_link',
    CONNECTIONS: 'wallet_connections',
} as const;

// ============================================================
// WALLET SERVICE
// ============================================================

/**
 * WalletService — Frontend API client for wallet operations
 *
 * All methods include:
 * - Client-side rate limiting
 * - CSRF token headers
 * - Request fingerprinting
 * - Error handling with typed responses
 */
class WalletService {
    private static instance: WalletService;

    private constructor() { }

    static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    /**
     * Request a nonce for wallet signature verification
     */
    async requestNonce(walletAddress: string, chain: string = 'solana'): Promise<NonceResponse> {
        // Client-side rate limiting
        const canProceed = checkRateLimit(RATE_LIMIT_KEYS.NONCE);
        if (!canProceed) {
            throw new Error('Too many nonce requests. Please wait a moment.');
        }

        const fingerprint = await generateFingerprint();
        const csrfToken = generateCSRFToken();

        const response = await api.post('/wallet/nonce', {
            walletAddress,
            chain,
        }, {
            headers: {
                'X-CSRF-Token': csrfToken,
                'X-Client-Fingerprint': fingerprint,
            },
        });

        // Unwrap response envelope { success: true, data: ... }
        const body = response.data;
        return body.data || body;
    }

    /**
     * Verify a wallet signature against a nonce
     */
    async verifySignature(
        walletAddress: string,
        signature: string,
        nonce: string,
        chain: string = 'solana',
    ): Promise<VerifySignatureResponse> {
        const canProceed = checkRateLimit(RATE_LIMIT_KEYS.VERIFY);
        if (!canProceed) {
            throw new Error('Too many verification attempts. Please wait.');
        }

        const csrfToken = generateCSRFToken();

        const response = await api.post('/wallet/verify', {
            walletAddress,
            signature,
            nonce,
            chain,
        }, {
            headers: {
                'X-CSRF-Token': csrfToken,
            },
        });

        const body = response.data;
        return body.data || body;
    }

    /**
     * Link a verified external wallet to the user's account
     */
    async linkWallet(params: LinkWalletParams): Promise<{ message: string; wallet: WalletConnection }> {
        const canProceed = checkRateLimit(RATE_LIMIT_KEYS.LINK);
        if (!canProceed) {
            throw new Error('Too many link attempts. Please wait.');
        }

        const fingerprint = await generateFingerprint();
        const csrfToken = generateCSRFToken();

        const response = await api.post('/wallet/link', params, {
            headers: {
                'X-CSRF-Token': csrfToken,
                'X-Client-Fingerprint': fingerprint,
            },
        });

        const body = response.data;
        return body.data || body;
    }

    /**
     * Link a Privy embedded wallet (no signature required)
     */
    async linkEmbeddedWallet(
        walletAddress: string,
        chain: string = 'solana',
    ): Promise<{ message: string; wallet: WalletConnection }> {
        const csrfToken = generateCSRFToken();

        const response = await api.post('/wallet/link/embedded', {
            walletAddress,
            chain,
        }, {
            headers: {
                'X-CSRF-Token': csrfToken,
            },
        });

        const body = response.data;
        return body.data || body;
    }

    /**
     * Unlink a wallet from the user's account
     */
    async unlinkWallet(walletId: string): Promise<{ message: string }> {
        const csrfToken = generateCSRFToken();

        const response = await api.delete(`/wallet/link/${walletId}`, {
            headers: {
                'X-CSRF-Token': csrfToken,
            },
        });

        const body = response.data;
        return body.data || body;
    }

    /**
     * Get all connected wallets for the authenticated user
     */
    async getConnections(): Promise<{ wallets: WalletConnection[]; total: number }> {
        const canProceed = checkRateLimit(RATE_LIMIT_KEYS.CONNECTIONS);
        if (!canProceed) {
            throw new Error('Too many requests. Please wait.');
        }

        const response = await api.get('/wallet/connections');
        const body = response.data;
        return body.data || body;
    }

    /**
     * Get aggregated portfolio for the authenticated user
     */
    async getPortfolio(): Promise<any> {
        const response = await api.get('/wallet/portfolio');
        const body = response.data;
        return body.data || body;
    }

    /**
     * Get transaction history
     */
    async getTransactions(): Promise<any[]> {
        const response = await api.get('/wallet/transactions');
        const body = response.data;
        return body.data || body;
    }

    /**
     * Initiate a withdrawal
     */
    async withdraw(amount: number, token: string, destination: string): Promise<any> {
        const csrfToken = generateCSRFToken();
        const fingerprint = await generateFingerprint();

        const response = await api.post('/wallet/withdraw', {
            amount,
            token,
            destination
        }, {
            headers: {
                'X-CSRF-Token': csrfToken,
                'X-Client-Fingerprint': fingerprint,
            },
        });

        const body = response.data;
        return body.data || body;
    }
}

export const walletService = WalletService.getInstance();
export default walletService;
