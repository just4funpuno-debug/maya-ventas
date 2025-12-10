// Servidor Express para pruebas locales de firma Cloudinary
// Ejecuta: node scripts/cloudinary-signature-server.js

const express = require('express');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

const app = express();
// Middleware manual para CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[CORS] ${req.method} ${req.url} - Origin: ${origin}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Preflight OPTIONS request handled');
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

app.post('/api/cloudinary-signature', (req, res) => {
  const { folder = 'productos', public_id } = req.body || {};
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder };
  if (public_id) params.public_id = public_id;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ error: 'Falta CLOUDINARY_CLOUD_NAME en variables de entorno' });
  }
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Faltan CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET en variables de entorno' });
  }

  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const toSign = `${sorted}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  return res.status(200).json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor Cloudinary Signature corriendo en http://localhost:${PORT}/api/cloudinary-signature`);
});
