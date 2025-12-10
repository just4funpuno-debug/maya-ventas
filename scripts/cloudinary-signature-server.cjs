
const express = require('express');
const app = express();
const PORT = 4000;
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
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => {
  console.log('Servidor de prueba corriendo en http://localhost:4000/');
});
