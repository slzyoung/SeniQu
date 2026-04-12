const fs = require('fs');
const http = require('http');

const data = JSON.stringify({
  avatarUrl: "data:image/jpeg;base64," + "a".repeat(6 * 1024 * 1024) // 6MB string
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/users/me',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    // we don't have token but if it fails with 413 it will fail before auth!
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
