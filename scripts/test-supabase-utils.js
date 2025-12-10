/**
 * Script de Prueba: Funciones de Datos Supabase
 * Fase 7.3: Probar funciones de datos críticas
 * 
 * Uso: node scripts/test-supabase-utils.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

// Crear cliente Supabase para Node.js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Importar funciones de utils
const { 
  discountCityStock, 
  restoreCityStock, 
  adjustCityStock, 
  subscribeCityStock,
  registrarVentaPendiente,
  confirmarEntregaVenta,
  editarVentaPendiente,
  eliminarVentaPendiente
} = await import('../src/supabaseUtils.js');

async function testDataFunctions() {
  console.log('🔍 Probando funciones de datos...\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  // Test 1: Verificar que las funciones existen
  console.log('📥 Test 1: Verificar que todas las funciones existen...');
  const functions = {
    discountCityStock: typeof discountCityStock === 'function',
    restoreCityStock: typeof restoreCityStock === 'function',
    adjustCityStock: typeof adjustCityStock === 'function',
    subscribeCityStock: typeof subscribeCityStock === 'function',
    registrarVentaPendiente: typeof registrarVentaPendiente === 'function',
    confirmarEntregaVenta: typeof confirmarEntregaVenta === 'function',
    editarVentaPendiente: typeof editarVentaPendiente === 'function',
    eliminarVentaPendiente: typeof eliminarVentaPendiente === 'function'
  };

  const allExist = Object.values(functions).every(v => v === true);
  if (allExist) {
    console.log('✅ Todas las funciones están definidas\n');
    passed++;
  } else {
    const missing = Object.entries(functions).filter(([_, v]) => !v).map(([k]) => k);
    console.error('❌ Funciones faltantes:', missing);
    errors.push({ test: 'funciones existentes', error: `Funciones faltantes: ${missing.join(', ')}` });
    failed++;
  }

  // Test 2: Probar discountCityStock (con datos de prueba)
  console.log('📥 Test 2: discountCityStock (lectura de datos existentes)...');
  try {
    // Obtener una ciudad y SKU existentes
    const { data: stockData } = await supabase
      .from('city_stock')
      .select('ciudad, sku, cantidad')
      .limit(1)
      .single();

    if (stockData) {
      const ciudadOriginal = stockData.ciudad;
      const skuOriginal = stockData.sku;
      const cantidadOriginal = stockData.cantidad;

      console.log(`   Probando con: ${ciudadOriginal} - ${skuOriginal} (cantidad: ${cantidadOriginal})`);
      
      // Intentar descontar 1 (no persistir, solo verificar que no hay error)
      // Nota: No ejecutamos realmente para no modificar datos reales
      console.log('   ✅ Función disponible (no ejecutada para no modificar datos)\n');
      passed++;
    } else {
      console.log('   ⚠️  No hay datos de stock para probar (normal si la tabla está vacía)\n');
      passed++; // No es error
    }
  } catch (error) {
    console.error('❌ Error en discountCityStock:', error.message);
    errors.push({ test: 'discountCityStock', error: error.message });
    failed++;
  }

  // Test 3: Probar restoreCityStock (solo verificar que existe)
  console.log('📥 Test 3: restoreCityStock...');
  try {
    if (typeof restoreCityStock === 'function') {
      console.log('✅ restoreCityStock está disponible\n');
      passed++;
    } else {
      throw new Error('restoreCityStock no es una función');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    errors.push({ test: 'restoreCityStock', error: error.message });
    failed++;
  }

  // Test 4: Probar adjustCityStock (solo verificar que existe)
  console.log('📥 Test 4: adjustCityStock...');
  try {
    if (typeof adjustCityStock === 'function') {
      console.log('✅ adjustCityStock está disponible\n');
      passed++;
    } else {
      throw new Error('adjustCityStock no es una función');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    errors.push({ test: 'adjustCityStock', error: error.message });
    failed++;
  }

  // Test 5: Probar subscribeCityStock (solo verificar que existe)
  console.log('📥 Test 5: subscribeCityStock...');
  try {
    if (typeof subscribeCityStock === 'function') {
      console.log('✅ subscribeCityStock está disponible\n');
      passed++;
    } else {
      throw new Error('subscribeCityStock no es una función');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    errors.push({ test: 'subscribeCityStock', error: error.message });
    failed++;
  }

  // Test 6: Verificar que se pueden leer productos (prerequisito para ventas)
  console.log('📥 Test 6: Verificar acceso a productos...');
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('sku, nombre')
      .limit(1);

    if (error) throw error;
    
    if (products && products.length > 0) {
      console.log(`✅ Acceso a productos OK (${products.length} producto encontrado)\n`);
      passed++;
    } else {
      console.log('⚠️  No hay productos en la base de datos\n');
      passed++; // No es error crítico
    }
  } catch (error) {
    console.error('❌ Error accediendo a productos:', error.message);
    errors.push({ test: 'acceso productos', error: error.message });
    failed++;
  }

  // Test 7: Verificar que se pueden leer ventas
  console.log('📥 Test 7: Verificar acceso a ventas...');
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, fecha, ciudad')
      .limit(1);

    if (error) throw error;
    
    console.log(`✅ Acceso a ventas OK (${sales?.length || 0} venta encontrada)\n`);
    passed++;
  } catch (error) {
    console.error('❌ Error accediendo a ventas:', error.message);
    errors.push({ test: 'acceso ventas', error: error.message });
    failed++;
  }

  // Resumen
  console.log('='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`✅ Pruebas pasadas: ${passed}`);
  console.log(`❌ Pruebas fallidas: ${failed}`);
  console.log('='.repeat(60) + '\n');

  if (errors.length > 0) {
    console.log('❌ ERRORES DETALLADOS:');
    errors.forEach(err => {
      console.log(`   - ${err.test}: ${err.error}`);
    });
    console.log('');
  }

  return { passed, failed, errors };
}

testDataFunctions()
  .then(({ passed, failed }) => {
    if (failed === 0) {
      console.log('🎉 Todas las pruebas de datos pasaron');
      process.exit(0);
    } else {
      console.error('❌ Algunas pruebas fallaron');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

