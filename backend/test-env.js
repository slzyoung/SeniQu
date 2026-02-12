
require('dotenv').config();

const key = process.env.PRIVY_SIGNING_KEY;

if (!key) {
    console.error("❌ PRIVY_SIGNING_KEY not found in process.env");
} else {
    console.log("✅ PRIVY_SIGNING_KEY found");
    console.log("Length:", key.length);
    console.log("First 50 chars:", key.substring(0, 50));
    const normalized = key.replace(/\\n/g, '\n');
    console.log("Contains newlines?", normalized.includes('\n'));
    // console.log("Full key:", normalized);
}
