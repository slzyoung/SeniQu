import { NestFactory } from "@nestjs/core"
import { ValidationPipe, Logger } from "@nestjs/common"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { ConfigService } from "@nestjs/config"
import helmet from "helmet"
import * as cookieParser from "cookie-parser"
import { AppModule } from "./app.module"
import { HttpExceptionFilter } from "./common/filters/http-exception.filter"
import { TransformInterceptor } from "./common/interceptors/transform.interceptor"
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor"

async function bootstrap() {
    const logger = new Logger("Bootstrap")

    const app = await NestFactory.create(AppModule, {
        logger: ["error", "warn", "log", "debug", "verbose"],
    })

    const configService = app.get(ConfigService)

    // ===========================================
    // SECURITY MIDDLEWARE
    // ===========================================

    // Helmet for security headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }))

    // Cookie parser (with secret for signed cookies — used by OAuth flow)
    const cookieSecret = configService.get<string>("google.oauthCookieSecret") || "seniqu-dev-oauth-cookie-secret"
    app.use(cookieParser(cookieSecret))

    // Trust proxy (required for secure cookies behind reverse proxies like Heroku/Railway/Render)
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);

    // CORS configuration
    const rawAllowedOrigins = configService.get<string>("CORS_ORIGINS")?.split(",") || []
    const cleanOrigins = rawAllowedOrigins.map(origin => origin.trim()).filter(Boolean)

    const defaultOrigins = [
        "http://localhost:3001",
        "http://localhost:5173",
        "https://seniquapp.netlify.app",
        "https://seniquwebapp.onrender.com",
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
        new LoggingInterceptor(),
        new TransformInterceptor(),
    )

    // ===========================================
    // API PREFIX & VERSIONING
    // ===========================================

    app.setGlobalPrefix("api/v1", {
        exclude: [".well-known/(.*)"],
    })

    // ===========================================
    // SWAGGER DOCUMENTATION
    // ===========================================

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
        .addTag("NFTs", "NFT minting & management")
        .addTag("Collections", "Collection management")
        .addTag("Governance", "DAO & Governance")
        .addTag("Admin", "Admin dashboard")
        .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup("api/docs", app, document, {
        customSiteTitle: "SeniQu API Documentation",
        customCss: ".swagger-ui .topbar { display: none }",
    })

    // ===========================================
    // START SERVER
    // ===========================================

    const port = configService.get<number>("PORT") || 3001

    await app.listen(port)

    logger.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🎨 SENIQU BACKEND                      ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}                 ║
║  API Docs:          http://localhost:${port}/api/docs        ║
║  Environment:       ${configService.get("NODE_ENV") || "development"}                       ║
╚═══════════════════════════════════════════════════════════╝
  `)
}

bootstrap()
