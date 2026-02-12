
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

console.log('--- Privy Debug Script ---');

const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
console.log(`App ID: ${appId ? appId.substring(0, 5) + '...' : 'MISSING'}`);

let privateKey = process.env.PRIVY_SIGNING_KEY;

if (!privateKey) {
    console.log('PRIVY_SIGNING_KEY not found in env, checking file...');
    try {
        if (fs.existsSync('private.pem')) {
            privateKey = fs.readFileSync('private.pem', 'utf8');
            console.log('Loaded private key from private.pem');
        } else if (fs.existsSync('../private.pem')) {
            privateKey = fs.readFileSync('../private.pem', 'utf8');
            console.log('Loaded private key from ../private.pem');
        } else {
            console.log('private.pem not found');
        }
    } catch (e) {
        console.error('Error reading private key file:', e.message);
    }
} else {
    console.log('Loaded private key from PRIVY_SIGNING_KEY env');
    // Handle escaped newlines
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        console.log('Fixed escaped newlines in env key');
    }
}

if (!privateKey) {
    console.error('CRITICAL: No Private Key found!');
    process.exit(1);
}

console.log('Private Key Header:', privateKey.split('\n')[0]);

try {
    const payload = {
        sub: 'debug-user-123',
        iss: appId,
        aud: 'privy.io',
    };

    console.log('Attempting to sign RS256 token...');
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
    console.log('SUCCESS: Generated RS256 Token!');
    console.log('Token snippet:', token.substring(0, 20) + '...');
} catch (e) {
    console.error('FAILED to sign RS256 token:', e.message);

    if (e.message.includes('secret or public key must be provided')) {
        console.log('Hint: Key might be empty or malformed.');
    } else if (e.message.includes('PEM routines')) {
        console.log('Hint: Key format invalid. Check if it is a valid PEM.');
    }

    try {
        console.log('Attempting to sign ES256 token (in case it is an EC key)...');
        const token = jwt.sign(payload, privateKey, { algorithm: 'ES256', expiresIn: '1h' });
        console.log('SUCCESS: Generated ES256 Token!');
        console.log('Token snippet:', token.substring(0, 20) + '...');
    } catch (e2) {
        console.error('FAILED to sign ES256 token:', e2.message);
    }
}
console.log('--- End Debug ---');
