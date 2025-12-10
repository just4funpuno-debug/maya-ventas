/**
 * Script para verificar si las frases motivacionales están en Supabase
 * Ejecutar con: node verificar_frases.js
 * 
 * Requiere: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFrases() {
  console.log('🔍 Verificando frases en Supabase...\n');

  try {
    // 1. Contar frases totales
    const { data: allPhrases, error: allError } = await supabase
      .from('motivational_phrases')
      .select('id, phrase_text, active, display_order');

    if (allError) {
      console.error('❌ Error consultando frases:', allError);
      return;
    }

    const total = allPhrases?.length || 0;
    const activas = allPhrases?.filter(p => p.active === true).length || 0;
    const inactivas = total - activas;

    console.log('📊 RESUMEN:');
    console.log(`   Total de frases: ${total}`);
    console.log(`   Frases activas: ${activas}`);
    console.log(`   Frases inactivas: ${inactivas}\n`);

    // 2. Verificar si hay exactamente 50 frases activas
    if (activas === 50) {
      console.log('✅ CORRECTO: Hay 50 frases activas (35 personales + 15 ventas)');
    } else if (activas > 50) {
      console.log(`⚠️  ADVERTENCIA: Hay más de 50 frases activas (${activas})`);
    } else if (activas > 0) {
      console.log(`⚠️  INCOMPLETO: Solo hay ${activas} frases activas (deberían ser 50)`);
    } else {
      console.log('❌ ERROR: No hay frases activas en Supabase');
      console.log('   → Necesitas migrar las frases desde el código');
      console.log('   → Ve al menú "Frases" y haz clic en "Restaurar frases por defecto"');
    }

    // 3. Mostrar algunas frases de ejemplo
    if (activas > 0) {
      console.log('\n📝 Ejemplos de frases activas:');
      const ejemplos = allPhrases
        .filter(p => p.active === true)
        .slice(0, 5)
        .map((p, i) => `   ${i + 1}. "${p.phrase_text.substring(0, 60)}${p.phrase_text.length > 60 ? '...' : ''}"`);
      ejemplos.forEach(e => console.log(e));
    }

    // 4. Verificar si hay frases duplicadas
    const textos = allPhrases?.map(p => p.phrase_text.trim().toLowerCase()) || [];
    const duplicados = textos.filter((text, index) => textos.indexOf(text) !== index);
    if (duplicados.length > 0) {
      console.log(`\n⚠️  ADVERTENCIA: Se encontraron ${duplicados.length} frases duplicadas`);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error fatal:', error);
  }
}

verificarFrases();


