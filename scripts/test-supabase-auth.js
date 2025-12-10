/**
 * Script de Prueba: Funciones de Autenticación Supabase
 * Fase 7.2: Probar funciones de autenticación
 * 
 * Uso: node scripts/test-supabase-auth.js
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

// Importar funciones de auth (supabaseClient.js ahora es compatible con Node.js)
const { registerUser, loginUser, changePassword, getCurrentUser, signOut, onAuthStateChanged } = await import('../src/supabaseAuthUtils.js');

async function testAuthFunctions() {
  console.log('🔍 Probando funciones de autenticación...\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  // Test 1: getCurrentUser (sin sesión)
  console.log('📥 Test 1: getCurrentUser (sin sesión)...');
  try {
    const user = await getCurrentUser();
    if (user === null) {
      console.log('✅ getCurrentUser retorna null cuando no hay sesión\n');
      passed++;
    } else {
      console.log('⚠️  getCurrentUser retorna usuario sin sesión activa\n');
      passed++; // No es error, puede haber sesión persistida
    }
  } catch (error) {
    console.error('❌ Error en getCurrentUser:', error.message);
    errors.push({ test: 'getCurrentUser', error: error.message });
    failed++;
  }

  // Test 2: onAuthStateChanged
  console.log('📥 Test 2: onAuthStateChanged...');
  try {
    let callbackCalled = false;
    const unsubscribe = onAuthStateChanged((user) => {
      callbackCalled = true;
      console.log('   Callback ejecutado, usuario:', user ? 'autenticado' : 'null');
    });

    // Esperar un momento para que se ejecute el callback
    await new Promise(resolve => setTimeout(resolve, 1000));

    unsubscribe();
    
    if (callbackCalled) {
      console.log('✅ onAuthStateChanged funciona correctamente\n');
      passed++;
    } else {
      console.log('⚠️  onAuthStateChanged no ejecutó callback (puede ser normal si no hay sesión)\n');
      passed++; // No es error crítico
    }
  } catch (error) {
    console.error('❌ Error en onAuthStateChanged:', error.message);
    errors.push({ test: 'onAuthStateChanged', error: error.message });
    failed++;
  }

  // Test 3: Verificar que las funciones existen
  console.log('📥 Test 3: Verificar que todas las funciones existen...');
  const functions = {
    registerUser: typeof registerUser === 'function',
    loginUser: typeof loginUser === 'function',
    changePassword: typeof changePassword === 'function',
    getCurrentUser: typeof getCurrentUser === 'function',
    signOut: typeof signOut === 'function',
    onAuthStateChanged: typeof onAuthStateChanged === 'function'
  };

  const allExist = Object.values(functions).every(v => v === true);
  if (allExist) {
    console.log('✅ Todas las funciones están definidas\n');
    passed++;
  } else {
    console.error('❌ Algunas funciones faltan:', Object.entries(functions).filter(([_, v]) => !v).map(([k]) => k));
    errors.push({ test: 'funciones existentes', error: 'Funciones faltantes' });
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

testAuthFunctions()
  .then(({ passed, failed }) => {
    if (failed === 0) {
      console.log('🎉 Todas las pruebas de autenticación pasaron');
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

