
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

try {
    const publicKeyPath = path.join(process.cwd(), 'backend', 'public.pem');
    if (!fs.existsSync(publicKeyPath)) {
        console.error(`Public key not found at ${publicKeyPath}`);
        process.exit(1);
    }

    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
    const jwk = crypto.createPublicKey(publicKeyPem).export({ format: 'jwk' });

    console.log("JWK Generation Successful:");
    console.log(JSON.stringify(jwk, null, 2));

    // Verify it has the required properties for RSA
    if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
        console.log("JWK is a valid RSA key.");
    } else {
        console.error("JWK is missing required RSA properties.");
        process.exit(1);
    }

} catch (error) {
    console.error("Error generating JWK:", error);
    process.exit(1);
}
