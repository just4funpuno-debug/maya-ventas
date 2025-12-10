/**
 * Script de Migración: cityStock → city_stock
 * Fase 4.2: Migra estructura plana de cityStock a tabla normalizada
 * 
 * Uso: node scripts/migrate-cityStock.js
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
 * Normaliza el nombre de la ciudad (puede venir en diferentes formatos)
 */
function normalizeCityName(ciudad) {
  // Convertir a minúsculas y normalizar espacios
  return ciudad.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Migra cityStock de Firebase a Supabase
 */
async function migrateCityStock() {
  console.log('🚀 Iniciando migración de cityStock...\n');

  try {
    // 1. Obtener todos los productos de Supabase para validar SKUs
    console.log('📥 Obteniendo productos de Supabase...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku');

    if (productsError) {
      console.error('❌ Error obteniendo productos:', productsError);
      throw productsError;
    }

    const validSkus = new Set(products?.map(p => p.sku) || []);
    console.log(`✅ Productos encontrados en Supabase: ${validSkus.size}\n`);

    // 2. Obtener todos los documentos de cityStock
    console.log('📥 Leyendo cityStock de Firebase...');
    const snapshot = await db.collection('cityStock').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron documentos en cityStock');
      return;
    }

    console.log(`✅ Documentos encontrados: ${snapshot.size}\n`);

    // 3. Verificar registros existentes en Supabase
    const { data: existingStock, error: fetchError } = await supabase
      .from('city_stock')
      .select('ciudad, sku');

    if (fetchError) {
      console.error('❌ Error consultando stock existente:', fetchError);
      throw fetchError;
    }

    const existingKeys = new Set(
      existingStock?.map(s => `${s.ciudad}:${s.sku}`) || []
    );
    console.log(`📊 Registros existentes en Supabase: ${existingKeys.size}\n`);

    // 4. Preparar datos para migración
    const rowsToInsert = [];
    const totalesPorCiudad = {};
    let totalRows = 0;
    let skippedRows = 0;
    const warnings = [];

    console.log('🔄 Procesando documentos...\n');

    snapshot.forEach(doc => {
      const ciudadOriginal = doc.id;
      const ciudad = normalizeCityName(ciudadOriginal);
      const data = doc.data();
      
      totalesPorCiudad[ciudad] = 0;

      // Procesar cada SKU en el documento
      Object.keys(data).forEach(sku => {
        const cantidad = data[sku];
        
        // Validar que es un número válido
        if (typeof cantidad !== 'number' || cantidad < 0) {
          return; // Saltar campos que no son cantidades
        }

        // Validar que el SKU existe en products
        if (!validSkus.has(sku)) {
          warnings.push(`⚠️  SKU ${sku} en ${ciudadOriginal} no existe en products, se establecerá a NULL`);
        }

        const key = `${ciudad}:${sku}`;
        
        // Si ya existe, saltar
        if (existingKeys.has(key)) {
          skippedRows++;
          return;
        }

        rowsToInsert.push({
          ciudad,
          sku: validSkus.has(sku) ? sku : null, // NULL si no existe el producto
          cantidad: parseInt(cantidad, 10)
        });

        totalesPorCiudad[ciudad] += cantidad;
        totalRows++;
      });
    });

    console.log(`📊 Filas a insertar: ${rowsToInsert.length}`);
    console.log(`⏭️  Filas saltadas (ya existen): ${skippedRows}\n`);

    // Mostrar advertencias
    if (warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:');
      warnings.forEach(w => console.log(`   ${w}`));
      console.log('');
    }

    // 5. Insertar en lotes (Supabase permite hasta 1000 por batch)
    if (rowsToInsert.length > 0) {
      console.log('💾 Insertando registros en Supabase...\n');
      
      const batchSize = 100;
      let inserted = 0;
      let errors = 0;
      const errorsList = [];

      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('city_stock')
          .insert(batch)
          .select('ciudad, sku');

        if (error) {
          // Si es error de duplicado, continuar
          if (error.code === '23505') {
            console.log(`   ⏭️  Lote ${Math.floor(i / batchSize) + 1}: Duplicados detectados, saltando...`);
            skippedRows += batch.length;
            continue;
          }
          
          console.error(`   ❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error.message);
          errors += batch.length;
          errorsList.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
        } else {
          inserted += batch.length;
          if (inserted % 50 === 0 || inserted === rowsToInsert.length) {
            console.log(`   ✅ Insertados ${inserted} registros...`);
          }
        }
      }

      console.log(`\n✅ Insertados: ${inserted}`);
      console.log(`⏭️  Saltados: ${skippedRows}`);
      console.log(`❌ Errores: ${errors}\n`);

      if (errorsList.length > 0) {
        console.log('❌ ERRORES DETALLADOS:');
        errorsList.forEach(e => {
          console.log(`   - Lote ${e.batch}: ${e.error}`);
        });
        console.log('');
      }
    } else {
      console.log('ℹ️  No hay registros nuevos para insertar\n');
    }

    // 6. Validación de totales por ciudad
    console.log('🔍 Validando totales por ciudad...\n');

    for (const ciudad in totalesPorCiudad) {
      const { data: supabaseStock, error: stockError } = await supabase
        .from('city_stock')
        .select('cantidad')
        .eq('ciudad', ciudad);

      if (stockError) {
        console.warn(`⚠️  Error obteniendo stock de ${ciudad}:`, stockError.message);
        continue;
      }

      const supabaseTotal = supabaseStock?.reduce((sum, s) => sum + (s.cantidad || 0), 0) || 0;
      const firebaseTotal = totalesPorCiudad[ciudad];

      console.log(`   ${ciudad}:`);
      console.log(`      Firebase: ${firebaseTotal}`);
      console.log(`      Supabase: ${supabaseTotal}`);
      
      if (Math.abs(supabaseTotal - firebaseTotal) < 1) {
        console.log(`      ✅ Coinciden\n`);
      } else {
        console.warn(`      ⚠️  Diferencia: ${Math.abs(supabaseTotal - firebaseTotal)}\n`);
      }
    }

    // 7. Validación de stock total global
    console.log('🔍 Validando stock total global...\n');

    const { data: allStock, error: allStockError } = await supabase
      .from('city_stock')
      .select('cantidad');

    if (allStockError) {
      console.error('❌ Error obteniendo stock total:', allStockError);
    } else {
      const supabaseTotal = allStock?.reduce((sum, s) => sum + (s.cantidad || 0), 0) || 0;
      const firebaseTotal = Object.values(totalesPorCiudad).reduce((a, b) => a + b, 0);

      console.log(`   Firebase: ${firebaseTotal}`);
      console.log(`   Supabase: ${supabaseTotal}`);
      
      if (Math.abs(supabaseTotal - firebaseTotal) < 1) {
        console.log(`   ✅ Stock total coincide\n`);
      } else {
        console.warn(`   ⚠️  Diferencia: ${Math.abs(supabaseTotal - firebaseTotal)}\n`);
      }
    }

    // 8. Resumen final
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Filas insertadas: ${rowsToInsert.length - skippedRows}`);
    console.log(`⏭️  Filas saltadas: ${skippedRows}`);
    console.log(`📦 Total ciudades: ${Object.keys(totalesPorCiudad).length}`);
    console.log(`📊 Total filas en Supabase: ${totalRows}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Migración de cityStock completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateCityStock()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



