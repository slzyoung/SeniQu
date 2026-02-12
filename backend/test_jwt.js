const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testJWT() {
    console.log("Testing Custom JWT Generation...");

    const privateKeyRaw = process.env.PRIVY_SIGNING_KEY;
    const appId = process.env.PRIVY_APP_ID;

    if (!privateKeyRaw || !appId) {
        console.error("Missing PRIVY_SIGNING_KEY or PRIVY_APP_ID in .env");
        return;
    }

    // Fix newlines if needed (mimics service logic)
    const privateKey = privateKeyRaw.includes("\\n")
        ? privateKeyRaw.replace(/\\n/g, "\n")
        : privateKeyRaw;

    console.log("Private Key loaded (length):", privateKey.length);

    try {
        const userId = "test-user-123";
        const payload = {
            sub: userId,
            iss: appId,
            aud: 'privy.io',
        };

        console.log("Signing token with payload:", JSON.stringify(payload, null, 2));

        const token = jwt.sign(payload, privateKey, {
            algorithm: "RS256",
            expiresIn: "1h",
            // header: { kid: "..." } // Optional: Is a specific kid required?
        });

        console.log("✅ Token generated successfully:\n", token);
        const decoded = jwt.decode(token, { complete: true });
        console.log("decoded header:", decoded.header);
        console.log("decoded payload:", decoded.payload);

        // Optional: Verify locally with Public Key if available
        const publicKeyRaw = process.env.PRIVY_PUBLIC_KEY;
        if (publicKeyRaw) {
            const publicKey = publicKeyRaw.includes("\\n") ? publicKeyRaw.replace(/\\n/g, "\n") : publicKeyRaw;
            console.log("Verifying with Public Key...");
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            console.log("✅ verified:", decoded);
        }

    } catch (error) {
        console.error("❌ JWT Generation Failed:", error.message);
        if (error.message.includes("PEM")) {
            console.error("Hint: Check key format in .env (newlines vs literal \\n)");
        }
    }
}

testJWT();
