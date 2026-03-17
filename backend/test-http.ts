import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'artist@seniqu.com',
      password: 'password123'
    });
    const token = res.data.accessToken;
    
    console.log('Login successful. Fetching artworks...');
    const artRes = await axios.get('http://localhost:3001/api/v1/artist/artworks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Received ${artRes.data.data.length} artworks.`);
    console.log('Images: ', artRes.data.data.map(d => ({ title: d.title, hasImage: !!d.imageUrl, len: d.imageUrl?.length })));
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}
test();
