/**
 * Script de Migración: Ventas por Cobrar (ventasporcobrar → sales)
 * Fase 5.2: Migración de Ventas por Cobrar
 * 
 * Estrategia:
 * - Buscar en sales por codigoUnico
 * - Si existe: actualizar deleted_from_pending_at = NULL (activar en lista por cobrar)
 * - Si NO existe: crear nueva fila
 * 
 * Uso: node scripts/migrate-sales-pending.js
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
 * Mapea un documento de ventasporcobrar a un registro de sales
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
    
    estado_entrega: data.estadoEntrega || data.estado_entrega || 'confirmado',
    estado_pago: data.estadoPago || data.estado_pago || 'pendiente',
    
    gasto: parseFloat(data.gasto || 0),
    gasto_cancelacion: parseFloat(data.gastoCancelacion || data.gasto_cancelacion || 0),
    
    created_at: convertTimestamp(data.createdAt),
    confirmado_at: convertTimestamp(data.confirmadoAt),
    entregada_at: convertTimestamp(data.entregadaAt),
    cancelado_at: convertTimestamp(data.canceladoAt),
    settled_at: convertTimestamp(data.settledAt),
    fecha_cobro: convertTimestamp(data.fechaCobro || data.fecha_cobro),
    
    comprobante: data.comprobante || null,
    hora_entrega: data.horaEntrega || data.hora_entrega || data.hora || null,
    destino_encomienda: data.destinoEncomienda || data.destino_encomienda || null,
    motivo: data.motivo || null,
    sintetica_cancelada: Boolean(data.sinteticaCancelada || data.sintetica_cancelada || false),
    
    codigo_unico: data.codigoUnico || data.codigo_unico || null,
    
    // CRÍTICO: NULL = está en lista por cobrar
    deleted_from_pending_at: null
  };

  // Normalizar estado_entrega
  const estadosValidos = ['pendiente', 'confirmado', 'entregada', 'cancelado'];
  if (!estadosValidos.includes(mapped.estado_entrega)) {
    if (mapped.estado_entrega === 'entregado') mapped.estado_entrega = 'entregada';
    else mapped.estado_entrega = 'confirmado';
  }

  // Normalizar estado_pago
  const estadosPagoValidos = ['pendiente', 'cobrado', 'cancelado'];
  if (!estadosPagoValidos.includes(mapped.estado_pago)) {
    mapped.estado_pago = 'pendiente';
  }

  // Limpiar valores undefined
  Object.keys(mapped).forEach(key => {
    if (mapped[key] === undefined) {
      mapped[key] = null;
    }
  });

  return mapped;
}

/**
 * Migra ventasporcobrar a sales
 */
