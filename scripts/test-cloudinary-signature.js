// Script para probar el endpoint local de firma Cloudinary
// Ejecuta: node scripts/test-cloudinary-signature.js

import fetch from 'node-fetch';

async function testSignature() {
  const url = 'http://localhost:4000/api/cloudinary-signature';
  const body = { folder: 'productos' };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await resp.json();
  console.log('Respuesta del endpoint:', json);
}

testSignature().catch(console.error);
