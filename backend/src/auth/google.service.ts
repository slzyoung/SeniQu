import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { OAuth2Client } from "google-auth-library"
import * as crypto from "crypto"

@Injectable()
export class GoogleService {
    private readonly logger = new Logger(GoogleService.name)
    private oauthClient: OAuth2Client

    constructor(private readonly configService: ConfigService) {
        const clientId = this.configService.get<string>("google.clientId")
        const clientSecret = this.configService.get<string>("google.clientSecret")

        if (!clientId || !clientSecret) {
            this.logger.error("Google OAuth credentials not configured")
        }

        this.oauthClient = new OAuth2Client(clientId, clientSecret)
    }

    // ─── PKCE ────────────────────────────────────────────────

    /**
     * Generate PKCE code_verifier and code_challenge (S256)
     */
    generatePKCE(): { codeVerifier: string; codeChallenge: string } {
        // RFC 7636: 43–128 chars, unreserved characters
        const codeVerifier = crypto.randomBytes(32).toString("base64url")
        const codeChallenge = crypto
            .createHash("sha256")
            .update(codeVerifier)
            .digest("base64url")
        return { codeVerifier, codeChallenge }
    }

    // ─── STATE (HMAC-signed with timestamp) ──────────────────

    /**
     * Generate an HMAC-signed state parameter with an embedded timestamp.
     * Format: <random>.<timestamp>.<signature>
     */
    generateSignedState(secret: string): string {
        const random = crypto.randomBytes(16).toString("hex")
        const timestamp = Date.now().toString()
        const payload = `${random}.${timestamp}`
        const signature = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("hex")
        return `${payload}.${signature}`
    }

    /**
     * Verify a signed state parameter.
     * Checks HMAC signature and that the timestamp is within maxAgeMs (default 10 min).
     */
    verifySignedState(state: string, secret: string, maxAgeMs = 10 * 60 * 1000): boolean {
        const parts = state.split(".")
        if (parts.length !== 3) return false

        const [random, timestamp, signature] = parts
        const payload = `${random}.${timestamp}`

        // Verify signature
        const expected = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("hex")

        if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
            this.logger.warn("OAuth state signature mismatch")
            return false
        }

        // Verify timestamp freshness
        const age = Date.now() - parseInt(timestamp, 10)
        if (age > maxAgeMs || age < 0) {
            this.logger.warn(`OAuth state expired (age: ${age}ms)`)
            return false
        }

        return true
    }

    // ─── NONCE ───────────────────────────────────────────────

    /**
     * Generate a cryptographically secure nonce
     */
    generateNonce(): string {
        return crypto.randomUUID()
    }

    // ─── GOOGLE TOKEN EXCHANGE ───────────────────────────────

    /**
     * Exchange code for tokens and get user profile.
     * Optionally verifies nonce in the ID token.
     */
    async verifyGoogleUser(
        code: string,
        redirectUri: string,
        codeVerifier?: string,
        expectedNonce?: string,
    ) {
        try {
            const { tokens } = await this.oauthClient.getToken({
                code,
                redirect_uri: redirectUri,
                codeVerifier,
            })

            if (!tokens.id_token) {
                throw new UnauthorizedException("No ID token returned from Google")
            }

            const ticket = await this.oauthClient.verifyIdToken({
                idToken: tokens.id_token,
                audience: this.configService.get<string>("google.clientId") || "",
            })

            const payload = ticket.getPayload()

            if (!payload) {
                throw new UnauthorizedException("Invalid Google token payload")
            }

            // Verify nonce if expected
            if (expectedNonce && payload.nonce !== expectedNonce) {
                this.logger.warn(`Nonce mismatch: expected=${expectedNonce}, got=${payload.nonce}`)
                throw new UnauthorizedException("Invalid nonce in Google ID token — possible replay attack")
            }

            return {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                googleId: payload.sub,
            }
        } catch (error) {
            this.logger.error(`Google Auth Error: ${error.message}`, error.stack)
            if (error.response?.data) {
                this.logger.error(`Google API Error Data: ${JSON.stringify(error.response.data)}`)
            }
            throw new UnauthorizedException(`Failed to verify Google account: ${error.message}`)
        }
    }

    /**
     * Build the Google OAuth authorization URL with PKCE and nonce
     */
    buildAuthUrl(params: {
        redirectUri: string
        state: string
        nonce: string
        codeChallenge: string
    }): string {
        const clientId = this.configService.get<string>("google.clientId") || ""
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
        authUrl.searchParams.set("client_id", clientId)
        authUrl.searchParams.set("redirect_uri", params.redirectUri)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("scope", "openid email profile")
        authUrl.searchParams.set("state", params.state)
        authUrl.searchParams.set("nonce", params.nonce)
        authUrl.searchParams.set("code_challenge", params.codeChallenge)
        authUrl.searchParams.set("code_challenge_method", "S256")
        authUrl.searchParams.set("access_type", "offline")
        authUrl.searchParams.set("prompt", "consent")
        return authUrl.toString()
    }
}
