/// <reference types="vite/client" />

interface ImportMetaEnv {
    // API Configuration
    readonly VITE_API_URL: string;

    // Authentication Providers
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_PRIVY_APP_ID: string;

    // Rate Limiting
    readonly VITE_RATE_LIMIT_MAX_REQUESTS: string;
    readonly VITE_RATE_LIMIT_WINDOW_MS: string;
    readonly VITE_RATE_LIMIT_RETRY_DELAY: string;
    readonly VITE_RATE_LIMIT_MAX_RETRIES: string;

    // Security Features
    readonly VITE_SECURITY_CSRF_ENABLED: string;
    readonly VITE_SECURITY_FINGERPRINT_ENABLED: string;
    readonly VITE_SECURITY_MAX_PAYLOAD_SIZE: string;
    readonly VITE_SECURITY_RESPONSE_TIMEOUT: string;
    readonly VITE_SECURITY_MIN_RESPONSE_SIZE: string;

    // Application
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_ENV: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
