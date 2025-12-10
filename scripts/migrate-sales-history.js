/**
 * Script de Migración: Historial de Ventas (ventashistorico → sales)
 * Fase 5.1: Migración de Historial (Solo lectura)
 * 
 * Uso: node scripts/migrate-sales-history.js
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
    // Si es formato ISO, extraer solo la fecha
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
 * Mapea un documento de ventashistorico a un registro de sales
 */
function mapSaleToSupabase(doc) {
  const data = doc.data();
  
  // Mapear campos básicos
  const mapped = {
    fecha: convertDate(data.fecha),
    ciudad: normalizeCity(data.ciudad),
    sku: data.sku || null,
    cantidad: parseInt(data.cantidad || 1, 10),
    precio: parseFloat(data.precio || 0),
    sku_extra: data.skuExtra || data.sku_extra || null,
    cantidad_extra: parseInt(data.cantidadExtra || data.cantidad_extra || 0, 10),
    total: data.total !== undefined ? parseFloat(data.total) : null,
    
    // Información de vendedora
    vendedora: data.vendedora || data.vendedor || null,
    vendedora_id: data.vendedoraId || data.vendedora_id || null,
    celular: data.celular || null,
    
    // Método de pago y cliente
    metodo: data.metodo || null,
    cliente: data.cliente || null,
    notas: data.notas || null,
    
    // Estado de la venta
    estado_entrega: data.estadoEntrega || data.estado_entrega || 'confirmado',
    estado_pago: data.estadoPago || data.estado_pago || 'pendiente',
    
    // Gastos
    gasto: parseFloat(data.gasto || 0),
    gasto_cancelacion: parseFloat(data.gastoCancelacion || data.gasto_cancelacion || 0),
    
    // Timestamps
    created_at: convertTimestamp(data.createdAt),
    confirmado_at: convertTimestamp(data.confirmadoAt),
    entregada_at: convertTimestamp(data.entregadaAt),
    cancelado_at: convertTimestamp(data.canceladoAt),
    settled_at: convertTimestamp(data.settledAt),
    fecha_cobro: convertTimestamp(data.fechaCobro || data.fecha_cobro),
    
    // Campos adicionales
    comprobante: data.comprobante || null,
    hora_entrega: data.horaEntrega || data.hora_entrega || data.hora || null,
    destino_encomienda: data.destinoEncomienda || data.destino_encomienda || null,
    motivo: data.motivo || null,
    sintetica_cancelada: Boolean(data.sinteticaCancelada || data.sintetica_cancelada || false),
    
    // Código único (CRÍTICO para relaciones)
    codigo_unico: data.codigoUnico || data.codigo_unico || null
  };

  // SOFT DELETE: Si tiene settledAt, ya no está en lista por cobrar
  if (mapped.settled_at) {
    mapped.deleted_from_pending_at = mapped.settled_at;
  } else {
    // NULL = está en lista por cobrar (se manejará en Subfase 5.2)
    mapped.deleted_from_pending_at = null;
  }

  // Normalizar estado_entrega
  const estadosValidos = ['pendiente', 'confirmado', 'entregada', 'cancelado'];
  if (!estadosValidos.includes(mapped.estado_entrega)) {
    // Mapear estados antiguos
    if (mapped.estado_entrega === 'entregado') mapped.estado_entrega = 'entregada';
    else if (mapped.estado_entrega === 'confirmado' || mapped.estado_entrega === 'confirmada') mapped.estado_entrega = 'confirmado';
    else mapped.estado_entrega = 'confirmado'; // Default
  }

  // Normalizar estado_pago
  const estadosPagoValidos = ['pendiente', 'cobrado', 'cancelado'];
  if (!estadosPagoValidos.includes(mapped.estado_pago)) {
    mapped.estado_pago = 'pendiente'; // Default
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
 * Migra ventashistorico a sales
 */
async function migrateSalesHistory() {
  console.log('🚀 Iniciando migración de historial de ventas...\n');

  try {
    // 1. Obtener todos los productos y usuarios para validar referencias
    console.log('📥 Obteniendo productos y usuarios de Supabase...');
    const { data: products } = await supabase.from('products').select('sku');
    const { data: users } = await supabase.from('users').select('id');
    
    const validSkus = new Set(products?.map(p => p.sku) || []);
    const validUserIds = new Set(users?.map(u => u.id) || []);
    
    console.log(`✅ Productos: ${validSkus.size}, Usuarios: ${validUserIds.size}\n`);

    // 2. Obtener todas las ventas de Firebase
    console.log('📥 Leyendo ventashistorico de Firebase...');
    const snapshot = await db.collection('ventashistorico').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron ventas en ventashistorico');
      return;
    }

    console.log(`✅ Ventas encontradas: ${snapshot.size}\n`);

    // 3. Verificar ventas existentes en Supabase
    const { data: existingSales } = await supabase
      .from('sales')
      .select('codigo_unico');

    const existingCodigos = new Set(
      existingSales?.map(s => s.codigo_unico).filter(c => c) || []
    );
    console.log(`📊 Ventas existentes en Supabase: ${existingCodigos.size}\n`);

    // 4. Migrar ventas
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const warnings = [];
    const totalesPorCiudad = {};

    console.log('🔄 Migrando ventas...\n');

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
        
        // Acumular totales por ciudad
        if (!totalesPorCiudad[mapped.ciudad]) {
          totalesPorCiudad[mapped.ciudad] = { count: 0, total: 0 };
        }
        totalesPorCiudad[mapped.ciudad].count++;
        totalesPorCiudad[mapped.ciudad].total += (mapped.total || 0);

        if (successCount % 50 === 0) {
          console.log(`   ✅ Migradas ${successCount} ventas...`);
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
    
    const { count: supabaseCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Ventas en Supabase después de migración: ${supabaseCount}`);
    console.log(`📊 Ventas en Firebase: ${snapshot.size}`);
    
    if (supabaseCount >= snapshot.size - skipCount) {
      console.log('✅ Conteos válidos\n');
    } else {
      console.warn('⚠️  Los conteos no coinciden completamente\n');
    }

    // 7. Validación de totales por ciudad
    console.log('🔍 Validando totales por ciudad...\n');
    
    for (const ciudad in totalesPorCiudad) {
      const { data: ciudadSales } = await supabase
        .from('sales')
        .select('total')
        .eq('ciudad', ciudad);

      const supabaseTotal = ciudadSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const firebaseTotal = totalesPorCiudad[ciudad].total;

      console.log(`   ${ciudad}:`);
      console.log(`      Firebase: ${firebaseTotal.toFixed(2)} (${totalesPorCiudad[ciudad].count} ventas)`);
      console.log(`      Supabase: ${supabaseTotal.toFixed(2)}`);
      
      if (Math.abs(supabaseTotal - firebaseTotal) < 0.01) {
        console.log(`      ✅ Coinciden\n`);
      } else {
        console.warn(`      ⚠️  Diferencia: ${Math.abs(supabaseTotal - firebaseTotal).toFixed(2)}\n`);
      }
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

    console.log('✅ Migración de historial de ventas completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSalesHistory()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



