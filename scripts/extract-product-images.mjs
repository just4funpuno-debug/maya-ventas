#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Ajusta el path si tu archivo de productos no es App.jsx
const src = path.join('src', 'App.jsx');
const outDir = path.join('public', 'img');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const code = fs.readFileSync(src, 'utf8');

// Busca productos con campo imagen: "data:image/xxx;base64,...."
const prodRegex = /imagen\s*:\s*["'`](data:image\/([a-zA-Z0-9+]+);base64,([^"'`]+))["'`]/g;
let match, count = 0;
let newCode = code;

while ((match = prodRegex.exec(code))) {
  const [full, dataUrl, ext, base64] = match;
  const fileName = `producto_${count + 1}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  // Reemplaza la base64 por la ruta pública
  newCode = newCode.replace(full, `imagen: "/img/${fileName}"`);
  count++;
}

if (count > 0) {
  // Haz backup del archivo original
  fs.copyFileSync(src, src + '.bak');
  fs.writeFileSync(src, newCode, 'utf8');
  console.log(`Extraídas y guardadas ${count} imágenes en public/img.`);
  console.log(`Referencias actualizadas en ${src}.`);
  console.log(`Backup creado en ${src}.bak`);
} else {
  console.log('No se encontraron imágenes base64 para extraer.');
}