
require('dotenv').config({ path: 'backend/.env' });
const fs = require('fs');
const crypto = require('crypto');

console.log('--- Verifying Private Key against Certificate ---');

const privateKeyPem = process.env.PRIVY_SIGNING_KEY;
if (!privateKeyPem) {
    console.error('Missing PRIVY_SIGNING_KEY in .env');
    process.exit(1);
}

// Ensure newlines
const normalizedPrivateKey = privateKeyPem.replace(/\\n/g, '\n');

if (!fs.existsSync('backend/certificate.pem')) {
    console.error('Missing backend/certificate.pem');
    process.exit(1);
}

const certificatePem = fs.readFileSync('backend/certificate.pem', 'utf8');

try {
    // 1. Create Private Key Object
    const privKeyObj = crypto.createPrivateKey(normalizedPrivateKey);
    const privKeyDetails = privKeyObj.export({ format: 'jwk' });

    // 2. Create Public Key Object from Certificate
    const pubKeyObj = crypto.createPublicKey(certificatePem);
    const pubKeyDetails = pubKeyObj.export({ format: 'jwk' });

    console.log(`Private Key Modulus (n) prefix: ${privKeyDetails.n.substring(0, 20)}...`);
    console.log(`Certificate Modulus (n) prefix: ${pubKeyDetails.n.substring(0, 20)}...`);

    if (privKeyDetails.n === pubKeyDetails.n && privKeyDetails.e === pubKeyDetails.e) {
        console.log('SUCCESS: Private Key matches the Certificate!');
    } else {
        console.error('FAILURE: Key mismatch!');
        console.log('Private Key Modulus:', privKeyDetails.n);
        console.log('Certificate Modulus:', pubKeyDetails.n);
        process.exit(1);
    }

} catch (e) {
    console.error('Error parsing keys:', e.message);
    process.exit(1);
}
