/**
 * Script de Migración: Depósitos (GenerarDeposito → deposits)
 * Fase 5.4: Migración de Depósitos
 * 
 * Estrategia:
 * - Agrupar documentos de GenerarDeposito por ciudad y fecha
 * - Crear depósitos en tabla deposits
 * - Actualizar sales.deposit_id y sales.settled_at por codigo_unico
 * 
 * Uso: node scripts/migrate-deposits.js
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
 * Migra depósitos de GenerarDeposito a deposits
 */
async function migrateDeposits() {
  console.log('🚀 Iniciando migración de depósitos...\n');

  try {
    // 1. Obtener todos los documentos de GenerarDeposito
    console.log('📥 Leyendo GenerarDeposito de Firebase...');
    const snapshot = await db.collection('GenerarDeposito').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron depósitos en GenerarDeposito');
      return;
    }

    console.log(`✅ Documentos encontrados: ${snapshot.size}\n`);

    // 2. Analizar estructura: Agrupar por ciudad y fecha
    console.log('🔍 Analizando estructura de depósitos...\n');
    
    const depositsByKey = new Map(); // key: "ciudad_fecha"
    const ventasByCodigo = new Map(); // codigoUnico -> { depositKey, ventaData }

    snapshot.forEach(doc => {
      const data = doc.data();
      const ciudad = normalizeCity(data.ciudad || data.city);
      const fecha = convertDate(data.fecha || data.createdAt);
      
      if (!ciudad || !fecha) {
        console.warn(`⚠️  Documento ${doc.id}: Sin ciudad o fecha, saltando...`);
        return;
      }

      const key = `${ciudad}_${fecha}`;
      
      // Inicializar depósito si no existe
      if (!depositsByKey.has(key)) {
        depositsByKey.set(key, {
          ciudad,
          fecha,
          ventas: [],
          monto_total: 0,
          estado: data.estado || 'pendiente',
          createdAt: convertTimestamp(data.createdAt),
          confirmedAt: convertTimestamp(data.confirmadoAt || data.confirmedAt || data.savedAt)
        });
      }

      const deposit = depositsByKey.get(key);
      
      // Obtener codigoUnico de la venta
      const codigoUnico = data.codigoUnico || data.codigo_unico;
      const total = parseFloat(data.total || 0);
      
      if (codigoUnico) {
        // Guardar referencia para actualizar ventas después
        ventasByCodigo.set(codigoUnico, {
          depositKey: key,
          total,
          createdAt: convertTimestamp(data.createdAt)
        });
      }

      // Acumular monto total
      deposit.monto_total += total;
      
      // Agregar nota si existe
      if (data.nota || data.deposit_note) {
        deposit.nota = data.nota || data.deposit_note;
      }
    });

    console.log(`📊 Depósitos únicos identificados: ${depositsByKey.size}`);
    console.log(`📊 Ventas a vincular: ${ventasByCodigo.size}\n`);

    // 3. Verificar depósitos existentes en Supabase
    const { data: existingDeposits } = await supabase
      .from('deposits')
      .select('id, ciudad, fecha');

    const existingKeys = new Set();
    existingDeposits?.forEach(d => {
      const key = `${d.ciudad}_${d.fecha}`;
      existingKeys.add(key);
    });

    console.log(`📊 Depósitos existentes en Supabase: ${existingKeys.size}\n`);

    // 4. Crear depósitos en Supabase
    let createdCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const depositIdMap = new Map(); // key -> deposit_id

    console.log('🔄 Creando depósitos en Supabase...\n');

    for (const [key, deposit] of depositsByKey.entries()) {
      try {
        // Si ya existe, obtener su ID
        if (existingKeys.has(key)) {
          const existing = existingDeposits.find(d => 
            `${d.ciudad}_${d.fecha}` === key
          );
          if (existing) {
            depositIdMap.set(key, existing.id);
            skipCount++;
            continue;
          }
        }

        // Crear nuevo depósito
        const depositData = {
          ciudad: deposit.ciudad,
          fecha: deposit.fecha,
          monto_total: deposit.monto_total,
          nota: deposit.nota || null,
          estado: deposit.estado,
          created_at: deposit.createdAt,
          confirmed_at: deposit.confirmedAt
        };

        const { data: newDeposit, error: insertError } = await supabase
          .from('deposits')
          .insert(depositData)
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        depositIdMap.set(key, newDeposit.id);
        createdCount++;

        if (createdCount % 5 === 0) {
          console.log(`   ✅ Creados ${createdCount} depósitos...`);
        }

      } catch (err) {
        errorCount++;
        const errorMsg = `Error creando depósito ${key}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ key, error: errorMsg });
      }
    }

    console.log(`\n✅ Depósitos creados: ${createdCount}`);
    console.log(`⏭️  Depósitos saltados: ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}\n`);

    // 5. Actualizar ventas con deposit_id y settled_at
    console.log('🔄 Actualizando ventas con deposit_id y settled_at...\n');

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateErrors = [];

    for (const [codigoUnico, ventaInfo] of ventasByCodigo.entries()) {
      try {
        const depositId = depositIdMap.get(ventaInfo.depositKey);
        
        if (!depositId) {
          notFoundCount++;
          continue;
        }

        // Buscar venta por codigo_unico
        const { data: sales, error: findError } = await supabase
          .from('sales')
          .select('id')
          .eq('codigo_unico', codigoUnico)
          .limit(1);

        if (findError) {
          throw findError;
        }

        if (!sales || sales.length === 0) {
          notFoundCount++;
          continue;
        }

        const saleId = sales[0].id;

        // Actualizar venta con deposit_id y settled_at
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            deposit_id: depositId,
            settled_at: ventaInfo.createdAt || new Date().toISOString(),
            deleted_from_pending_at: ventaInfo.createdAt || new Date().toISOString() // Ya no está en lista por cobrar
          })
          .eq('id', saleId);

        if (updateError) {
          throw updateError;
        }

        updatedCount++;

        if (updatedCount % 10 === 0) {
          console.log(`   ✅ Actualizadas ${updatedCount} ventas...`);
        }

      } catch (err) {
        const errorMsg = `Error actualizando venta ${codigoUnico}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        updateErrors.push({ codigoUnico, error: errorMsg });
      }
    }

    console.log(`\n✅ Ventas actualizadas: ${updatedCount}`);
    console.log(`⚠️  Ventas no encontradas: ${notFoundCount}\n`);

    // 6. Resumen final
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Depósitos creados: ${createdCount}`);
    console.log(`⏭️  Depósitos saltados: ${skipCount}`);
    console.log(`✅ Ventas actualizadas: ${updatedCount}`);
    console.log(`⚠️  Ventas no encontradas: ${notFoundCount}`);
    console.log(`❌ Errores: ${errorCount + updateErrors.length}`);
    console.log(`📦 Total documentos en Firebase: ${snapshot.size}`);
    console.log(`📊 Depósitos únicos: ${depositsByKey.size}`);
    console.log('='.repeat(60) + '\n');

    // 7. Validación: Contar depósitos y ventas vinculadas
    console.log('🔍 Validando migración...\n');
    
    const { count: supabaseDepositsCount } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true });

    const { count: salesWithDeposit } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .not('deposit_id', 'is', null);

    console.log(`📊 Depósitos en Supabase: ${supabaseDepositsCount}`);
    console.log(`📊 Ventas con deposit_id: ${salesWithDeposit}`);
    console.log(`📊 Depósitos esperados: ${depositsByKey.size}`);
    console.log(`📊 Ventas esperadas: ${ventasByCodigo.size}\n`);

    if (supabaseDepositsCount >= depositsByKey.size - skipCount) {
      console.log('✅ Conteos de depósitos válidos\n');
    } else {
      console.warn('⚠️  Diferencia en conteos de depósitos\n');
    }

    // 8. Mostrar errores
    if (errors.length > 0) {
      console.log('❌ ERRORES EN DEPÓSITOS:');
      errors.forEach(err => {
        console.log(`   - ${err.key}: ${err.error}`);
      });
      console.log('');
    }

    if (updateErrors.length > 0) {
      console.log('❌ ERRORES EN ACTUALIZACIÓN DE VENTAS:');
      updateErrors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.codigoUnico}: ${err.error}`);
      });
      if (updateErrors.length > 10) {
        console.log(`   ... y ${updateErrors.length - 10} más`);
      }
      console.log('');
    }

    console.log('✅ Migración de depósitos completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateDeposits()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



