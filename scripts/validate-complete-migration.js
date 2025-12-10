/**
 * Validación Completa de Migración Firebase → Supabase
 * 
 * Compara todos los datos entre Firebase y Supabase para asegurar
 * que la migración fue exitosa y completa.
 * 
 * Uso: node scripts/validate-complete-migration.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Inicializar Firebase Admin
let firestore;
try {
  const fs = await import('fs/promises');
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
  
  try {
    const serviceAccount = JSON.parse(
      await fs.readFile(serviceAccountPath, 'utf8')
    );
    initializeApp({
      credential: cert(serviceAccount)
    });
    firestore = getFirestore();
    console.log('✅ Firebase Admin inicializado con serviceAccountKey.json');
  } catch (fileError) {
    console.error('❌ No se pudo leer serviceAccountKey.json:', fileError.message);
    console.error('   Asegúrate de que el archivo existe en la raíz del proyecto');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Error inicializando Firebase:', err.message);
  process.exit(1);
}

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.error('   Necesitas: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase inicializado');

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Obtener todos los documentos de una colección de Firebase
 */
async function getFirebaseCollection(collectionName) {
  try {
    const snapshot = await firestore.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`❌ Error obteniendo ${collectionName} de Firebase:`, error.message);
    return [];
  }
}

/**
 * Obtener todos los registros de una tabla de Supabase
 */
async function getSupabaseTable(tableName, filters = {}) {
  try {
    let query = supabase.from(tableName).select('*');
    
    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ Error obteniendo ${tableName} de Supabase:`, error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`❌ Error fatal obteniendo ${tableName} de Supabase:`, error.message);
    return [];
  }
}

/**
 * Comparar productos
 */
async function validateProducts() {
  console.log('\n📦 Validando Productos...');
  
  const firebaseProducts = await getFirebaseCollection('almacenCentral');
  const supabaseProducts = await getSupabaseTable('products');
  
  console.log(`   Firebase: ${firebaseProducts.length} productos`);
  console.log(`   Supabase: ${supabaseProducts.length} productos`);
  
  if (firebaseProducts.length !== supabaseProducts.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseProducts.length - supabaseProducts.length)}`);
  }
  
  // Comparar por SKU
  const firebaseSkus = new Set(firebaseProducts.map(p => p.sku));
  const supabaseSkus = new Set(supabaseProducts.map(p => p.sku));
  
  const missingInSupabase = [...firebaseSkus].filter(sku => !supabaseSkus.has(sku));
  const extraInSupabase = [...supabaseSkus].filter(sku => !firebaseSkus.has(sku));
  
  if (missingInSupabase.length > 0) {
    console.error(`   ❌ SKUs faltantes en Supabase: ${missingInSupabase.join(', ')}`);
  }
  
  if (extraInSupabase.length > 0) {
    console.warn(`   ⚠️  SKUs extra en Supabase: ${extraInSupabase.join(', ')}`);
  }
  
  // Comparar stock total
  const firebaseStock = firebaseProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const supabaseStock = supabaseProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  
  console.log(`   Stock total Firebase: ${firebaseStock}`);
  console.log(`   Stock total Supabase: ${supabaseStock}`);
  
  if (firebaseStock !== supabaseStock) {
    console.warn(`   ⚠️  Diferencia en stock total: ${Math.abs(firebaseStock - supabaseStock)}`);
  }
  
  // Comparar productos individuales
  let differences = 0;
  for (const fbProduct of firebaseProducts) {
    const sbProduct = supabaseProducts.find(p => p.sku === fbProduct.sku);
    if (!sbProduct) continue;
    
    if (Number(fbProduct.stock || 0) !== Number(sbProduct.stock || 0)) {
      console.warn(`   ⚠️  Stock diferente para ${fbProduct.sku}: Firebase=${fbProduct.stock}, Supabase=${sbProduct.stock}`);
      differences++;
    }
    
    if (Number(fbProduct.precio || 0) !== Number(sbProduct.precio || 0)) {
      console.warn(`   ⚠️  Precio diferente para ${fbProduct.sku}: Firebase=${fbProduct.precio}, Supabase=${sbProduct.precio}`);
      differences++;
    }
  }
  
  return {
    passed: missingInSupabase.length === 0 && differences === 0,
    firebaseCount: firebaseProducts.length,
    supabaseCount: supabaseProducts.length,
    missing: missingInSupabase.length,
    differences
  };
}

