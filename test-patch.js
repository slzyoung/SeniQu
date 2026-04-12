const http = require('http');

const data = JSON.stringify({
  avatarUrl: "data:image/jpeg;base64,hello"
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/users/me',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
