
const crypto = require('crypto');
const fs = require('fs');

console.log('--- Generating Secure RSA Key Pair for Privy ---');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

console.log('Keys generated successfully.');

// Format Private Key for .env (remove newlines in file, keep newlines in string)
// Actually .env usually handles newlines if quoted. But to be safe, we can use \n replacement for single line storage if needed.
// However, most .env parsers handle multi-line strings if quoted.
// Let's just output it to a file `privy-private-key.pem` and `privy-certificate.pem`
// And also try to update .env automatically? No, safer to output first.

fs.writeFileSync('backend/privy-private-key.pem', privateKey);
console.log('Saved Private Key to backend/privy-private-key.pem');

// Convert Public Key to Certificate format (self-signed dummy or just the key?)
// Privy asks for a "Public certificate". Usually this means an X.509 cert.
// However, for just verifying a signature, a Public Key PEM is often sufficient for JWKS.
// But the UI says "Enter a x.509 certificate".
// So we should generate a self-signed certificate using the private key?
// Or just the public key in PEM format?
// The user's previous input showed "BEGIN CERTIFICATE".
// So we need to generate a self-signed certificate.
// Node's crypto module doesn't easily create X.509 certs without external libs or complexasn1.
// BUT, Privy documentation says "Enter a x.509 certificate OR use JWKS endpoint".
// If we provide just the Public Key, sometimes it works if the UI is flexible.
// But to be 100% safe and "best practice", we should use `openssl` via child_process if available.

const { execSync } = require('child_process');

try {
    console.log('Generating X.509 Certificate using OpenSSL...');
    // Create CSR config or just run openssl req
    // openssl req -new -x509 -key backend/privy-private-key.pem -out backend/privy-certificate.pem -days 365 -subj "/CN=privy-custom-auth"
    execSync('openssl req -new -x509 -key backend/privy-private-key.pem -out backend/privy-certificate.pem -days 365 -subj "/CN=privy-custom-auth"');
    console.log('Saved Certificate to backend/privy-certificate.pem');

    const cert = fs.readFileSync('backend/privy-certificate.pem', 'utf8');
    console.log('\n--- PUBLIC CERTIFICATE (COPY TO PRIVY) ---\n');
    console.log(cert);
    console.log('------------------------------------------\n');

    // Also read private key to print specifically for .env
    const privEnv = privateKey.replace(/\n/g, '\\n');
    console.log('--- PRIVATE KEY FOR .ENV ---\n');
    console.log(`PRIVY_SIGNING_KEY="${privEnv}"`);
    console.log('\n----------------------------');

} catch (e) {
    console.error('OpenSSL failed:', e.message);
    console.log('Fallback: Use the Public Key PEM if Privy accepts it, or install OpenSSL.');
    console.log(publicKey);
}
