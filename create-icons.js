const https = require('https');
const fs = require('fs');
const path = require('path');

const logoUrl = 'https://i.ibb.co/6cCZM1yB/c101864d-4a6d-49be-a145-003a54f20d55.png';
const publicDir = path.join(__dirname, 'loan-frontend', 'public');

const download = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(publicDir, filename));
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
};

const run = async () => {
  console.log('Downloading logo for icons...');
  await download(logoUrl, 'icon-192.png');
  await download(logoUrl, 'icon-512.png');
  await download(logoUrl, 'favicon.ico');
  console.log('✅ Icons created!');
};

run().catch(console.error);