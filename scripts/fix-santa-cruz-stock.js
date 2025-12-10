/**
 * Script para corregir el stock de FLEX-CAP-B6L en Santa Cruz
 * 
 * Restaura las 30 unidades faltantes en el stock de Santa Cruz
 * 
 * Uso: node scripts/fix-santa-cruz-stock.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Corrigiendo stock de Santa Cruz - FLEX-CAP-B6L...\n');

// Obtener stock de Firebase
const santaCruzFB = await db.collection('cityStock').doc('SANTA CRUZ').get();
const santaCruzDataFB = santaCruzFB.data() || {};
const flexCapStockFB = santaCruzDataFB['FLEX-CAP-B6L'] || 0;

console.log(`📊 Stock en Firebase: ${flexCapStockFB} unidades`);

// Obtener stock actual en Supabase
const { data: currentStock } = await supabase
  .from('city_stock')
  .select('cantidad')
  .eq('ciudad', 'santa_cruz')
  .eq('sku', 'FLEX-CAP-B6L')
  .single();

const currentStockSB = currentStock?.cantidad || 0;
console.log(`📊 Stock actual en Supabase: ${currentStockSB} unidades`);
console.log(`📊 Diferencia: ${flexCapStockFB - currentStockSB} unidades`);

if (flexCapStockFB === currentStockSB) {
  console.log('\n✅ El stock ya está correcto');
  process.exit(0);
}

// Verificar que el producto existe
const { data: product } = await supabase
  .from('products')
  .select('sku, nombre')
  .eq('sku', 'FLEX-CAP-B6L')
  .single();

if (!product) {
  console.error('❌ El producto FLEX-CAP-B6L no existe en Supabase');
  console.error('   Necesitas crear el producto primero');
  process.exit(1);
}

console.log(`✅ Producto encontrado: ${product.nombre}`);

// Actualizar o insertar stock
if (currentStock) {
  // Actualizar stock existente
  const { data: updated, error } = await supabase
    .from('city_stock')
    .update({ cantidad: flexCapStockFB })
    .eq('ciudad', 'santa_cruz')
    .eq('sku', 'FLEX-CAP-B6L')
    .select()
    .single();

  if (error) {
    console.error('❌ Error actualizando stock:', error);
    process.exit(1);
  }

  console.log(`\n✅ Stock actualizado: ${updated.cantidad} unidades`);
} else {
  // Insertar nuevo registro
  const { data: inserted, error } = await supabase
    .from('city_stock')
    .insert({
      ciudad: 'santa_cruz',
      sku: 'FLEX-CAP-B6L',
      cantidad: flexCapStockFB
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error insertando stock:', error);
    process.exit(1);
  }

  console.log(`\n✅ Stock insertado: ${inserted.cantidad} unidades`);
}

console.log('\n🎉 Corrección completada');
process.exit(0);



