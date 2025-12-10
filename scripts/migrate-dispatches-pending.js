/**
 * Script de Migración: Despachos Pendientes (despachos → dispatches)
 * Fase 6.1: Migración de Despachos Pendientes
 * 
 * Migra despachos con status='pendiente'
 * 
 * Uso: node scripts/migrate-dispatches-pending.js
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
 * Normaliza items (puede ser array o objeto)
 */
function normalizeItems(items) {
  if (!items) return [];
  
  if (Array.isArray(items)) {
    return items.map(item => ({
      sku: item.sku || null,
      cantidad: parseInt(item.cantidad || 0, 10)
    })).filter(item => item.sku && item.cantidad > 0);
  }
  
  if (typeof items === 'object') {
    // Si es objeto, convertirlo a array
    return Object.entries(items).map(([sku, cantidad]) => ({
      sku,
      cantidad: parseInt(cantidad || 0, 10)
    })).filter(item => item.sku && item.cantidad > 0);
  }
  
  return [];
}

/**
 * Migra despachos pendientes
 */
async function migrateDispatchesPending() {
  console.log('🚀 Iniciando migración de despachos pendientes...\n');

  try {
    // 1. Obtener todos los despachos de Firebase
    console.log('📥 Leyendo despachos de Firebase...');
    const snapshot = await db.collection('despachos').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron despachos en Firebase');
      return;
    }

    console.log(`✅ Despachos encontrados: ${snapshot.size}\n`);

    // 2. Filtrar solo pendientes (no confirmados, no recibidos)
    const pendientes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Considerar pendiente si NO tiene status='confirmado' y NO tiene flags de recibido
      if (data.status === 'confirmado' || data.recibido || data.completed || data.settledAt) {
        return; // Saltar confirmados
      }
      pendientes.push({ id: doc.id, ...data });
    });

    console.log(`📊 Despachos pendientes identificados: ${pendientes.length}\n`);

    if (pendientes.length === 0) {
      console.log('ℹ️  No hay despachos pendientes para migrar\n');
      return;
    }

    // 3. Verificar despachos existentes en Supabase
    const { data: existingDispatches } = await supabase
      .from('dispatches')
      .select('id, fecha, ciudad, status')
      .eq('status', 'pendiente');

    const existingKeys = new Set();
    existingDispatches?.forEach(d => {
      const key = `${d.ciudad}_${d.fecha}_${JSON.stringify(d.items || [])}`;
      existingKeys.add(key);
    });

    console.log(`📊 Despachos pendientes existentes en Supabase: ${existingDispatches?.length || 0}\n`);

    // 4. Migrar despachos pendientes
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const warnings = [];

    console.log('🔄 Migrando despachos pendientes...\n');

    for (const doc of pendientes) {
      try {
        const fecha = convertDate(doc.fecha);
        const ciudad = normalizeCity(doc.ciudad);
        const items = normalizeItems(doc.items);

        // Validaciones básicas
        if (!fecha || !ciudad) {
          warnings.push(`Despacho ${doc.id}: Sin fecha o ciudad, saltando...`);
          skipCount++;
          continue;
        }

        if (items.length === 0) {
          warnings.push(`Despacho ${doc.id}: Sin items, saltando...`);
          skipCount++;
          continue;
        }

        // Verificar si ya existe
        const key = `${ciudad}_${fecha}_${JSON.stringify(items)}`;
        if (existingKeys.has(key)) {
          skipCount++;
          continue;
        }

        // Crear despacho en Supabase
        const dispatchData = {
          fecha,
          ciudad,
          status: 'pendiente',
          items: items, // JSONB en Supabase
          created_at: convertTimestamp(doc.createdAt || doc.creadoAt)
        };

        const { data, error } = await supabase
          .from('dispatches')
          .insert(dispatchData)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        successCount++;

        if (successCount % 5 === 0 || successCount === pendientes.length) {
          console.log(`   ✅ Migrados ${successCount} despachos pendientes...`);
        }

      } catch (err) {
        errorCount++;
        const errorMsg = `Error migrando despacho ${doc.id}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ id: doc.id, error: errorMsg });
      }
    }

    // 5. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Migrados exitosamente: ${successCount}`);
    console.log(`⏭️  Saltados (ya existían o inválidos): ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total pendientes en Firebase: ${pendientes.length}`);
    console.log('='.repeat(60) + '\n');

    // 6. Validación de conteos
    console.log('🔍 Validando conteos...\n');
    
    const { count: supabasePendientes } = await supabase
      .from('dispatches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendiente');

    console.log(`📊 Despachos pendientes en Supabase: ${supabasePendientes}`);
    console.log(`📊 Despachos pendientes en Firebase: ${pendientes.length}`);
    
    if (supabasePendientes >= pendientes.length - skipCount) {
      console.log('✅ Conteos válidos\n');
    } else {
      console.warn(`⚠️  Diferencia: ${pendientes.length - skipCount - supabasePendientes} despachos\n`);
    }

    // 7. Validar estructura de items
    console.log('🔍 Validando estructura de items...\n');
    
    const { data: dispatchesWithItems } = await supabase
      .from('dispatches')
      .select('id, items')
      .eq('status', 'pendiente')
      .limit(10);

    let itemsValidos = 0;
    dispatchesWithItems?.forEach(d => {
      if (Array.isArray(d.items) && d.items.length > 0) {
        const todosValidos = d.items.every(item => 
          item.sku && typeof item.cantidad === 'number' && item.cantidad > 0
        );
        if (todosValidos) itemsValidos++;
      }
    });

    console.log(`📊 Despachos con items válidos: ${itemsValidos}/${dispatchesWithItems?.length || 0}`);
    
    if (itemsValidos === dispatchesWithItems?.length) {
      console.log('✅ Estructura de items válida\n');
    } else {
      console.warn('⚠️  Algunos despachos tienen items inválidos\n');
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

    console.log('✅ Migración de despachos pendientes completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateDispatchesPending()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



