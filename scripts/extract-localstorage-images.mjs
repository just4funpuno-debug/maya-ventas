#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const outDir = path.join('public', 'img');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const lsFile = 'localstorage-export.json'; // Debes exportar tu LocalStorage a este archivo

if (!fs.existsSync(lsFile)) {
  console.error(`Exporta tu LocalStorage a ${lsFile} (usa la extensión "Local Storage Manager" en Chrome/Edge)`);
  process.exit(1);
}

const ls = JSON.parse(fs.readFileSync(lsFile, 'utf8'));
const products = JSON.parse(ls['ventas.products'] || '[]');
let count = 0;

for (const p of products) {
  if (typeof p.imagen === 'string' && p.imagen.startsWith('data:image/')) {
    const match = p.imagen.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) continue;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64 = match[2];
    const fileName = `${p.sku || 'producto'}_${count + 1}.${ext}`;
    fs.writeFileSync(path.join(outDir, fileName), Buffer.from(base64, 'base64'));
    p.imagen = `/img/${fileName}`;
    count++;
  }
}

// Guarda los productos con rutas públicas
fs.writeFileSync('products-migrated.json', JSON.stringify(products, null, 2));
console.log(`Extraídas y guardadas ${count} imágenes en public/img.`);
console.log('Archivo products-migrated.json generado con rutas públicas.');