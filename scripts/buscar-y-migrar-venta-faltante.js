/**
 * Script para buscar y migrar una venta faltante desde Firebase
 * Venta: 25/10/2025, 4:00 PM, SUCRE, Wendy, celular 60322315, total 580.00
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Normalizar ciudad
function normalizeCity(ciudad) {
  if (!ciudad) return null;
  return ciudad.toLowerCase().trim().replace(/\s+/g, '_');
}

// Convertir timestamp de Firebase
function convertTimestamp(value) {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return null;
}

// Buscar venta en Firebase
async function buscarVentaEnFirebase() {
  console.log('🔍 Buscando venta en Firebase...\n');
  
  const fecha = '2025-10-25';
  const ciudad = 'SUCRE';
  const vendedora = 'Wendy';
  const celular = '60322315';
  const total = 580.00;
  
  // Buscar en ventasporcobrar
  console.log('📥 Buscando en ventasporcobrar...');
  const porCobrarRef = db.collection('ventasporcobrar');
  
  // Búsqueda 1: Por fecha
  const query1 = porCobrarRef.where('fecha', '==', fecha);
  const snap1 = await query1.get();
  
  console.log(`   Encontradas ${snap1.size} ventas con fecha ${fecha}`);
  
  let ventaEncontrada = null;
  
  for (const doc of snap1.docs) {
    const data = doc.data();
    const matchCiudad = (data.ciudad || '').toUpperCase() === ciudad.toUpperCase();
    const matchVendedora = (data.vendedora || '').toUpperCase().includes(vendedora.toUpperCase());
    const matchCelular = (data.celular || '').includes(celular);
    const matchTotal = Math.abs((data.total || 0) - total) < 1.00;
    
    console.log(`   - ID: ${doc.id}`);
    console.log(`     Ciudad: ${data.ciudad} (match: ${matchCiudad})`);
    console.log(`     Vendedora: ${data.vendedora} (match: ${matchVendedora})`);
    console.log(`     Celular: ${data.celular} (match: ${matchCelular})`);
    console.log(`     Total: ${data.total} (match: ${matchTotal})`);
    
    if (matchCiudad && (matchVendedora || matchCelular || matchTotal)) {
      ventaEncontrada = { id: doc.id, ...data, coleccion: 'ventasporcobrar' };
      console.log(`\n✅ VENTA ENCONTRADA en ventasporcobrar!`);
      break;
    }
  }
  
  // Si no se encontró, buscar en ventashistorico
  if (!ventaEncontrada) {
    console.log('\n📥 Buscando en ventashistorico...');
    const historicoRef = db.collection('ventashistorico');
    const query2 = historicoRef.where('fecha', '==', fecha);
    const snap2 = await query2.get();
    
    console.log(`   Encontradas ${snap2.size} ventas con fecha ${fecha}`);
    
    for (const doc of snap2.docs) {
      const data = doc.data();
      const matchCiudad = (data.ciudad || '').toUpperCase() === ciudad.toUpperCase();
      const matchVendedora = (data.vendedora || '').toUpperCase().includes(vendedora.toUpperCase());
      const matchCelular = (data.celular || '').includes(celular);
      const matchTotal = Math.abs((data.total || 0) - total) < 1.00;
      
      console.log(`   - ID: ${doc.id}`);
      console.log(`     Ciudad: ${data.ciudad} (match: ${matchCiudad})`);
      console.log(`     Vendedora: ${data.vendedora} (match: ${matchVendedora})`);
      console.log(`     Celular: ${data.celular} (match: ${matchCelular})`);
      console.log(`     Total: ${data.total} (match: ${matchTotal})`);
      
      if (matchCiudad && (matchVendedora || matchCelular || matchTotal)) {
        ventaEncontrada = { id: doc.id, ...data, coleccion: 'ventashistorico' };
        console.log(`\n✅ VENTA ENCONTRADA en ventashistorico!`);
        break;
      }
    }
  }
  
  return ventaEncontrada;
}

// Migrar venta a Supabase
async function migrarVenta(venta) {
  console.log('\n🔄 Migrando venta a Supabase...\n');
  
  // Convertir datos de Firebase a formato Supabase
  const ventaData = {
    fecha: venta.fecha || '2025-10-25',
    ciudad: normalizeCity(venta.ciudad || 'SUCRE'),
    sku: venta.sku || null,
    cantidad: parseInt(venta.cantidad || 3, 10),
    precio: parseFloat(venta.precio || 600.00),
    sku_extra: venta.skuExtra || null,
    cantidad_extra: parseInt(venta.cantidadExtra || 0, 10),
    total: parseFloat(venta.total || 580.00),
    vendedora: venta.vendedora || 'Wendy',
    vendedora_id: venta.vendedoraId || null,
    celular: venta.celular || '60322315',
    metodo: venta.metodo || 'Delivery',
    cliente: venta.cliente || null,
    notas: venta.notas || null,
    estado_entrega: venta.estadoEntrega || 'confirmado',
    estado_pago: 'pendiente',
    gasto: parseFloat(venta.gasto || 20.00),
    gasto_cancelacion: parseFloat(venta.gastoCancelacion || 0),
    codigo_unico: venta.codigoUnico || venta.codigo_unico || null,
    deleted_from_pending_at: null,
    hora_entrega: venta.horaEntrega || '16:00',
    comprobante: venta.comprobante || null,
    destino_encomienda: venta.destinoEncomienda || null,
    motivo: venta.motivo || null,
    sintetica_cancelada: Boolean(venta.sinteticaCancelada)
  };
  
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('sales')
    .select('id')
    .eq('fecha', ventaData.fecha)
    .eq('ciudad', ventaData.ciudad)
    .eq('celular', ventaData.celular)
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('⚠️  La venta ya existe en Supabase:', existing[0].id);
    return existing[0].id;
  }
  
  // Insertar en Supabase
  const { data: newVenta, error } = await supabase
    .from('sales')
    .insert(ventaData)
    .select('id')
    .single();
  
  if (error) {
    console.error('❌ Error insertando venta:', error);
    throw error;
  }
  
  console.log('✅ Venta migrada exitosamente. ID:', newVenta.id);
  
  // Asociar al depósito si existe
  const { data: deposit } = await supabase
    .from('deposits')
    .select('id')
    .eq('fecha', ventaData.fecha)
    .eq('ciudad', ventaData.ciudad)
    .limit(1);
  
  if (deposit && deposit.length > 0) {
    const depositId = deposit[0].id;
    
    // Actualizar venta con deposit_id
    await supabase
      .from('sales')
      .update({ deposit_id: depositId })
      .eq('id', newVenta.id);
    
    console.log('✅ Venta asociada al depósito:', depositId);
    
    // Actualizar campo nota del depósito
    // (Esto requeriría re-ejecutar el script de actualización de nota)
    console.log('⚠️  Nota: Necesitas actualizar el campo nota del depósito manualmente o re-ejecutar el script de actualización');
  }
  
  return newVenta.id;
}

// Función principal
async function main() {
  console.log('🚀 Buscando y migrando venta faltante...\n');
  
  try {
    // Buscar en Firebase
    const venta = await buscarVentaEnFirebase();
    
    if (!venta) {
      console.log('\n❌ Venta no encontrada en Firebase');
      console.log('   Verifica manualmente en Firebase Console');
      process.exit(1);
    }
    
    console.log('\n📋 Datos de la venta encontrada:');
    console.log(JSON.stringify(venta, null, 2));
    
    // Migrar a Supabase
    const ventaId = await migrarVenta(venta);
    
    console.log('\n✅ Proceso completado');
    console.log(`   Venta ID en Supabase: ${ventaId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();


