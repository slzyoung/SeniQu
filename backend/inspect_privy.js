const { PrivyClient } = require('@privy-io/server-auth');
try {
    const client = new PrivyClient('test', 'test');
    console.log('Instance keys:', Object.keys(client));
    console.log('Prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
} catch (e) {
    console.error(e);
}
