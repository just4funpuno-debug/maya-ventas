/**
 * Script para migrar la venta histórica faltante
 * 
 * Migra la venta con código único: c3f46842-848e-47d5-9098-81bd069ef430
 * 
 * Uso: node scripts/migrate-missing-sale.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Convierte timestamp de Firebase a ISO string
 */
function convertTimestamp(value) {
  if (!value) return null;
  if (value && typeof value === 'object' && value.toDate) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  return null;
}

console.log('🔄 Migrando venta histórica faltante...\n');

// Buscar la venta en Firebase
const missingCodigo = 'c3f46842-848e-47d5-9098-81bd069ef430';
const fbSale = await db.collection('ventashistorico')
  .where('codigoUnico', '==', missingCodigo)
  .get();

if (fbSale.empty) {
  console.error('❌ Venta no encontrada en Firebase');
  process.exit(1);
}

const saleDoc = fbSale.docs[0];
const saleData = saleDoc.data();

console.log('📄 Datos de la venta:');
console.log(`   ID Firebase: ${saleDoc.id}`);
console.log(`   Código Único: ${saleData.codigoUnico}`);
console.log(`   Fecha: ${saleData.fecha}`);
console.log(`   Ciudad: ${saleData.ciudad}`);
console.log(`   SKU: ${saleData.sku}`);
console.log(`   Cantidad: ${saleData.cantidad}`);

// Obtener vendedora_id si existe
let vendedora_id = null;
if (saleData.vendedora) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .ilike('nombre', `%${saleData.vendedora.split(' ')[0]}%`)
    .limit(1)
    .single();
  
  if (user) {
    vendedora_id = user.id;
  }
}

// Normalizar ciudad
const ciudad = (saleData.ciudad || '').toLowerCase().replace(/\s+/g, '_');

// Preparar datos para Supabase
const supabaseSale = {
  fecha: saleData.fecha,
  ciudad: ciudad,
  sku: saleData.sku || null,
  cantidad: Number(saleData.cantidad || 0),
  precio: Number(saleData.precio || 0),
  sku_extra: saleData.skuExtra || null,
  cantidad_extra: Number(saleData.cantidadExtra || 0),
  total: saleData.total !== undefined ? Number(saleData.total) : null,
  vendedora: saleData.vendedora || null,
  vendedora_id: vendedora_id,
  celular: saleData.celular || null,
  metodo: saleData.metodo || null,
  cliente: saleData.cliente || null,
  notas: saleData.notas || null,
  estado_entrega: saleData.estadoEntrega || 'confirmado',
  estado_pago: saleData.estadoPago || 'cobrado',
  gasto: Number(saleData.gasto || 0),
  gasto_cancelacion: Number(saleData.gastoCancelacion || 0),
  codigo_unico: saleData.codigoUnico,
  confirmado_at: convertTimestamp(saleData.confirmadoAt),
  entregada_at: convertTimestamp(saleData.entregadaAt),
  cancelado_at: convertTimestamp(saleData.canceladoAt),
  created_at: convertTimestamp(saleData.createdAt) || new Date().toISOString(),
  comprobante: saleData.comprobante || null,
  hora_entrega: saleData.horaEntrega || null,
  destino_encomienda: saleData.destinoEncomienda || null,
  motivo: saleData.motivo || null,
  sintetica_cancelada: Boolean(saleData.sinteticaCancelada),
  deleted_from_pending_at: convertTimestamp(saleData.settledAt)
};

// Insertar en Supabase
const { data: inserted, error } = await supabase
  .from('sales')
  .insert(supabaseSale)
  .select()
  .single();

if (error) {
  console.error('❌ Error insertando venta en Supabase:', error);
  process.exit(1);
}

console.log('\n✅ Venta migrada exitosamente:');
console.log(`   ID Supabase: ${inserted.id}`);
console.log(`   Código Único: ${inserted.codigo_unico}`);
console.log(`   Fecha: ${inserted.fecha}`);
console.log(`   Ciudad: ${inserted.ciudad}`);

console.log('\n🎉 Migración completada');
process.exit(0);

