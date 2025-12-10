/**
 * Script de Migración: Depósitos COMPLETOS (GenerarDeposito → deposits)
 * 
 * ⚠️ IMPORTANTE: Este script NO elimina datos existentes.
 * Solo inserta depósitos que no existen en Supabase.
 * 
 * Estrategia:
 * - Cada documento de Firebase GenerarDeposito es un depósito completo
 * - Preservar estructura completa: resumen + ventas en campo nota (JSON)
 * - Verificar duplicados antes de insertar
 * - No modificar depósitos existentes
 * 
 * Uso: node scripts/migrate-deposits-complete.js
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
 * Convierte ventas de Firebase a formato Supabase
 */
function convertVentasToSupabase(ventas) {
  if (!Array.isArray(ventas)) return [];
  
  return ventas.map(v => ({
    id: v.idPorCobrar || v.idHistorico || v.id || null,
    codigo_unico: v.codigoUnico || null,
    total: v.total ?? ((Number(v.precio) || 0) - (Number(v.gasto) || 0)),
    gasto: Number(v.gasto || 0),
    precio: Number(v.precio || 0),
    fecha: v.fecha || null,
    sku: v.sku || null,
    cantidad: v.cantidad ?? null,
    sku_extra: v.skuExtra || null,
    cantidad_extra: v.cantidadExtra ?? null,
    estado_entrega: v.estadoEntrega || null,
    sintetica_cancelada: Boolean(v.sinteticaCancelada)
  }));
}

/**
 * Genera un hash simple del contenido de nota para detectar duplicados
 */
