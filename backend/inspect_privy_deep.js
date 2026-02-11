const { PrivyClient } = require('@privy-io/server-auth');
try {
    const client = new PrivyClient('test', 'test');
    if (client.api) {
        console.log('API Instance keys:', Object.keys(client.api));
        console.log('API Prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.api)));
    }
} catch (e) {
    console.error(e);
}
