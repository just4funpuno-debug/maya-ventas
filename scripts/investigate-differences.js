/**
 * Script de Investigación de Diferencias
 * 
 * Identifica exactamente qué datos faltan o son diferentes entre Firebase y Supabase
 * 
 * Uso: node scripts/investigate-differences.js
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

console.log('🔍 INVESTIGANDO DIFERENCIAS ENTRE FIREBASE Y SUPABASE\n');

// 1. Investigar ventas históricas faltantes
console.log('📊 1. Ventas Históricas Faltantes...');
const firebaseHist = await db.collection('ventashistorico').get();
const firebaseHistCodigos = new Set(firebaseHist.docs.map(d => d.data().codigoUnico).filter(Boolean));

const { data: supabaseHist } = await supabase
  .from('sales')
  .select('codigo_unico, id, fecha, ciudad')
  .in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);

const supabaseHistCodigos = new Set((supabaseHist || []).map(s => s.codigo_unico).filter(Boolean));

const missingCodigos = [...firebaseHistCodigos].filter(c => !supabaseHistCodigos.has(c));
if (missingCodigos.length > 0) {
  console.log(`   ❌ Códigos únicos faltantes en Supabase: ${missingCodigos.length}`);
  // Encontrar la venta en Firebase
  for (const codigo of missingCodigos.slice(0, 3)) {
    const fbDoc = firebaseHist.docs.find(d => d.data().codigoUnico === codigo);
    if (fbDoc) {
      const data = fbDoc.data();
      console.log(`   - Código: ${codigo}`);
      console.log(`     ID Firebase: ${fbDoc.id}`);
      console.log(`     Fecha: ${data.fecha}, Ciudad: ${data.ciudad}`);
    }
  }
} else {
  console.log('   ✅ No hay códigos únicos faltantes');
}

// 2. Investigar ventas por cobrar
console.log('\n💰 2. Ventas por Cobrar...');
const firebasePorCobrar = await db.collection('ventasporcobrar').get();
const firebasePorCobrarCodigos = new Set(firebasePorCobrar.docs.map(d => d.data().codigoUnico).filter(Boolean));

const { data: supabasePorCobrar } = await supabase
  .from('sales')
  .select('codigo_unico, id, fecha, ciudad, estado_entrega, estado_pago, deleted_from_pending_at')
  .is('deleted_from_pending_at', null)
  .eq('estado_pago', 'pendiente');

console.log(`   Firebase: ${firebasePorCobrar.docs.length} ventas`);
console.log(`   Supabase: ${supabasePorCobrar?.length || 0} ventas`);

// Analizar por estado_entrega
const supabaseByEstado = {};
(supabasePorCobrar || []).forEach(s => {
  const estado = s.estado_entrega || '—';
  supabaseByEstado[estado] = (supabaseByEstado[estado] || 0) + 1;
});

console.log('\n   Supabase por estado_entrega:');
Object.entries(supabaseByEstado).forEach(([estado, count]) => {
  console.log(`     ${estado}: ${count}`);
});

// 3. Investigar stock de productos
console.log('\n📦 3. Stock de Productos...');
const firebaseProducts = await db.collection('almacenCentral').get();
const { data: supabaseProducts } = await supabase.from('products').select('sku, stock, nombre');

const stockDiffs = [];
for (const fbDoc of firebaseProducts.docs) {
  const fbData = fbDoc.data();
  const sbProduct = supabaseProducts?.find(p => p.sku === fbData.sku);
  
  if (sbProduct && Number(fbData.stock || 0) !== Number(sbProduct.stock || 0)) {
    stockDiffs.push({
      sku: fbData.sku,
      nombre: fbData.nombre,
      firebase: Number(fbData.stock || 0),
      supabase: Number(sbProduct.stock || 0),
      diferencia: Number(sbProduct.stock || 0) - Number(fbData.stock || 0)
    });
  }
}

if (stockDiffs.length > 0) {
  console.log(`   ⚠️  ${stockDiffs.length} productos con diferencias en stock:`);
  stockDiffs.forEach(diff => {
    console.log(`     ${diff.sku} (${diff.nombre}): Firebase=${diff.firebase}, Supabase=${diff.supabase} (diferencia: ${diff.diferencia > 0 ? '+' : ''}${diff.diferencia})`);
  });
} else {
  console.log('   ✅ No hay diferencias en stock');
}

// 4. Investigar stock por ciudad
console.log('\n🏙️  4. Stock por Ciudad - Santa Cruz...');
const firebaseCityStock = await db.collection('cityStock').get();
const santaCruzFB = firebaseCityStock.docs.find(d => d.id === 'SANTA CRUZ' || d.id === 'santa_cruz');
const santaCruzDataFB = santaCruzFB?.data() || {};

const { data: santaCruzSB } = await supabase
  .from('city_stock')
  .select('sku, cantidad')
  .eq('ciudad', 'santa_cruz');

console.log('   Firebase (SANTA CRUZ):');
const fbTotal = Object.entries(santaCruzDataFB)
  .filter(([key]) => key !== 'id')
  .reduce((sum, [_, val]) => sum + Number(val || 0), 0);
console.log(`     Total: ${fbTotal}`);

console.log('   Supabase (santa_cruz):');
const sbTotal = (santaCruzSB || []).reduce((sum, r) => sum + Number(r.cantidad || 0), 0);
console.log(`     Total: ${sbTotal}`);
console.log(`     Diferencia: ${sbTotal - fbTotal}`);

// Comparar SKU por SKU
const fbSkus = Object.entries(santaCruzDataFB)
  .filter(([key]) => key !== 'id')
  .map(([sku, cantidad]) => ({ sku, cantidad: Number(cantidad || 0) }));

const sbSkus = (santaCruzSB || []).map(r => ({ sku: r.sku, cantidad: Number(r.cantidad || 0) }));

const allSkus = new Set([...fbSkus.map(s => s.sku), ...sbSkus.map(s => s.sku)]);
const skuDiffs = [];

for (const sku of allSkus) {
  const fb = fbSkus.find(s => s.sku === sku)?.cantidad || 0;
  const sb = sbSkus.find(s => s.sku === sku)?.cantidad || 0;
  if (fb !== sb) {
    skuDiffs.push({ sku, firebase: fb, supabase: sb, diferencia: sb - fb });
  }
}

if (skuDiffs.length > 0) {
  console.log(`\n   Diferencias por SKU:`);
  skuDiffs.forEach(diff => {
    console.log(`     ${diff.sku}: Firebase=${diff.firebase}, Supabase=${diff.supabase} (${diff.diferencia > 0 ? '+' : ''}${diff.diferencia})`);
  });
}

// 5. Investigar despachos faltantes
console.log('\n🚚 5. Despachos Faltantes...');
const firebaseDispatches = await db.collection('despachosHistorial').get();
const { data: supabaseDispatches } = await supabase
  .from('dispatches')
  .select('id, fecha, ciudad, status')
  .eq('status', 'confirmado');

console.log(`   Firebase: ${firebaseDispatches.docs.length} despachos históricos`);
console.log(`   Supabase: ${supabaseDispatches?.length || 0} despachos confirmados`);

if (firebaseDispatches.docs.length !== (supabaseDispatches?.length || 0)) {
  console.log(`   ⚠️  Diferencia: ${Math.abs(firebaseDispatches.docs.length - (supabaseDispatches?.length || 0))}`);
  
  // Comparar por fecha y ciudad
  const fbByKey = {};
  firebaseDispatches.docs.forEach(d => {
    const data = d.data();
    const key = `${data.fecha || '—'}_${data.ciudad || '—'}`;
    fbByKey[key] = (fbByKey[key] || 0) + 1;
  });
  
  const sbByKey = {};
  (supabaseDispatches || []).forEach(d => {
    const key = `${d.fecha || '—'}_${d.ciudad || '—'}`;
    sbByKey[key] = (sbByKey[key] || 0) + 1;
  });
  
  const allKeys = new Set([...Object.keys(fbByKey), ...Object.keys(sbByKey)]);
  for (const key of allKeys) {
    const fb = fbByKey[key] || 0;
    const sb = sbByKey[key] || 0;
    if (fb !== sb) {
      console.log(`     ⚠️  ${key}: Firebase=${fb}, Supabase=${sb}`);
    }
  }
}

console.log('\n✅ Investigación completada');
process.exit(0);



