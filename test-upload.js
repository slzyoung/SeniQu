const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function run() {
  const form = new FormData();
  form.append('folder', 'avatars');
  // create dummy file
  fs.writeFileSync('dummy.jpg', 'fake image data');
  form.append('file', fs.createReadStream('dummy.jpg'));

  // Need user token... I can login as bebek! Wait, bebek's privy token is unknown.
  // Can I bypass JWT? No.
  // But wait, the backend allows using the Anon key? No, JwtAuthGuard doesn't allow Supabase Anon key.
}
run();
