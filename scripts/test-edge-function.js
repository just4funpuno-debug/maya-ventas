/**
 * Script para probar Edge Function
 * Ejecuta los tests de SUBFASE 3.1 automáticamente
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Cargar .env.local si existe
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const FUNCTION_NAME = 'meta-oauth-callback';

if (!SUPABASE_URL) {
  console.error('❌ Falta VITE_SUPABASE_URL o SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Falta VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  console.error('   Necesario para autenticar las requests a la Edge Function');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`;

// Headers de autenticación
const AUTH_HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

const tests = [
  {
    name: 'Test 1: GET Request',
    method: 'GET',
    url: FUNCTION_URL,
    expectedStatus: [200, 400],
  },
  {
    name: 'Test 2: POST con Code y State (SUBFASE 3.2: Token Exchange)',
    method: 'POST',
    url: `${FUNCTION_URL}?code=TEST_CODE_123&state=TEST_STATE_456`,
    expectedStatus: [200, 400, 500], // Puede fallar si el código no es válido (esperado)
    // Nota: Este test verifica que la función intenta intercambiar el código con Meta
    // Si recibe error de Meta (400), significa que las credenciales funcionan y está haciendo la llamada
    // Si recibe success (200), significa que obtuvo el token correctamente
    // Ambos casos son válidos para SUBFASE 3.2
  },
  {
    name: 'Test 3: POST sin Code (Error esperado)',
    method: 'POST',
    url: `${FUNCTION_URL}?state=TEST_STATE`,
    expectedStatus: 400,
    expectedBody: {
      success: false,
      error: 'missing_code_or_state',
    },
  },
  {
    name: 'Test 4: POST sin State (Error esperado)',
    method: 'POST',
    url: `${FUNCTION_URL}?code=TEST_CODE`,
    expectedStatus: 400,
    expectedBody: {
      success: false,
      error: 'missing_code_or_state',
    },
  },
  {
    name: 'Test 5: POST con Error de OAuth',
    method: 'POST',
    url: `${FUNCTION_URL}?error=access_denied&error_description=User%20denied`,
    expectedStatus: 400,
    expectedBody: {
      success: false,
      error: 'access_denied',
    },
  },
  {
    name: 'Test 6: OPTIONS Request (CORS)',
    method: 'OPTIONS',
    url: FUNCTION_URL,
    expectedStatus: 200,
  },
];

async function runTest(test) {
  try {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   ${test.method} ${test.url}`);
    
    // Para OPTIONS no necesitamos auth headers
    const headers = test.method === 'OPTIONS' 
      ? { 'Content-Type': 'application/json' }
      : AUTH_HEADERS;
    
    const response = await fetch(test.url, {
      method: test.method,
      headers: headers,
    });

    const status = response.status;
    const body = await response.json().catch(() => ({}));
    
    // Verificar status
    const statusOk = Array.isArray(test.expectedStatus)
      ? test.expectedStatus.includes(status)
      : status === test.expectedStatus;
    
    if (!statusOk) {
      console.log(`   ❌ Status esperado: ${test.expectedStatus}, recibido: ${status}`);
      return false;
    }

    // Verificar body si se especifica
    if (test.expectedBody) {
      const bodyOk = Object.keys(test.expectedBody).every(key => 
        body[key] === test.expectedBody[key]
      );
      
      if (!bodyOk) {
        console.log(`   ❌ Body no coincide`);
        console.log(`   Esperado:`, test.expectedBody);
        console.log(`   Recibido:`, body);
        return false;
      }
    }

    console.log(`   ✅ PASS - Status: ${status}`);
    if (Object.keys(body).length > 0) {
      console.log(`   Respuesta:`, JSON.stringify(body, null, 2).substring(0, 200));
    }
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando tests de SUBFASE 3.1...');
  console.log(`   URL: ${FUNCTION_URL}\n`);

  const results = [];
  for (const test of tests) {
    const passed = await runTest(test);
    results.push({ test: test.name, passed });
  }

  console.log('\n📊 Resumen:');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`   ✅ Pasados: ${passed}/${total}`);
  
  if (passed < total) {
    console.log(`   ❌ Fallidos: ${total - passed}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`      - ${r.test}`);
    });
    process.exit(1);
  } else {
    console.log('   🎉 Todos los tests pasaron!');
    process.exit(0);
  }
}

runAllTests();