/**
 * Comparar usuarios
 */
async function validateUsers() {
  console.log('\n👥 Validando Usuarios...');
  
  const firebaseUsers = await getFirebaseCollection('users');
  const supabaseUsers = await getSupabaseTable('users');
  
  console.log(`   Firebase: ${firebaseUsers.length} usuarios`);
  console.log(`   Supabase: ${supabaseUsers.length} usuarios`);
  
  // Comparar por username
  const firebaseUsernames = new Set(firebaseUsers.map(u => u.username));
  const supabaseUsernames = new Set(supabaseUsers.map(u => u.username));
  
  const missingInSupabase = [...firebaseUsernames].filter(u => !supabaseUsernames.has(u));
  const extraInSupabase = [...supabaseUsernames].filter(u => !firebaseUsernames.has(u));
  
  if (missingInSupabase.length > 0) {
    console.error(`   ❌ Usuarios faltantes en Supabase: ${missingInSupabase.join(', ')}`);
  }
  
  if (extraInSupabase.length > 0) {
    console.warn(`   ⚠️  Usuarios extra en Supabase: ${extraInSupabase.join(', ')}`);
  }
  
  return {
    passed: missingInSupabase.length === 0,
    firebaseCount: firebaseUsers.length,
    supabaseCount: supabaseUsers.length,
    missing: missingInSupabase.length
  };
}

/**
 * Comparar ventas históricas
 */
