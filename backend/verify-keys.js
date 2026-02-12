
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

try {
    const privateKeyPath = path.resolve('/home/wii-ros/Documents/Project/seniqu-webapp/backend/private.pem');
    const publicKeyPath = path.resolve('/home/wii-ros/Documents/Project/seniqu-webapp/backend/public.pem');

    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        console.error("Keys not found!");
        process.exit(1);
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    console.log("Keys loaded.");

    const payload = { sub: "test-user", iss: "test-issuer", aud: "privy.io" };
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    console.log("Token signed.");

    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    console.log("Token verified successfully:", decoded);

} catch (e) {
    console.error("Verification failed:", e.message);
    process.exit(1);
}
