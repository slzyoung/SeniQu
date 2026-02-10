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
    },

    // Google OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/v1/auth/google/callback",
        oauthCookieSecret: process.env.OAUTH_COOKIE_SECRET || "seniqu-dev-oauth-cookie-secret",
    },

    // Frontend URL (for OAuth redirects)
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

    // Solana
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
        network: process.env.SOLANA_NETWORK || "devnet",
        programId: process.env.SENIQU_PROGRAM_ID,
    },

    // Security
    security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
        rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || "60", 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
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

    // Google
    GOOGLE_CLIENT_ID: Joi.string().required(),
    GOOGLE_CLIENT_SECRET: Joi.string().required(),

    // Solana
    SOLANA_RPC_URL: Joi.string().default("https://api.devnet.solana.com"),
    SOLANA_NETWORK: Joi.string().valid("devnet", "mainnet-beta").default("devnet"),
})

export type AppConfiguration = ReturnType<typeof configuration>
