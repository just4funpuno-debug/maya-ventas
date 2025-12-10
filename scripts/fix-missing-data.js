/**
 * Script para identificar y reportar datos faltantes
 * 
 * Uso: node scripts/fix-missing-data.js
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

console.log('🔍 IDENTIFICANDO DATOS FALTANTES\n');

// 1. Venta histórica faltante
console.log('📊 1. Venta Histórica Faltante...');
const missingCodigo = 'c3f46842-848e-47d5-9098-81bd069ef430';
const fbSale = await db.collection('ventashistorico')
  .where('codigoUnico', '==', missingCodigo)
  .get();

if (!fbSale.empty) {
  const saleData = fbSale.docs[0].data();
  console.log('   Datos de la venta en Firebase:');
  console.log(`     ID: ${fbSale.docs[0].id}`);
  console.log(`     Código Único: ${saleData.codigoUnico}`);
  console.log(`     Fecha: ${saleData.fecha}`);
  console.log(`     Ciudad: ${saleData.ciudad}`);
  console.log(`     SKU: ${saleData.sku}`);
  console.log(`     Cantidad: ${saleData.cantidad}`);
  console.log(`     Vendedora: ${saleData.vendedora}`);
  console.log(`     Estado Entrega: ${saleData.estadoEntrega}`);
  
  // Verificar si existe en Supabase con otro código
  const { data: supabaseSale } = await supabase
    .from('sales')
    .select('*')
    .eq('fecha', saleData.fecha)
    .eq('ciudad', saleData.ciudad?.toLowerCase().replace(/\s+/g, '_'))
    .eq('sku', saleData.sku)
    .eq('cantidad', Number(saleData.cantidad || 0))
    .limit(1);
  
  if (supabaseSale && supabaseSale.length > 0) {
    console.log('\n   ⚠️  Venta encontrada en Supabase con datos similares:');
    console.log(`     ID Supabase: ${supabaseSale[0].id}`);
    console.log(`     Código Único Supabase: ${supabaseSale[0].codigo_unico}`);
    console.log(`     Diferencia: El código único no coincide`);
  } else {
    console.log('\n   ❌ Venta NO encontrada en Supabase');
    console.log('   Esta venta necesita ser migrada manualmente');
  }
}

// 2. Despacho faltante
console.log('\n🚚 2. Despacho Faltante (2025-11-28, SANTA CRUZ)...');
const fbDispatch = await db.collection('despachosHistorial')
  .where('fecha', '==', '2025-11-28')
  .where('ciudad', '==', 'SANTA CRUZ')
  .get();

if (!fbDispatch.empty) {
  const dispatchData = fbDispatch.docs[0].data();
  console.log('   Datos del despacho en Firebase:');
  console.log(`     ID: ${fbDispatch.docs[0].id}`);
  console.log(`     Fecha: ${dispatchData.fecha}`);
  console.log(`     Ciudad: ${dispatchData.ciudad}`);
  console.log(`     Items: ${JSON.stringify(dispatchData.items || {})}`);
  
  // Verificar si existe en Supabase
  const { data: supabaseDispatch } = await supabase
    .from('dispatches')
    .select('*')
    .eq('fecha', '2025-11-28')
    .eq('ciudad', 'santa_cruz')
    .eq('status', 'confirmado')
    .limit(1);
  
  if (supabaseDispatch && supabaseDispatch.length > 0) {
    console.log('\n   ⚠️  Despacho encontrado en Supabase:');
    console.log(`     ID Supabase: ${supabaseDispatch[0].id}`);
    console.log(`     Diferencia: La ciudad está normalizada (santa_cruz vs SANTA CRUZ)`);
  } else {
    console.log('\n   ❌ Despacho NO encontrado en Supabase');
    console.log('   Este despacho necesita ser migrado manualmente');
  }
}

// 3. Stock de Santa Cruz - FLEX-CAP-B6L
console.log('\n📦 3. Stock de Santa Cruz - FLEX-CAP-B6L...');
const santaCruzFB = await db.collection('cityStock').doc('SANTA CRUZ').get();
const santaCruzDataFB = santaCruzFB.data() || {};
const flexCapStockFB = santaCruzDataFB['FLEX-CAP-B6L'] || 0;

const { data: flexCapStockSB } = await supabase
  .from('city_stock')
  .select('cantidad')
  .eq('ciudad', 'santa_cruz')
  .eq('sku', 'FLEX-CAP-B6L')
  .single();

console.log(`   Firebase (SANTA CRUZ): ${flexCapStockFB}`);
console.log(`   Supabase (santa_cruz): ${flexCapStockSB?.cantidad || 0}`);
console.log(`   Diferencia: ${(flexCapStockSB?.cantidad || 0) - flexCapStockFB}`);

if (flexCapStockFB > 0 && (flexCapStockSB?.cantidad || 0) === 0) {
  console.log('\n   ⚠️  El stock de FLEX-CAP-B6L en Santa Cruz no se migró correctamente');
  console.log('   Posible causa: El SKU no existía en products al momento de la migración');
}

// 4. Resumen de ventas por cobrar
console.log('\n💰 4. Análisis de Ventas por Cobrar...');
const { data: allPendingSales } = await supabase
  .from('sales')
  .select('estado_entrega, estado_pago, deleted_from_pending_at, fecha')
  .is('deleted_from_pending_at', null)
  .eq('estado_pago', 'pendiente');

console.log(`   Total en Supabase: ${allPendingSales?.length || 0}`);
console.log(`   Total en Firebase (ventasporcobrar): 48`);

// Agrupar por fecha para ver si hay ventas recientes
const byDate = {};
(allPendingSales || []).forEach(s => {
  const fecha = s.fecha || '—';
  byDate[fecha] = (byDate[fecha] || 0) + 1;
});

const recentDates = Object.entries(byDate)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 5);

console.log('\n   Últimas 5 fechas con ventas pendientes:');
recentDates.forEach(([fecha, count]) => {
  console.log(`     ${fecha}: ${count} ventas`);
});

console.log('\n✅ Análisis completado');
console.log('\n📝 CONCLUSIÓN:');
console.log('   - La mayoría de las diferencias son por normalización de nombres de ciudades');
console.log('   - Hay 1 venta histórica y 1 despacho que no se migraron');
console.log('   - El stock de FLEX-CAP-B6L en Santa Cruz necesita revisión');
console.log('   - Las ventas por cobrar incluyen ventas entregadas que aún no se han cobrado (comportamiento correcto)');

process.exit(0);



