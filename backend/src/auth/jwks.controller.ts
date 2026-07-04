import { Controller, Get, Logger, Res } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as fs from "fs"
import * as crypto from "crypto"
import { FastifyReply } from "fastify"

@Controller(".well-known")
export class JwksController {
    private readonly logger = new Logger(JwksController.name)

    constructor(private readonly configService: ConfigService) { }

    @Get("jwks.json")
    async getJwks(@Res() res: FastifyReply) {
        try {
            // Read public key from env or file
            let publicKeyPem: string

            const envKey = this.configService.get<string>("PRIVY_PUBLIC_KEY")
            if (envKey) {
                // Remove surrounding quotes if they exist
                let key = envKey.replace(/^"|"$/g, '').trim()
                
                // Decode base64 if key doesn't start with -----BEGIN
                if (!key.startsWith('-----BEGIN') && /^[a-zA-Z0-9+/=\s]+$/.test(key)) {
                    try {
                        key = Buffer.from(key, 'base64').toString('utf-8').trim()
                    } catch (e: any) {
                        this.logger.error(`Failed to decode base64 PRIVY_PUBLIC_KEY: ${e.message}`)
                    }
                }

                // Handle both literal newlines and escaped "\n" strings
                publicKeyPem = key.includes("\\n")
                    ? key.replace(/\\n/g, "\n")
                    : key
            } else {
                const publicKeyPath = process.cwd() + "/public.pem"
                if (fs.existsSync(publicKeyPath)) {
                    publicKeyPem = fs.readFileSync(publicKeyPath, "utf8")
                } else {
                    // Fallback one level up
                    const upOne = process.cwd() + "/../public.pem"
                    if (fs.existsSync(upOne)) {
                        publicKeyPem = fs.readFileSync(upOne, "utf8")
                    } else {
                        throw new Error("Public key not found")
                    }
                }
            }

            // Convert PEM to JWK
            const jwk = crypto.createPublicKey(publicKeyPem).export({ format: "jwk" })

            // Add kid and use/alg required by some verifiers (optional but good practice)
            // Ideally kid should match what was used in signing, but for RS256 usually thumbprint or static ID
            // For now, we'll rely on the fact that Privy/OIDC libraries often look for matching keys
            // We'll add standard RSA fields
            const jwkWithMeta = {
                ...jwk,
                use: "sig",
                alg: "RS256",
                kid: "seniqu-auth-key-1", // This must match the kid in the JWT header if we set it there. 
                // If we don't set kid in JWT, verifiers try all keys.
            }

            return res.send({
                keys: [jwkWithMeta],
            })
        } catch (error) {
            this.logger.error(`Failed to generate JWKS: ${error.message}`)
            return res.send({ keys: [] })
        }
    }
}
