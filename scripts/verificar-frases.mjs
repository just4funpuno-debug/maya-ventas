/**
 * Script para verificar si las frases motivacionales están en Supabase
 * Ejecutar desde la raíz del proyecto: node scripts/verificar-frases.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Leer variables de entorno desde .env.local o .env
function loadEnv() {
  try {
    const envLocal = join(rootDir, '.env.local');
    const env = join(rootDir, '.env');
    
    let envContent = '';
    try {
      envContent = readFileSync(envLocal, 'utf-8');
    } catch {
      try {
        envContent = readFileSync(env, 'utf-8');
      } catch {
        console.error('❌ No se encontró archivo .env o .env.local');
        process.exit(1);
      }
    }
    
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Error leyendo archivo .env:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan variables de entorno:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFrases() {
  console.log('🔍 Verificando frases motivacionales en Supabase...\n');
  console.log('📡 Conectando a:', supabaseUrl.replace(/\/\/.*@/, '//***@')); // Ocultar credenciales
  console.log('');

  try {
    // 1. Contar frases totales
    const { data: allPhrases, error: allError } = await supabase
      .from('motivational_phrases')
      .select('id, phrase_text, active, display_order, created_at');

    if (allError) {
      console.error('❌ Error consultando frases:', allError);
      console.error('   Código:', allError.code);
      console.error('   Mensaje:', allError.message);
      return;
    }

    const total = allPhrases?.length || 0;
    const activas = allPhrases?.filter(p => p.active === true).length || 0;
    const inactivas = total - activas;

    console.log('📊 RESUMEN:');
    console.log(`   Total de frases: ${total}`);
    console.log(`   ✅ Frases activas: ${activas}`);
    console.log(`   ⚠️  Frases inactivas: ${inactivas}\n`);

    // 2. Verificar si hay exactamente 50 frases activas
    console.log('🎯 VERIFICACIÓN:');
    if (activas === 50) {
      console.log('   ✅ CORRECTO: Hay 50 frases activas (35 personales + 15 ventas)');
    } else if (activas > 50) {
      console.log(`   ⚠️  ADVERTENCIA: Hay más de 50 frases activas (${activas})`);
      console.log('      → Puede haber frases duplicadas o adicionales');
    } else if (activas > 0) {
      console.log(`   ⚠️  INCOMPLETO: Solo hay ${activas} frases activas (deberían ser 50)`);
      console.log(`      → Faltan ${50 - activas} frases`);
    } else {
      console.log('   ❌ ERROR: No hay frases activas en Supabase');
      console.log('      → Necesitas migrar las frases desde el código');
      console.log('      → Ve al menú "Frases" y haz clic en "Restaurar frases por defecto"');
    }

    // 3. Mostrar algunas frases de ejemplo
    if (activas > 0) {
      console.log('\n📝 Ejemplos de frases activas (primeras 5):');
      const ejemplos = allPhrases
        .filter(p => p.active === true)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .slice(0, 5)
        .map((p, i) => {
          const texto = p.phrase_text.length > 70 
            ? p.phrase_text.substring(0, 70) + '...' 
            : p.phrase_text;
          return `   ${i + 1}. "${texto}"`;
        });
      ejemplos.forEach(e => console.log(e));
    }

    // 4. Verificar duplicados
    if (activas > 0) {
      const textos = allPhrases
        .filter(p => p.active === true)
        .map(p => p.phrase_text.trim().toLowerCase());
      const textosUnicos = new Set(textos);
      const duplicados = textos.length - textosUnicos.size;
      
      if (duplicados > 0) {
        console.log(`\n⚠️  ADVERTENCIA: Se encontraron ${duplicados} frases duplicadas`);
      } else {
        console.log('\n✅ No hay frases duplicadas');
      }
    }

    // 5. Verificar fechas de creación
    if (activas > 0) {
      const fechas = allPhrases
        .filter(p => p.active === true)
        .map(p => p.created_at)
        .filter(Boolean);
      
      if (fechas.length > 0) {
        const fechaMasAntigua = new Date(Math.min(...fechas.map(f => new Date(f))));
        const fechaMasReciente = new Date(Math.max(...fechas.map(f => new Date(f))));
        console.log(`\n📅 Fechas:`);
        console.log(`   Más antigua: ${fechaMasAntigua.toLocaleDateString('es-BO')}`);
        console.log(`   Más reciente: ${fechaMasReciente.toLocaleDateString('es-BO')}`);
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    console.error('   Stack:', error.stack);
  }
}

verificarFrases();


