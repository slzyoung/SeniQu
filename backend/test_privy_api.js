const appId = 'cmlhqery405jajm0bxzrubefr';
const appSecret = 'privy_app_secret_5u8S4Rgs2C9otyvzQ1wHL3fZbzcwxvTMhTTormcHTvzu9hYUdcTBXgjEV6atzX2WN7S5cAo9ZUquv2NGrj3H6Vdf';
const userId = 'test-user-123';

const endpoints = [
    `https://auth.privy.io/api/v1/apps/${appId}/custom_auth`,
    `https://auth.privy.io/api/v1/apps/${appId}/users/custom_auth`,
    `https://api.privy.io/v1/apps/${appId}/custom_auth`, // note: sometimes /api/v1 vs /v1
    `https://api.privy.io/v1/apps/${appId}/users/custom_auth`,
    `https://auth.privy.io/api/v1/users/custom_auth`
];

async function test() {
    const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');

    for (const url of endpoints) {
        console.log(`Testing ${url}...`);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'privy-app-id': appId
                },
                body: JSON.stringify({ userId })
            });
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log('Success! Token:', data.token ? 'YES' : 'NO');
                break;
            } else {
                console.log('Error:', await res.text());
            }
        } catch (e) {
            console.log('Exception:', e.message);
        }
        console.log('---');
    }
}

test();
