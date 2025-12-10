/**
 * Script de Migración: Productos (almacenCentral → products)
 * Fase 3.1: Migración de Productos
 * 
 * Migra la colección 'almacenCentral' de Firestore a la tabla 'products' de Supabase
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
 * Mapea un documento de Firestore a un registro de Supabase
 */
function mapProductToSupabase(firebaseDoc) {
  const data = firebaseDoc.data();
  const id = firebaseDoc.id;

  // Mapear campos
  const mapped = {
    sku: data.sku || id, // Si no hay sku, usar el ID del documento
    nombre: data.nombre || '',
    precio: parseFloat(data.precio || 0),
    delivery: parseFloat(data.delivery || 0),
    costo: parseFloat(data.costo || 0),
    stock: parseInt(data.stock || 0, 10),
    sintetico: Boolean(data.sintetico || false)
  };

  // Mapear imagen (puede ser 'imagen' o 'imagen_url' en Firebase)
  if (data.imagen) {
    mapped.imagen_url = data.imagen;
  } else if (data.imagen_url) {
    mapped.imagen_url = data.imagen_url;
  }

  // Mapear imagen_id si existe
  if (data.imagen_id) {
    mapped.imagen_id = data.imagen_id;
  }

  // Mapear timestamps
  if (data.createdAt) {
    // Firebase puede tener timestamp o número
    if (data.createdAt.toDate) {
      mapped.created_at = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'number') {
      mapped.created_at = new Date(data.createdAt).toISOString();
    }
  }

  if (data.updatedAt) {
    if (data.updatedAt.toDate) {
      mapped.updated_at = data.updatedAt.toDate().toISOString();
    } else if (typeof data.updatedAt === 'number') {
      mapped.updated_at = new Date(data.updatedAt).toISOString();
    }
  }

  return mapped;
}

/**
 * Migra productos de Firebase a Supabase
 */
async function migrateProducts() {
  console.log('🚀 Iniciando migración de productos...\n');

  try {
    // 1. Obtener todos los productos de Firebase
    console.log('📥 Leyendo productos de Firebase (almacenCentral)...');
    const snapshot = await db.collection('almacenCentral').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron productos en almacenCentral');
      return;
    }

    console.log(`✅ Encontrados ${snapshot.size} productos en Firebase\n`);

    // 2. Verificar productos existentes en Supabase
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('sku');

    if (fetchError) {
      console.error('❌ Error consultando productos existentes en Supabase:', fetchError);
      throw fetchError;
    }

    const existingSkus = new Set(existingProducts?.map(p => p.sku) || []);
    console.log(`📊 Productos existentes en Supabase: ${existingSkus.size}\n`);

    // 3. Migrar productos
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log('🔄 Migrando productos...\n');

    for (const doc of snapshot.docs) {
      try {
        const mapped = mapProductToSupabase(doc);

        // Validar SKU
        if (!mapped.sku || mapped.sku.trim() === '') {
          console.warn(`⚠️  Producto sin SKU (ID: ${doc.id}), saltando...`);
          skipCount++;
          continue;
        }

        // Verificar si ya existe
        if (existingSkus.has(mapped.sku)) {
          console.log(`⏭️  SKU ${mapped.sku} ya existe en Supabase, saltando...`);
          skipCount++;
          continue;
        }

        // Insertar en Supabase
        const { data, error } = await supabase
          .from('products')
          .insert(mapped)
          .select('sku')
          .single();

        if (error) {
          // Si es error de SKU duplicado, saltar
          if (error.code === '23505') {
            console.log(`⏭️  SKU ${mapped.sku} duplicado, saltando...`);
            skipCount++;
            continue;
          }
          throw error;
        }

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`   ✅ Migrados ${successCount} productos...`);
        }

      } catch (err) {
        errorCount++;
        const errorMsg = `Error migrando producto ${doc.id}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push({ id: doc.id, error: errorMsg });
      }
    }

    // 4. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Migrados exitosamente: ${successCount}`);
    console.log(`⏭️  Saltados (ya existían): ${skipCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total en Firebase: ${snapshot.size}`);
    console.log('='.repeat(60) + '\n');

    // 5. Validación de conteos
    console.log('🔍 Validando conteos...\n');
    
    const { count: supabaseCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error contando productos en Supabase:', countError);
    } else {
      console.log(`📊 Productos en Supabase después de migración: ${supabaseCount}`);
      console.log(`📊 Productos en Firebase: ${snapshot.size}`);
      
      if (supabaseCount >= snapshot.size - skipCount) {
        console.log('✅ Conteos válidos\n');
      } else {
        console.warn('⚠️  Los conteos no coinciden completamente\n');
      }
    }

    // 6. Validación de stock total
    console.log('🔍 Validando stock total...\n');
    
    const { data: supabaseProducts, error: stockError } = await supabase
      .from('products')
      .select('stock');

    if (stockError) {
      console.error('❌ Error obteniendo stock de Supabase:', stockError);
    } else {
      const supabaseStockTotal = supabaseProducts?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;
      
      let firebaseStockTotal = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        firebaseStockTotal += parseInt(data.stock || 0, 10);
      });

      console.log(`📊 Stock total en Supabase: ${supabaseStockTotal}`);
      console.log(`📊 Stock total en Firebase: ${firebaseStockTotal}`);
      
      if (Math.abs(supabaseStockTotal - firebaseStockTotal) < 1) {
        console.log('✅ Stock total coincide\n');
      } else {
        console.warn(`⚠️  Diferencia en stock total: ${Math.abs(supabaseStockTotal - firebaseStockTotal)}\n`);
      }
    }

    // 7. Mostrar errores si los hay
    if (errors.length > 0) {
      console.log('❌ ERRORES DETALLADOS:');
      errors.forEach(err => {
        console.log(`   - ${err.id}: ${err.error}`);
      });
      console.log('');
    }

    console.log('✅ Migración de productos completada\n');

  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateProducts()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

