import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from "@nestjs/core"
import { ValidationPipe, Logger } from "@nestjs/common"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { ConfigService } from "@nestjs/config"
import {
    FastifyAdapter,
    NestFastifyApplication,
} from "@nestjs/platform-fastify"
import { AppModule } from "./app.module"
import { HttpExceptionFilter } from "./common/filters/http-exception.filter"
import { TransformInterceptor } from "./common/interceptors/transform.interceptor"
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor"
import { SecurityHeadersInterceptor } from "./common/interceptors/security-headers.interceptor"
import { XssSanitizerInterceptor } from "./common/interceptors/xss-sanitizer.interceptor"
import { Reflector } from "@nestjs/core"

async function bootstrap() {
    const logger = new Logger("Bootstrap")

    // ===========================================
    // FASTIFY ADAPTER — High-performance HTTP
    // ===========================================
    const fastifyAdapter = new FastifyAdapter({
        logger: false,
        trustProxy: true,
        bodyLimit: 150 * 1024 * 1024, // 150MB payload limit
    })

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        fastifyAdapter,
        {
            logger: ["error", "warn", "log", "debug", "verbose"],
        },
    )

    const configService = app.get(ConfigService)

    // ===========================================
    // SECURITY MIDDLEWARE (Fastify Plugins)
    // ===========================================

    // Helmet for security headers (OWASP)
    await app.register(require("@fastify/helmet"), {
        // CSP disabled on API server — frontend (Netlify) handles CSP
        // Having CSP on both API and frontend causes header conflicts
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        // Anti-Hacking: Force HTTPS via HSTS
        strictTransportSecurity: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
        // Anti-Hacking: Prevent server fingerprinting
        hidePoweredBy: true,
    })

    // Response compression (gzip/brotli) — reduces bandwidth
    await app.register(require("@fastify/compress"), {
        threshold: 1024, // Only compress responses > 1KB
    })

    // Cookie parser (with secret for signed cookies — used by OAuth flow)
    const cookieSecret = configService.get<string>("google.oauthCookieSecret")
    if (!cookieSecret) {
        logger.error("OAUTH_COOKIE_SECRET is not set! Aborting for security.")
        process.exit(1)
    }
    await app.register(require("@fastify/cookie"), {
        secret: cookieSecret,
    })

    // Multipart support (file uploads — replaces Multer)
    await app.register(require("@fastify/multipart"), {
        limits: {
            fileSize: 150 * 1024 * 1024, // 150MB
        },
    })

    // CORS configuration
    const rawAllowedOrigins = configService.get<string>("CORS_ORIGINS")?.split(",") || []
    const cleanOrigins = rawAllowedOrigins.map(origin => origin.trim()).filter(Boolean)

    const defaultOrigins = [
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://seniquapp.netlify.app",
        "https://seniqu.art",
        "https://www.seniqu.art",
        "https://rpc.ankr.com/solana",
        "https://api.seniqu.art",
        "https://solana-mainnet.rpc.extrnode.com/",
    ]

    const allowedOrigins = [...new Set([...cleanOrigins, ...defaultOrigins])]

    logger.log(`Allowed CORS Origins: ${JSON.stringify(allowedOrigins)}`)

    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Privy-Token",
            "X-Request-ID",
            "X-CSRF-Token",
            "X-Client-Fingerprint",
            "X-Request-Timestamp",
        ],
    })

    // ===========================================
    // GLOBAL PIPES, FILTERS, INTERCEPTORS
    // ===========================================

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    )

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter())

    // Global interceptors
    app.useGlobalInterceptors(
        new SecurityHeadersInterceptor(),
        new XssSanitizerInterceptor(app.get(Reflector)),
        new LoggingInterceptor(),
        new TransformInterceptor(),
    )

    // ===========================================
    // API PREFIX & VERSIONING
    // ===========================================

    app.setGlobalPrefix("api/v1", {
        exclude: [".well-known/(.*)", "favicon.ico"],
    })

    // ===========================================
    // SWAGGER DOCUMENTATION (Development/Staging only)
    // ===========================================

    const nodeEnv = configService.get("NODE_ENV") || "development"

    if (nodeEnv !== "production") {
        const swaggerConfig = new DocumentBuilder()
            .setTitle("SeniQu API")
            .setDescription("Indonesian Art Heritage Platform - Enterprise API")
            .setVersion("1.0.0")
            .addBearerAuth(
                {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    name: "Authorization",
                    description: "Enter JWT token",
                    in: "header",
                },
                "JWT-auth",
            )
            .addApiKey(
                {
                    type: "apiKey",
                    name: "X-Privy-Token",
                    in: "header",
                    description: "Privy authentication token",
                },
                "Privy-auth",
            )
            .addTag("Health", "Health check endpoints")
            .addTag("Auth", "Authentication & Authorization")
            .addTag("Users", "User management")
            .addTag("Artworks", "Artwork management")
            .addTag("Arts", "Digital art minting & management")
            .addTag("Collections", "Collection management")
            .addTag("Governance", "DAO & Governance")
            .addTag("Admin", "Admin dashboard")
            .build()

        const document = SwaggerModule.createDocument(app, swaggerConfig)
        SwaggerModule.setup("api/docs", app, document, {
            customSiteTitle: "SeniQu API Documentation",
            customCss: ".swagger-ui .topbar { display: none }",
        })

        logger.log("📖 Swagger API docs available at /api/docs")
    } else {
        logger.log("🔒 Swagger API docs disabled in production")
    }

    // ===========================================
    // START SERVER
    // ===========================================

    const port = configService.get<number>("PORT") || 3001

    await app.listen(port, "0.0.0.0")

    logger.log(`
╔═══════════════════════════════════════════════════════════╗
║              🚀 SENIQU BACKEND (FASTIFY)                  ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}                 ║
║  API Docs:          http://localhost:${port}/api/docs        ║
║  Environment:       ${configService.get("NODE_ENV") || "development"}                       ║
║  Adapter:           Fastify (high-performance)            ║
╚═══════════════════════════════════════════════════════════╝
  `)
}

bootstrap()
