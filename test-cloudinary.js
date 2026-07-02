require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

cloudinary.api.ping()
  .then(r => { console.log('✅ Cloudinary connected!', r); process.exit(); })
  .catch(e => { console.error('❌ Cloudinary failed:', e.message); process.exit(); });