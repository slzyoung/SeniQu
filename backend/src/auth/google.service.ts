import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { OAuth2Client } from "google-auth-library"

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

    /**
     * Exchange code for tokens and get user profile
     */
    async verifyGoogleUser(code: string, redirectUri: string, codeVerifier?: string) {
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

            return {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                googleId: payload.sub,
            }
        } catch (error) {
            this.logger.error(`Google Auth Error: ${error.message}`, error.stack)
            // Throw specific error if available from Google
            if (error.response?.data) {
                this.logger.error(`Google API Error Data: ${JSON.stringify(error.response.data)}`)
            }
            throw new UnauthorizedException(`Failed to verify Google account: ${error.message}`)
        }
    }
}
