/**
 * Script simple para probar conexión a Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Probando conexión a Supabase...');
console.log('URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NO CONFIGURADA');
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NO CONFIGURADA');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('\n📊 Probando consulta a tabla products...');
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.error('   Detalles:', error);
      process.exit(1);
    }
    
    console.log('✅ Conexión exitosa!');
    console.log(`   Tabla products existe y tiene ${count || 0} registros`);
    
    // Probar otra tabla
    console.log('\n📊 Probando consulta a tabla sales...');
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Tabla sales existe y tiene ${salesCount || 0} registros`);
    
    console.log('\n✅ Todas las pruebas pasaron! Supabase está configurado correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

test();



