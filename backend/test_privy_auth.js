
require('dotenv').config({ path: 'backend/.env' });
const jwt = require('jsonwebtoken');
const fs = require('fs');

console.log('--- Privy Auth API Test ---');

const appId = process.env.PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID;
let privateKey = process.env.PRIVY_SIGNING_KEY;

if (!privateKey) {
    if (fs.existsSync('private.pem')) {
        privateKey = fs.readFileSync('private.pem', 'utf8');
    } else if (fs.existsSync('../private.pem')) {
        privateKey = fs.readFileSync('../private.pem', 'utf8');
    }
} else if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!privateKey || !appId) {
    console.error('Missing config');
    process.exit(1);
}

console.log(`Using App ID: ${appId}`);
console.log(`Using Private Key (start): ${privateKey.substring(0, 30)}...`);
console.log(`Using Private Key (end): ...${privateKey.substring(privateKey.length - 30)}`);

const userId = 'debug-user-' + Math.floor(Math.random() * 10000);
const payload = {
    sub: userId,
    iss: appId,
    aud: 'privy.io',
};

// Sign token
const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
    notBefore: '-1m'
});

console.log(`Generated token for ${userId}`);

// Make request to Privy
async function testAuth() {
    try {
        const url = 'https://auth.privy.io/api/v1/custom_jwt_account/authenticate';
        console.log(`POST ${url}`);

        // Use fetch (Node 18+)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'privy-app-id': appId,
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                token: token
            })
        });

        // If 404, endpoint might be wrong.
        // If 400/401, we want the body.

        const data = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${data}`);

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testAuth();
