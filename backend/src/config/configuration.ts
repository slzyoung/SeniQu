import * as Joi from "joi"

/**
 * Application Configuration
 * Centralized configuration with type safety
 */
export const configuration = () => ({
    // Server
    port: parseInt(process.env.PORT || "3001", 10),
    nodeEnv: process.env.NODE_ENV || "development",

    // Database (Supabase)
    database: {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // Authentication
    auth: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },

    // Privy
    privy: {
        appId: process.env.PRIVY_APP_ID,
        appSecret: process.env.PRIVY_APP_SECRET,
        verificationKey: process.env.PRIVY_VERIFICATION_KEY,
        signingKey: process.env.PRIVY_SIGNING_KEY || (
            (process.env.PRIVY_SIGNING_KEY_1 || "") +
            (process.env.PRIVY_SIGNING_KEY_2 || "") +
            (process.env.PRIVY_SIGNING_KEY_3 || "")
        ) || undefined,
    },

    // Google OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/v1/auth/google/callback",
        oauthCookieSecret: process.env.OAUTH_COOKIE_SECRET,
    },

    // Frontend URL (for OAuth redirects)
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

    // Solana
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
        network: process.env.SOLANA_NETWORK || "devnet",
        programId: process.env.SENIQU_PROGRAM_ID,
    },

    // WalletConnect / Reown
    walletConnect: {
        projectId: process.env.WALLETCONNECT_PROJECT_ID,
        secretKey: process.env.WALLETCONNECT_SECRET_KEY,
    },

    // Cloudflare R2 Storage
    r2: {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME || "seniqu",
        publicUrl: process.env.R2_PUBLIC_URL,
    },

    // Security
    security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
        rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || "60", 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
        turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "",
    },

    // SMTP (Brevo)
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        user: process.env.SMTP_USER,
        key: process.env.SMTP_KEY,
        from: process.env.EMAIL_FROM || "SeniQu <noreply@seniqu.com>",
    },

    // Google Maps
    // SECURITY: Backend key (Places/Geocoding/Routes) MUST be separated from Frontend key (Maps JS only)
    googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_KEY || '',                    // Backend-only: Places API, Geocoding API, Routes API
        clientApiKey: process.env.FRONTEND_GOOGLE_MAPS_KEY || '',     // Frontend-only: Maps JavaScript API (public, restricted)
    },

    // AI Generation
    ai: {
        hfAccessToken: process.env.HF_ACCESS_TOKEN || '',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        cfAccountId: process.env.R2_ACCOUNT_ID || '',
        cfApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
        dailyLimit: parseInt(process.env.AI_DAILY_LIMIT || "5", 10),
    },
})

/**
 * Environment validation schema
 */
export const validationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),
    PORT: Joi.number().default(3001),

    // Database
    SUPABASE_URL: Joi.string().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

    // Auth
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default("7d"),

    // Privy
    PRIVY_APP_ID: Joi.string().required(),
    PRIVY_APP_SECRET: Joi.string().required(),
    PRIVY_SIGNING_KEY: Joi.string().optional(),
    PRIVY_SIGNING_KEY_1: Joi.string().optional(),
    PRIVY_SIGNING_KEY_2: Joi.string().optional(),
    PRIVY_SIGNING_KEY_3: Joi.string().optional(),
    PRIVY_VERIFICATION_KEY: Joi.string().optional(),

    // Google
    GOOGLE_CLIENT_ID: Joi.string().required(),
    GOOGLE_CLIENT_SECRET: Joi.string().required(),

    // Solana
    SOLANA_RPC_URL: Joi.string().default("https://api.devnet.solana.com"),
    SOLANA_NETWORK: Joi.string().valid("devnet", "mainnet-beta").default("devnet"),

    // WalletConnect / Reown
    WALLETCONNECT_PROJECT_ID: Joi.string().optional(),
    WALLETCONNECT_SECRET_KEY: Joi.string().optional(),

    // Security
    OAUTH_COOKIE_SECRET: Joi.string().min(32).required(),
    SESSION_SECRET: Joi.string().min(32).optional(),

    // Cloudflare R2 Storage
    R2_ACCOUNT_ID: Joi.string().optional(),
    R2_ACCESS_KEY_ID: Joi.string().optional(),
    R2_SECRET_ACCESS_KEY: Joi.string().optional(),
    R2_BUCKET_NAME: Joi.string().default("seniqu"),
    R2_PUBLIC_URL: Joi.string().optional(),

    // Cloudflare Turnstile (Anti-Bot CAPTCHA)
    TURNSTILE_SECRET_KEY: Joi.string().optional().allow(''),

    // SMTP
    SMTP_HOST: Joi.string().optional(),
    SMTP_PORT: Joi.number().default(587),
    SMTP_USER: Joi.string().optional(),
    SMTP_KEY: Joi.string().optional(),
    EMAIL_FROM: Joi.string().optional(),

    // Google Maps
    GOOGLE_MAPS_KEY: Joi.string().optional().allow(''),
    FRONTEND_GOOGLE_MAPS_KEY: Joi.string().optional().allow(''),

    // AI Generation
    HF_ACCESS_TOKEN: Joi.string().optional().allow(''),
    GEMINI_API_KEY: Joi.string().optional().allow(''),
    CLOUDFLARE_API_TOKEN: Joi.string().optional().allow(''),
    AI_DAILY_LIMIT: Joi.number().default(5),
})

export type AppConfiguration = ReturnType<typeof configuration>