async function migrateSalesPending() {
  console.log('🚀 Iniciando migración de ventas por cobrar...\n');

  try {
    // 1. Obtener productos y usuarios para validar referencias
    console.log('📥 Obteniendo productos y usuarios de Supabase...');
    const { data: products } = await supabase.from('products').select('sku');
    const { data: users } = await supabase.from('users').select('id');
    
    const validSkus = new Set(products?.map(p => p.sku) || []);
    const validUserIds = new Set(users?.map(u => u.id) || []);
    
    console.log(`✅ Productos: ${validSkus.size}, Usuarios: ${validUserIds.size}\n`);

    // 2. Obtener todas las ventas por cobrar de Firebase
    console.log('📥 Leyendo ventasporcobrar de Firebase...');
    const snapshot = await db.collection('ventasporcobrar').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron ventas en ventasporcobrar');
      return;
    }

    console.log(`✅ Ventas encontradas: ${snapshot.size}\n`);

    // 3. Obtener todas las ventas existentes en Supabase con codigo_unico
    console.log('📥 Obteniendo ventas existentes en Supabase...');
    const { data: existingSales } = await supabase
      .from('sales')
      .select('id, codigo_unico, deleted_from_pending_at');

    const salesByCodigo = new Map();
    existingSales?.forEach(sale => {
      if (sale.codigo_unico) {
        salesByCodigo.set(sale.codigo_unico, sale);
      }
    });

    console.log(`✅ Ventas con codigo_unico en Supabase: ${salesByCodigo.size}\n`);

    // 4. Procesar ventas por cobrar
    let updatedCount = 0;
    let createdCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const warnings = [];

    console.log('🔄 Procesando ventas por cobrar...\n');

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const codigoUnico = data.codigoUnico || data.codigo_unico;

        if (!codigoUnico) {
          warnings.push(`Venta ${doc.id}: Sin codigoUnico, se creará nueva fila`);
        }

        // Buscar venta existente por codigo_unico
        const existingSale = codigoUnico ? salesByCodigo.get(codigoUnico) : null;

        if (existingSale) {
          // ACTUALIZAR: Activar en lista por cobrar
          const { error: updateError } = await supabase
            .from('sales')
            .update({ deleted_from_pending_at: null })
            .eq('id', existingSale.id);

          if (updateError) {
            throw updateError;
          }

          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`   ✅ Actualizadas ${updatedCount} ventas...`);
          }
        } else {
          // CREAR: Nueva venta (no estaba en historial)
          const mapped = mapSaleToSupabase(doc);

          // Validaciones básicas
          if (!mapped.fecha || !mapped.ciudad) {
            warnings.push(`Venta ${doc.id}: Sin fecha o ciudad, saltando...`);
            skipCount++;
            continue;
          }

          // Validar SKU
          if (mapped.sku && !validSkus.has(mapped.sku)) {
            warnings.push(`Venta ${doc.id}: SKU ${mapped.sku} no existe, se establecerá a NULL`);
            mapped.sku = null;
          }

          if (mapped.sku_extra && !validSkus.has(mapped.sku_extra)) {
            warnings.push(`Venta ${doc.id}: SKU extra ${mapped.sku_extra} no existe, se establecerá a NULL`);
            mapped.sku_extra = null;
          }

          if (mapped.vendedora_id && !validUserIds.has(mapped.vendedora_id)) {
            warnings.push(`Venta ${doc.id}: vendedora_id ${mapped.vendedora_id} no existe, se establecerá a NULL`);
            mapped.vendedora_id = null;
          }

          // Insertar nueva venta
          const { error: insertError } = await supabase
            .from('sales')
            .insert(mapped)
            .select('id')
            .single();

          if (insertError) {
            // Si es error de codigo_unico duplicado, intentar actualizar
            if (insertError.code === '23505' && insertError.message.includes('codigo_unico')) {
              // Buscar y actualizar
              const { data: foundSale } = await supabase
                .from('sales')
                .select('id')
                .eq('codigo_unico', mapped.codigo_unico)
                .single();

              if (foundSale) {
                await supabase
                  .from('sales')
                  .update({ deleted_from_pending_at: null })
                  .eq('id', foundSale.id);
                updatedCount++;
                continue;
              }
            }
            throw insertError;
          }

          createdCount++;
          if (createdCount % 10 === 0) {
            console.log(`   ✅ Creadas ${createdCount} ventas nuevas...`);
          }
        }

      } catch (err) {
        errorCount++;
        const errorMsg = `Error procesando venta ${doc.id}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ id: doc.id, error: errorMsg });
      }
    }

    // 5. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Actualizadas (ya existían): ${updatedCount}`);
    console.log(`✅ Creadas (nuevas): ${createdCount}`);
    console.log(`⏭️  Saltadas: ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total en Firebase: ${snapshot.size}`);
    console.log('='.repeat(60) + '\n');

    // 6. Validación: Contar ventas por cobrar en Supabase
    console.log('🔍 Validando ventas por cobrar...\n');
    
    const { count: pendingCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .is('deleted_from_pending_at', null)
      .eq('estado_pago', 'pendiente')
      .in('estado_entrega', ['confirmado', 'entregada']);

    console.log(`📊 Ventas por cobrar en Supabase: ${pendingCount}`);
    console.log(`📊 Ventas por cobrar en Firebase: ${snapshot.size}`);
    
    if (pendingCount >= snapshot.size - skipCount) {
      console.log('✅ Conteos válidos\n');
    } else {
      console.warn(`⚠️  Diferencia: ${snapshot.size - skipCount - pendingCount} ventas\n`);
    }

    // 7. Mostrar advertencias y errores
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

    console.log('✅ Migración de ventas por cobrar completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSalesPending()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