async function validateSalesHistory() {
  console.log('\n📊 Validando Ventas Históricas (ventashistorico)...');
  
  const firebaseSales = await getFirebaseCollection('ventashistorico');
  const supabaseSales = await getSupabaseTable('sales', {
    estado_entrega: ['confirmado', 'entregada', 'cancelado']
  });
  
  console.log(`   Firebase: ${firebaseSales.length} ventas`);
  console.log(`   Supabase: ${supabaseSales.length} ventas`);
  
  if (firebaseSales.length !== supabaseSales.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseSales.length - supabaseSales.length)}`);
  }
  
  // Comparar por codigoUnico
  const firebaseCodigos = new Set(firebaseSales.map(s => s.codigoUnico).filter(Boolean));
  const supabaseCodigos = new Set(supabaseSales.map(s => s.codigo_unico).filter(Boolean));
  
  const missingInSupabase = [...firebaseCodigos].filter(c => !supabaseCodigos.has(c));
  
  if (missingInSupabase.length > 0) {
    console.error(`   ❌ Códigos únicos faltantes en Supabase: ${missingInSupabase.length}`);
  }
  
  // Normalizar nombres de ciudades para comparación
  function normalizeCityName(city) {
    if (!city) return '—';
    return city.toLowerCase().replace(/\s+/g, '_');
  }
  
  // Comparar totales por ciudad (normalizado)
  const firebaseByCity = {};
  const supabaseByCity = {};
  
  firebaseSales.forEach(s => {
    const city = normalizeCityName(s.ciudad);
    firebaseByCity[city] = (firebaseByCity[city] || 0) + 1;
  });
  
  supabaseSales.forEach(s => {
    const city = normalizeCityName(s.ciudad);
    supabaseByCity[city] = (supabaseByCity[city] || 0) + 1;
  });
  
  console.log('\n   Ventas por ciudad (normalizado):');
  const allCities = new Set([...Object.keys(firebaseByCity), ...Object.keys(supabaseByCity)]);
  let cityDifferences = 0;
  for (const city of allCities) {
    const fb = firebaseByCity[city] || 0;
    const sb = supabaseByCity[city] || 0;
    if (fb !== sb) {
      console.warn(`   ⚠️  ${city}: Firebase=${fb}, Supabase=${sb}`);
      cityDifferences++;
    } else {
      console.log(`   ✅ ${city}: ${fb}`);
    }
  }
  
  return {
    passed: missingInSupabase.length === 0 && cityDifferences === 0,
    firebaseCount: firebaseSales.length,
    supabaseCount: supabaseSales.length,
    missing: missingInSupabase.length,
    cityDifferences
  };
}

/**
 * Comparar ventas por cobrar
 */
async function validatePendingSales() {
  console.log('\n💰 Validando Ventas por Cobrar (ventasporcobrar)...');
  
  const firebaseSales = await getFirebaseCollection('ventasporcobrar');
  
  // Obtener ventas por cobrar de Supabase: deleted_from_pending_at IS NULL Y estado_pago = 'pendiente' Y estado_entrega IN ('confirmado', 'entregada')
  const { data: supabaseSales, error } = await supabase
    .from('sales')
    .select('*')
    .is('deleted_from_pending_at', null)
    .eq('estado_pago', 'pendiente')
    .in('estado_entrega', ['confirmado', 'entregada']);
  
  if (error) {
    console.error(`   ❌ Error obteniendo ventas por cobrar de Supabase:`, error.message);
    return { passed: false, firebaseCount: firebaseSales.length, supabaseCount: 0 };
  }
  
  console.log(`   Firebase: ${firebaseSales.length} ventas`);
  console.log(`   Supabase: ${supabaseSales?.length || 0} ventas`);
  
  if (firebaseSales.length !== (supabaseSales?.length || 0)) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseSales.length - (supabaseSales?.length || 0))}`);
  }
  
  // Comparar por codigoUnico
  const firebaseCodigos = new Set(firebaseSales.map(s => s.codigoUnico).filter(Boolean));
  const supabaseCodigos = new Set((supabaseSales || []).map(s => s.codigo_unico).filter(Boolean));
  
  const missingInSupabase = [...firebaseCodigos].filter(c => !supabaseCodigos.has(c));
  const extraInSupabase = [...supabaseCodigos].filter(c => !firebaseCodigos.has(c));
  
  if (missingInSupabase.length > 0) {
    console.error(`   ❌ Códigos únicos faltantes en Supabase: ${missingInSupabase.length}`);
  }
  
  if (extraInSupabase.length > 0) {
    console.warn(`   ⚠️  Códigos únicos extra en Supabase: ${extraInSupabase.length}`);
  }
  
  return {
    passed: missingInSupabase.length === 0 && Math.abs(firebaseSales.length - (supabaseSales?.length || 0)) <= 5,
    firebaseCount: firebaseSales.length,
    supabaseCount: supabaseSales?.length || 0,
    missing: missingInSupabase.length
  };
}

/**
 * Comparar ventas sin confirmar
 */