function generateNotaHash(nota) {
  if (!nota) return null;
  const str = typeof nota === 'string' ? nota : JSON.stringify(nota);
  // Hash simple: suma de códigos de caracteres (suficiente para detectar duplicados)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Verifica si un depósito ya existe en Supabase
 */
async function depositExists(supabase, ciudad, fecha, notaHash) {
  const { data, error } = await supabase
    .from('deposits')
    .select('id, nota')
    .eq('ciudad', normalizeCity(ciudad))
    .eq('fecha', fecha)
    .limit(10); // Obtener varios para comparar
  
  if (error) {
    console.warn('⚠️ Error verificando depósito existente:', error);
    return false;
  }
  
  if (!data || data.length === 0) {
    return false;
  }
  
  // Si hay depósitos con misma ciudad y fecha, verificar si el contenido es similar
  // Por ahora, si hay alguno con misma ciudad y fecha, consideramos que puede ser duplicado
  // El usuario puede revisar manualmente si hay diferencias
  return true;
}

/**
 * Migra depósitos completos de GenerarDeposito a deposits
 */
async function migrateDepositsComplete() {
  console.log('🚀 Iniciando migración COMPLETA de depósitos...\n');
  console.log('⚠️  Este script NO elimina datos existentes\n');

  try {
    // 1. Obtener todos los documentos de GenerarDeposito
    console.log('📥 Leyendo GenerarDeposito de Firebase...');
    const snapshot = await db.collection('GenerarDeposito').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron depósitos en GenerarDeposito');
      return;
    }

    console.log(`✅ Documentos encontrados: ${snapshot.size}\n`);

    // 2. Obtener depósitos existentes en Supabase para evitar duplicados
    console.log('📥 Verificando depósitos existentes en Supabase...');
    const { data: existingDeposits, error: fetchError } = await supabase
      .from('deposits')
      .select('id, ciudad, fecha, nota');

    if (fetchError) {
      console.error('❌ Error obteniendo depósitos existentes:', fetchError);
      process.exit(1);
    }

    console.log(`✅ Depósitos existentes en Supabase: ${existingDeposits?.length || 0}\n`);

    // 3. Procesar cada documento de Firebase
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log('🔄 Procesando depósitos...\n');

    for (const doc of snapshot.docs) {
      const firebaseId = doc.id;
      const data = doc.data();
      
      try {
        console.log(`📦 Procesando depósito Firebase ID: ${firebaseId}`);
        console.log(`   Ciudad: ${data.ciudad || data.city || 'N/A'}`);
        console.log(`   Tiene resumen: ${!!data.resumen}`);
        console.log(`   Tiene ventas: ${Array.isArray(data.ventas) ? data.ventas.length : 0} ventas`);
        
        // Validar datos mínimos
        const ciudad = data.ciudad || data.city;
        if (!ciudad) {
          console.warn(`   ⚠️  Sin ciudad, omitiendo...`);
          skippedCount++;
          continue;
        }

        // Convertir fecha
        const fecha = convertDate(data.fecha || data.createdAt);
        if (!fecha) {
          console.warn(`   ⚠️  Sin fecha, omitiendo...`);
          skippedCount++;
          continue;
        }

        // Verificar si ya existe
        const ciudadNormalizada = normalizeCity(ciudad);
        const exists = await depositExists(supabase, ciudad, fecha, null);
        
        if (exists) {
          console.log(`   ⏭️  Ya existe depósito con misma ciudad y fecha, omitiendo...`);
          skippedCount++;
          continue;
        }

        // Convertir ventas
        const ventasPayload = convertVentasToSupabase(data.ventas || []);
        
        // Preparar resumen (limpiar undefined)
        const resumenLimpio = data.resumen ? JSON.parse(JSON.stringify(data.resumen, (key, value) => {
          return value === undefined ? null : value;
        })) : {};
        
        // Crear objeto nota (JSON stringificado)
        const nota = JSON.stringify({
          resumen: resumenLimpio,
          ventas: ventasPayload
        });
        
        // Calcular monto_total
        const montoTotal = resumenLimpio.totalNeto || resumenLimpio.totalMonto || 0;
        
        // Insertar en Supabase
        const { data: depositData, error: insertError } = await supabase
          .from('deposits')
          .insert({
            ciudad: ciudadNormalizada,
            fecha: fecha,
            monto_total: Number(montoTotal),
            nota: nota,
            estado: data.estado || 'pendiente',
            created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
            confirmed_at: convertTimestamp(data.confirmadoAt || data.confirmedAt || data.savedAt)
          })
          .select('id')
          .single();
        
        if (insertError) {
          throw insertError;
        }
        
        console.log(`   ✅ Migrado exitosamente. Supabase ID: ${depositData.id}\n`);
        createdCount++;

      } catch (err) {
        errorCount++;
        const errorMsg = err.message || String(err);
        console.error(`   ❌ Error: ${errorMsg}\n`);
        errors.push({ firebaseId, error: errorMsg });
      }
    }

    // 4. Resumen final
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Migrados exitosamente: ${createdCount}`);
    console.log(`⏭️  Omitidos (ya existían o sin datos): ${skippedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total procesados: ${snapshot.size}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️  Errores detallados:');
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. Firebase ID: ${err.firebaseId} - ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... y ${errors.length - 10} más`);
      }
    }

    // 5. Validación final
    console.log('\n🔍 Validando migración...\n');
    
    const { count: supabaseDepositsCount } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Depósitos totales en Supabase: ${supabaseDepositsCount}`);
    console.log(`📊 Depósitos esperados (migrados): ${createdCount}`);
    console.log(`📊 Depósitos existentes antes: ${existingDeposits?.length || 0}`);
    console.log(`📊 Depósitos esperados totales: ${(existingDeposits?.length || 0) + createdCount}\n`);

    if (supabaseDepositsCount >= (existingDeposits?.length || 0) + createdCount - 5) {
      console.log('✅ Conteos de depósitos válidos\n');
    } else {
      console.warn('⚠️  Diferencia en conteos de depósitos (puede ser normal si hay duplicados)\n');
    }

    console.log('✅ Migración completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateDepositsComplete()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });


