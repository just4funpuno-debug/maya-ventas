/**
 * Script de Prueba: Cliente Supabase
 * Fase 7.1: Probar conexión y lectura de tablas
 * 
 * Uso: node scripts/test-supabase-client.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Probando conexión a Supabase...\n');

  try {
    // 1. Probar lectura de productos
    console.log('📥 Probando lectura de productos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(5);

    if (productsError) {
      console.error('❌ Error leyendo productos:', productsError);
      return false;
    }

    console.log(`✅ Productos leídos: ${products?.length || 0}`);
    if (products && products.length > 0) {
      console.log(`   Ejemplo: ${products[0].nombre} (SKU: ${products[0].sku})`);
    }
    console.log('');

    // 2. Probar lectura de ventas
    console.log('📥 Probando lectura de ventas...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(5);

    if (salesError) {
      console.error('❌ Error leyendo ventas:', salesError);
      return false;
    }

    console.log(`✅ Ventas leídas: ${sales?.length || 0}`);
    console.log('');

    // 3. Probar lectura de stock
    console.log('📥 Probando lectura de stock por ciudad...');
    const { data: stock, error: stockError } = await supabase
      .from('city_stock')
      .select('*')
      .limit(5);

    if (stockError) {
      console.error('❌ Error leyendo stock:', stockError);
      return false;
    }

    console.log(`✅ Stock leído: ${stock?.length || 0} registros`);
    console.log('');

    // 4. Probar lectura de usuarios
    console.log('📥 Probando lectura de usuarios...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.error('❌ Error leyendo usuarios:', usersError);
      return false;
    }

    console.log(`✅ Usuarios leídos: ${users?.length || 0}`);
    console.log('');

    console.log('✅ Todas las pruebas de conexión pasaron\n');
    return true;

  } catch (error) {
    console.error('❌ Error fatal:', error);
    return false;
  }
}

testConnection()
  .then((success) => {
    if (success) {
      console.log('🎉 Cliente Supabase funcionando correctamente');
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