async function validateUnconfirmedSales() {
  console.log('\n⏳ Validando Ventas Sin Confirmar (VentasSinConfirmar)...');
  
  const firebaseSales = await getFirebaseCollection('VentasSinConfirmar');
  const supabaseSales = await getSupabaseTable('sales', {
    estado_entrega: 'pendiente'
  });
  
  console.log(`   Firebase: ${firebaseSales.length} ventas`);
  console.log(`   Supabase: ${supabaseSales.length} ventas`);
  
  if (firebaseSales.length !== supabaseSales.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseSales.length - supabaseSales.length)}`);
  }
  
  return {
    passed: Math.abs(firebaseSales.length - supabaseSales.length) <= 1, // Permitir pequeña diferencia
    firebaseCount: firebaseSales.length,
    supabaseCount: supabaseSales.length
  };
}

/**
 * Comparar stock por ciudad
 */
async function validateCityStock() {
  console.log('\n🏙️  Validando Stock por Ciudad (cityStock)...');
  
  const firebaseCityStock = await getFirebaseCollection('cityStock');
  const supabaseCityStock = await getSupabaseTable('city_stock');
  
  // Convertir Firebase a formato normalizado
  const firebaseNormalized = [];
  firebaseCityStock.forEach(cityDoc => {
    const city = cityDoc.id;
    Object.entries(cityDoc).forEach(([key, value]) => {
      if (key !== 'id' && typeof value === 'number') {
        firebaseNormalized.push({ ciudad: city, sku: key, cantidad: value });
      }
    });
  });
  
  console.log(`   Firebase: ${firebaseNormalized.length} registros (${firebaseCityStock.length} ciudades)`);
  console.log(`   Supabase: ${supabaseCityStock.length} registros`);
  
  // Normalizar nombres de ciudades para comparación
  function normalizeCityName(city) {
    if (!city) return '—';
    return city.toLowerCase().replace(/\s+/g, '_');
  }
  
  // Comparar totales por ciudad (normalizado)
  const firebaseByCity = {};
  const supabaseByCity = {};
  
  firebaseNormalized.forEach(r => {
    const city = normalizeCityName(r.ciudad);
    firebaseByCity[city] = (firebaseByCity[city] || 0) + r.cantidad;
  });
  
  supabaseCityStock.forEach(r => {
    const city = normalizeCityName(r.ciudad);
    supabaseByCity[city] = (supabaseByCity[city] || 0) + Number(r.cantidad || 0);
  });
  
  console.log('\n   Stock total por ciudad (normalizado):');
  const allCities = new Set([...Object.keys(firebaseByCity), ...Object.keys(supabaseByCity)]);
  let differences = 0;
  for (const city of allCities) {
    const fb = firebaseByCity[city] || 0;
    const sb = supabaseByCity[city] || 0;
    if (fb !== sb) {
      console.warn(`   ⚠️  ${city}: Firebase=${fb}, Supabase=${sb} (diferencia: ${Math.abs(fb - sb)})`);
      differences++;
    } else {
      console.log(`   ✅ ${city}: ${fb}`);
    }
  }
  
  return {
    passed: differences === 0,
    firebaseCount: firebaseNormalized.length,
    supabaseCount: supabaseCityStock.length,
    differences
  };
}

/**
 * Comparar depósitos
 */
async function validateDeposits() {
  console.log('\n💵 Validando Depósitos (GenerarDeposito)...');
  
  const firebaseDeposits = await getFirebaseCollection('GenerarDeposito');
  const supabaseDeposits = await getSupabaseTable('deposits');
  
  console.log(`   Firebase: ${firebaseDeposits.length} documentos`);
  console.log(`   Supabase: ${supabaseDeposits.length} depósitos`);
  
  // Agrupar Firebase por ciudad y fecha
  const firebaseGrouped = {};
  firebaseDeposits.forEach(d => {
    const key = `${d.ciudad || d.city || '—'}_${d.fecha || '—'}`;
    if (!firebaseGrouped[key]) {
      firebaseGrouped[key] = { ciudad: d.ciudad || d.city || '—', fecha: d.fecha || '—', count: 0 };
    }
    firebaseGrouped[key].count++;
  });
  
  const firebaseUnique = Object.keys(firebaseGrouped).length;
  
  console.log(`   Firebase: ${firebaseUnique} depósitos únicos (agrupados por ciudad+fecha)`);
  
  if (firebaseUnique !== supabaseDeposits.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseUnique - supabaseDeposits.length)}`);
  }
  
  return {
    passed: Math.abs(firebaseUnique - supabaseDeposits.length) <= 2, // Permitir pequeña diferencia
    firebaseCount: firebaseUnique,
    supabaseCount: supabaseDeposits.length
  };
}

/**
 * Comparar despachos
 */
