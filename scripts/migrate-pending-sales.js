/**
 * Script de Migración: Ventas Pendientes (VentasSinConfirmar → sales)
 * Fase 5.3: Migración de Ventas Pendientes
 * 
 * Migra ventas con estado_entrega = 'pendiente'
 * 
 * Uso: node scripts/migrate-pending-sales.js
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
  console.error('   Necesitas: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Convierte timestamp de Firebase a ISO string
 */
function convertTimestamp(value) {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return null;
}

/**
 * Convierte fecha a formato date (YYYY-MM-DD)
 */
function convertDate(value) {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate().toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    if (value.includes('T')) {
      return value.split('T')[0];
    }
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString().split('T')[0];
  }
  return null;
}

/**
 * Normaliza nombre de ciudad
 */
function normalizeCity(ciudad) {
  if (!ciudad) return null;
  return ciudad.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Mapea un documento de VentasSinConfirmar a un registro de sales
 */
function mapSaleToSupabase(doc) {
  const data = doc.data();
  
  const mapped = {
    fecha: convertDate(data.fecha),
    ciudad: normalizeCity(data.ciudad),
    sku: data.sku || null,
    cantidad: parseInt(data.cantidad || 1, 10),
    precio: parseFloat(data.precio || 0),
    sku_extra: data.skuExtra || data.sku_extra || null,
    cantidad_extra: parseInt(data.cantidadExtra || data.cantidad_extra || 0, 10),
    total: data.total !== undefined ? parseFloat(data.total) : null,
    
    vendedora: data.vendedora || data.vendedor || null,
    vendedora_id: data.vendedoraId || data.vendedora_id || null,
    celular: data.celular || null,
    
    metodo: data.metodo || null,
    cliente: data.cliente || null,
    notas: data.notas || null,
    
    // CRÍTICO: Estado pendiente
    estado_entrega: 'pendiente',
    estado_pago: 'pendiente',
    
    gasto: parseFloat(data.gasto || 0),
    gasto_cancelacion: parseFloat(data.gastoCancelacion || data.gasto_cancelacion || 0),
    
    created_at: convertTimestamp(data.createdAt),
    confirmado_at: null, // Pendiente, no confirmada
    entregada_at: null,
    cancelado_at: null,
    settled_at: null,
    fecha_cobro: null,
    
    comprobante: data.comprobante || null,
    hora_entrega: data.horaEntrega || data.hora_entrega || data.hora || null,
    destino_encomienda: data.destinoEncomienda || data.destino_encomienda || null,
    motivo: data.motivo || null,
    sintetica_cancelada: Boolean(data.sinteticaCancelada || data.sintetica_cancelada || false),
    
    codigo_unico: data.codigoUnico || data.codigo_unico || null,
    
    // NULL = no está en lista por cobrar (aún está pendiente)
    deleted_from_pending_at: null
  };

  // Limpiar valores undefined
  Object.keys(mapped).forEach(key => {
    if (mapped[key] === undefined) {
      mapped[key] = null;
    }
  });

  return mapped;
}

/**
 * Migra VentasSinConfirmar a sales
 */
async function migratePendingSales() {
  console.log('🚀 Iniciando migración de ventas pendientes...\n');

  try {
    // 1. Obtener productos y usuarios para validar referencias
    console.log('📥 Obteniendo productos y usuarios de Supabase...');
    const { data: products } = await supabase.from('products').select('sku');
    const { data: users } = await supabase.from('users').select('id');
    
    const validSkus = new Set(products?.map(p => p.sku) || []);
    const validUserIds = new Set(users?.map(u => u.id) || []);
    
    console.log(`✅ Productos: ${validSkus.size}, Usuarios: ${validUserIds.size}\n`);

    // 2. Obtener todas las ventas pendientes de Firebase
    console.log('📥 Leyendo VentasSinConfirmar de Firebase...');
    const snapshot = await db.collection('VentasSinConfirmar').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron ventas en VentasSinConfirmar');
      return;
    }

    console.log(`✅ Ventas encontradas: ${snapshot.size}\n`);

    // 3. Verificar ventas existentes en Supabase por codigo_unico
    const { data: existingSales } = await supabase
      .from('sales')
      .select('codigo_unico');

    const existingCodigos = new Set(
      existingSales?.map(s => s.codigo_unico).filter(c => c) || []
    );
    console.log(`📊 Ventas existentes en Supabase: ${existingCodigos.size}\n`);

    // 4. Migrar ventas pendientes
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const warnings = [];

    console.log('🔄 Migrando ventas pendientes...\n');

    for (const doc of snapshot.docs) {
      try {
        const mapped = mapSaleToSupabase(doc);

        // Validaciones básicas
        if (!mapped.fecha || !mapped.ciudad) {
          warnings.push(`Venta ${doc.id}: Sin fecha o ciudad, saltando...`);
          skipCount++;
          continue;
        }

        // Validar SKU
        if (mapped.sku && !validSkus.has(mapped.sku)) {
          warnings.push(`Venta ${doc.id}: SKU ${mapped.sku} no existe en products, se establecerá a NULL`);
          mapped.sku = null;
        }

        // Validar SKU extra
        if (mapped.sku_extra && !validSkus.has(mapped.sku_extra)) {
          warnings.push(`Venta ${doc.id}: SKU extra ${mapped.sku_extra} no existe, se establecerá a NULL`);
          mapped.sku_extra = null;
        }

        // Validar vendedora_id
        if (mapped.vendedora_id && !validUserIds.has(mapped.vendedora_id)) {
          warnings.push(`Venta ${doc.id}: vendedora_id ${mapped.vendedora_id} no existe, se establecerá a NULL`);
          mapped.vendedora_id = null;
        }

        // Verificar si ya existe por codigo_unico
        if (mapped.codigo_unico && existingCodigos.has(mapped.codigo_unico)) {
          console.log(`⏭️  Venta ${doc.id}: codigo_unico ${mapped.codigo_unico} ya existe, saltando...`);
          skipCount++;
          continue;
        }

        // Insertar en Supabase
        const { data, error } = await supabase
          .from('sales')
          .insert(mapped)
          .select('id, codigo_unico')
          .single();

        if (error) {
          // Si es error de codigo_unico duplicado, saltar
          if (error.code === '23505' && error.message.includes('codigo_unico')) {
            skipCount++;
            continue;
          }
          throw error;
        }

        successCount++;
        
        if (successCount % 5 === 0 || successCount === snapshot.size) {
          console.log(`   ✅ Migradas ${successCount} ventas pendientes...`);
        }

      } catch (err) {
        errorCount++;
        const errorMsg = `Error migrando venta ${doc.id}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ id: doc.id, error: errorMsg });
      }
    }

    // 5. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Migradas exitosamente: ${successCount}`);
    console.log(`⏭️  Saltadas (ya existían): ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total en Firebase: ${snapshot.size}`);
    console.log('='.repeat(60) + '\n');

    // 6. Validación de conteos
    console.log('🔍 Validando conteos...\n');
    
    const { count: pendingCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('estado_entrega', 'pendiente');

    console.log(`📊 Ventas pendientes en Supabase: ${pendingCount}`);
    console.log(`📊 Ventas pendientes en Firebase: ${snapshot.size}`);
    
    if (pendingCount >= snapshot.size - skipCount) {
      console.log('✅ Conteos válidos\n');
    } else {
      console.warn(`⚠️  Diferencia: ${snapshot.size - skipCount - pendingCount} ventas\n`);
    }

    // 7. Validación de estado
    console.log('🔍 Validando estado de ventas pendientes...\n');
    
    const { data: pendingSales } = await supabase
      .from('sales')
      .select('estado_entrega, estado_pago')
      .eq('estado_entrega', 'pendiente');

    const allPending = pendingSales?.every(s => 
      s.estado_entrega === 'pendiente' && s.estado_pago === 'pendiente'
    );

    if (allPending) {
      console.log('✅ Todas las ventas pendientes tienen estado correcto\n');
    } else {
      console.warn('⚠️  Algunas ventas pendientes no tienen el estado esperado\n');
    }

    // 8. Mostrar advertencias y errores
    if (warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:');
      warnings.slice(0, 10).forEach(w => console.log(`   ${w}`));
      if (warnings.length > 10) {
        console.log(`   ... y ${warnings.length - 10} más`);
      }
      console.log('');
    }

    if (errors.length > 0) {
      console.log('❌ ERRORES DETALLADOS:');
      errors.forEach(err => {
        console.log(`   - ${err.id}: ${err.error}`);
      });
      console.log('');
    }

    console.log('✅ Migración de ventas pendientes completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migratePendingSales()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



