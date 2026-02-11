
import { PrivyClient } from '@privy-io/server-auth';

console.log('Inspecting PrivyClient prototype...');
console.log(Object.getOwnPropertyNames(PrivyClient.prototype));

const client = new PrivyClient('app-id', 'app-secret');
console.log('Client keys:', Object.keys(client));