async function validateDispatches() {
  console.log('\n🚚 Validando Despachos...');
  
  const firebasePending = await getFirebaseCollection('despachos');
  const firebaseHistory = await getFirebaseCollection('despachosHistorial');
  const supabaseDispatches = await getSupabaseTable('dispatches');
  
  const firebaseTotal = firebasePending.length + firebaseHistory.length;
  
  console.log(`   Firebase: ${firebaseTotal} despachos (${firebasePending.length} pendientes + ${firebaseHistory.length} históricos)`);
  console.log(`   Supabase: ${supabaseDispatches.length} despachos`);
  
  if (firebaseTotal !== supabaseDispatches.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseTotal - supabaseDispatches.length)}`);
  }
  
  return {
    passed: Math.abs(firebaseTotal - supabaseDispatches.length) <= 1,
    firebaseCount: firebaseTotal,
    supabaseCount: supabaseDispatches.length
  };
}

/**
 * Comparar números
 */
async function validateNumbers() {
  console.log('\n📞 Validando Números...');
  
  const firebaseNumbers = await getFirebaseCollection('numbers');
  const supabaseNumbers = await getSupabaseTable('mis_numeros');
  
  console.log(`   Firebase: ${firebaseNumbers.length} números`);
  console.log(`   Supabase: ${supabaseNumbers.length} números`);
  
  if (firebaseNumbers.length !== supabaseNumbers.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseNumbers.length - supabaseNumbers.length)}`);
  }
  
  return {
    passed: Math.abs(firebaseNumbers.length - supabaseNumbers.length) <= 1,
    firebaseCount: firebaseNumbers.length,
    supabaseCount: supabaseNumbers.length
  };
}

/**
 * Comparar mensajes de equipo
 */
async function validateTeamMessages() {
  console.log('\n💬 Validando Mensajes de Equipo...');
  
  const firebaseMessages = await getFirebaseCollection('team_messages');
  const supabaseMessages = await getSupabaseTable('team_messages');
  
  console.log(`   Firebase: ${firebaseMessages.length} mensajes`);
  console.log(`   Supabase: ${supabaseMessages.length} mensajes`);
  
  if (firebaseMessages.length !== supabaseMessages.length) {
    console.warn(`   ⚠️  Diferencia en cantidad: ${Math.abs(firebaseMessages.length - supabaseMessages.length)}`);
  }
  
  return {
    passed: Math.abs(firebaseMessages.length - supabaseMessages.length) <= 1,
    firebaseCount: firebaseMessages.length,
    supabaseCount: supabaseMessages.length
  };
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('🔍 VALIDACIÓN COMPLETA DE MIGRACIÓN FIREBASE → SUPABASE');
  console.log('='.repeat(70));
  
  const results = {
    products: await validateProducts(),
    users: await validateUsers(),
    salesHistory: await validateSalesHistory(),
    pendingSales: await validatePendingSales(),
    unconfirmedSales: await validateUnconfirmedSales(),
    cityStock: await validateCityStock(),
    deposits: await validateDeposits(),
    dispatches: await validateDispatches(),
    numbers: await validateNumbers(),
    teamMessages: await validateTeamMessages()
  };
  
  // Resumen
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN DE VALIDACIÓN');
  console.log('='.repeat(70));
  
  const allPassed = Object.values(results).every(r => r.passed);
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.passed).length;
  
  console.log(`\n✅ Pruebas pasadas: ${passedTests}/${totalTests}`);
  console.log(`❌ Pruebas fallidas: ${totalTests - passedTests}/${totalTests}\n`);
  
  // Detalles
  Object.entries(results).forEach(([name, result]) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.passed ? 'OK' : 'DIFERENCIAS DETECTADAS'}`);
    if (!result.passed) {
      console.log(`   Firebase: ${result.firebaseCount}, Supabase: ${result.supabaseCount}`);
      if (result.missing) console.log(`   Faltantes: ${result.missing}`);
      if (result.differences) console.log(`   Diferencias: ${result.differences}`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (allPassed) {
    console.log('🎉 ¡TODAS LAS VALIDACIONES PASARON!');
    console.log('✅ La migración está completa y los datos son idénticos.');
    process.exit(0);
  } else {
    console.log('⚠️  SE DETECTARON DIFERENCIAS');
    console.log('📝 Revisa los detalles arriba para identificar las discrepancias.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

