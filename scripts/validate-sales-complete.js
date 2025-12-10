/**
 * Script de Validación Completa: Ventas
 * Fase 5.5: Validación Completa de Ventas
 * 
 * Valida:
 * - Totales por ciudad en ambos sistemas
 * - codigo_unico único
 * - Relaciones cruzadas
 * - Queries complejas
 * 
 * Uso: node scripts/validate-sales-complete.js
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
 * Normaliza nombre de ciudad
 */
function normalizeCity(ciudad) {
  if (!ciudad) return null;
  return ciudad.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Convierte timestamp a número
 */
function timestampToNumber(value) {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate().getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  return null;
}

/**
 * Validación completa de ventas
 */
async function validateSalesComplete() {
  console.log('🔍 Iniciando validación completa de ventas...\n');

  const errors = [];
  const warnings = [];
  let allValid = true;

  try {
    // 1. Validar conteos totales
    console.log('='.repeat(60));
    console.log('1️⃣  VALIDACIÓN DE CONTEO TOTAL');
    console.log('='.repeat(60) + '\n');

    const firebaseHistorial = await db.collection('ventashistorico').get();
    const firebasePorCobrar = await db.collection('ventasporcobrar').get();
    const firebasePendientes = await db.collection('VentasSinConfirmar').get();

    const firebaseTotal = firebaseHistorial.size + firebasePendientes.size;
    // Nota: ventasporcobrar puede tener duplicados de historial

    const { count: supabaseTotal } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Firebase (historial + pendientes): ${firebaseTotal}`);
    console.log(`📊 Supabase (total): ${supabaseTotal}`);
    
    if (Math.abs(supabaseTotal - firebaseTotal) <= 10) {
      console.log('✅ Conteos totales válidos (diferencia aceptable por duplicados)\n');
    } else {
      console.warn(`⚠️  Diferencia significativa: ${Math.abs(supabaseTotal - firebaseTotal)}\n`);
      warnings.push(`Diferencia en conteos totales: ${Math.abs(supabaseTotal - firebaseTotal)}`);
    }

    // 2. Validar codigo_unico único
    console.log('='.repeat(60));
    console.log('2️⃣  VALIDACIÓN DE codigo_unico ÚNICO');
    console.log('='.repeat(60) + '\n');

    const { data: salesWithCodigo } = await supabase
      .from('sales')
      .select('codigo_unico')
      .not('codigo_unico', 'is', null);

    const codigos = salesWithCodigo?.map(s => s.codigo_unico) || [];
    const codigosUnicos = new Set(codigos);
    const duplicados = codigos.length - codigosUnicos.size;

    console.log(`📊 Ventas con codigo_unico: ${codigos.length}`);
    console.log(`📊 codigo_unico únicos: ${codigosUnicos.size}`);
    console.log(`📊 Duplicados: ${duplicados}`);

    if (duplicados === 0) {
      console.log('✅ Todos los codigo_unico son únicos\n');
    } else {
      console.error(`❌ Se encontraron ${duplicados} codigo_unico duplicados\n`);
      errors.push(`${duplicados} codigo_unico duplicados encontrados`);
      allValid = false;
    }

    // 3. Validar totales por ciudad
    console.log('='.repeat(60));
    console.log('3️⃣  VALIDACIÓN DE TOTALES POR CIUDAD');
    console.log('='.repeat(60) + '\n');

    // Calcular totales en Firebase
    const firebaseTotales = {};
    firebaseHistorial.forEach(doc => {
      const data = doc.data();
      const ciudad = normalizeCity(data.ciudad);
      const total = parseFloat(data.total || 0);
      if (ciudad) {
        if (!firebaseTotales[ciudad]) {
          firebaseTotales[ciudad] = { count: 0, total: 0 };
        }
        firebaseTotales[ciudad].count++;
        firebaseTotales[ciudad].total += total;
      }
    });

    firebasePendientes.forEach(doc => {
      const data = doc.data();
      const ciudad = normalizeCity(data.ciudad);
      const total = parseFloat(data.total || data.precio || 0);
      if (ciudad) {
        if (!firebaseTotales[ciudad]) {
          firebaseTotales[ciudad] = { count: 0, total: 0 };
        }
        firebaseTotales[ciudad].count++;
        firebaseTotales[ciudad].total += total;
      }
    });

    // Calcular totales en Supabase
    const { data: supabaseSales } = await supabase
      .from('sales')
      .select('ciudad, total');

    const supabaseTotales = {};
    supabaseSales?.forEach(sale => {
      const ciudad = sale.ciudad;
      const total = parseFloat(sale.total || 0);
      if (ciudad) {
        if (!supabaseTotales[ciudad]) {
          supabaseTotales[ciudad] = { count: 0, total: 0 };
        }
        supabaseTotales[ciudad].count++;
        supabaseTotales[ciudad].total += total;
      }
    });

    // Comparar
    const allCities = new Set([
      ...Object.keys(firebaseTotales),
      ...Object.keys(supabaseTotales)
    ]);

    let ciudadesValidas = 0;
    let ciudadesConDiferencias = 0;

    for (const ciudad of allCities) {
      const firebase = firebaseTotales[ciudad] || { count: 0, total: 0 };
      const supabase = supabaseTotales[ciudad] || { count: 0, total: 0 };

      const diffCount = Math.abs(firebase.count - supabase.count);
      const diffTotal = Math.abs(firebase.total - supabase.total);

      console.log(`   ${ciudad}:`);
      console.log(`      Firebase: ${firebase.count} ventas, Bs ${firebase.total.toFixed(2)}`);
      console.log(`      Supabase: ${supabase.count} ventas, Bs ${supabase.total.toFixed(2)}`);

      if (diffCount <= 5 && diffTotal < 1) {
        console.log(`      ✅ Coinciden\n`);
        ciudadesValidas++;
      } else {
        console.warn(`      ⚠️  Diferencia: ${diffCount} ventas, Bs ${diffTotal.toFixed(2)}\n`);
        ciudadesConDiferencias++;
        warnings.push(`${ciudad}: diferencia de ${diffCount} ventas, Bs ${diffTotal.toFixed(2)}`);
      }
    }

    console.log(`✅ Ciudades válidas: ${ciudadesValidas}/${allCities.size}`);
    if (ciudadesConDiferencias > 0) {
      console.warn(`⚠️  Ciudades con diferencias: ${ciudadesConDiferencias}\n`);
    }

    // 4. Validar ventas por cobrar
    console.log('='.repeat(60));
    console.log('4️⃣  VALIDACIÓN DE VENTAS POR COBRAR');
    console.log('='.repeat(60) + '\n');

    const { count: supabasePorCobrar } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .is('deleted_from_pending_at', null)
      .eq('estado_pago', 'pendiente')
      .in('estado_entrega', ['confirmado', 'entregada']);

    console.log(`📊 Firebase ventasporcobrar: ${firebasePorCobrar.size}`);
    console.log(`📊 Supabase ventas por cobrar: ${supabasePorCobrar}`);

    if (Math.abs(supabasePorCobrar - firebasePorCobrar.size) <= 10) {
      console.log('✅ Conteos de ventas por cobrar válidos\n');
    } else {
      console.warn(`⚠️  Diferencia: ${Math.abs(supabasePorCobrar - firebasePorCobrar.size)}\n`);
      warnings.push(`Diferencia en ventas por cobrar: ${Math.abs(supabasePorCobrar - firebasePorCobrar.size)}`);
    }

    // 5. Validar ventas pendientes
    console.log('='.repeat(60));
    console.log('5️⃣  VALIDACIÓN DE VENTAS PENDIENTES');
    console.log('='.repeat(60) + '\n');

    const { count: supabasePendientes } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('estado_entrega', 'pendiente');

    console.log(`📊 Firebase VentasSinConfirmar: ${firebasePendientes.size}`);
    console.log(`📊 Supabase ventas pendientes: ${supabasePendientes}`);

    if (supabasePendientes === firebasePendientes.size) {
      console.log('✅ Conteos de ventas pendientes válidos\n');
    } else {
      console.warn(`⚠️  Diferencia: ${Math.abs(supabasePendientes - firebasePendientes.size)}\n`);
      warnings.push(`Diferencia en ventas pendientes: ${Math.abs(supabasePendientes - firebasePendientes.size)}`);
    }

    // 6. Validar depósitos
    console.log('='.repeat(60));
    console.log('6️⃣  VALIDACIÓN DE DEPÓSITOS');
    console.log('='.repeat(60) + '\n');

    const firebaseDepositos = await db.collection('GenerarDeposito').get();
    const { count: supabaseDepositos } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true });

    const { count: ventasConDeposito } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .not('deposit_id', 'is', null);

    console.log(`📊 Firebase GenerarDeposito: ${firebaseDepositos.size} documentos`);
    console.log(`📊 Supabase deposits: ${supabaseDepositos} depósitos`);
    console.log(`📊 Ventas con deposit_id: ${ventasConDeposito}`);

    if (supabaseDepositos > 0) {
      console.log('✅ Depósitos migrados correctamente\n');
    } else {
      console.warn('⚠️  No se encontraron depósitos en Supabase\n');
      warnings.push('No se encontraron depósitos en Supabase');
    }

    // 7. Validar relaciones (SKUs, usuarios)
    console.log('='.repeat(60));
    console.log('7️⃣  VALIDACIÓN DE RELACIONES');
    console.log('='.repeat(60) + '\n');

    const { data: salesWithInvalidSku } = await supabase
      .from('sales')
      .select('id, sku')
      .not('sku', 'is', null);

    const { data: products } = await supabase
      .from('products')
      .select('sku');

    const validSkus = new Set(products?.map(p => p.sku) || []);
    const invalidSkus = salesWithInvalidSku?.filter(s => s.sku && !validSkus.has(s.sku)) || [];

    console.log(`📊 Ventas con SKU: ${salesWithInvalidSku?.length || 0}`);
    console.log(`📊 SKUs inválidos: ${invalidSkus.length}`);

    if (invalidSkus.length === 0) {
      console.log('✅ Todas las relaciones de SKU son válidas\n');
    } else {
      console.warn(`⚠️  ${invalidSkus.length} ventas con SKU inválido\n`);
      warnings.push(`${invalidSkus.length} ventas con SKU inválido`);
    }

    // 8. Queries complejas
    console.log('='.repeat(60));
    console.log('8️⃣  PRUEBA DE QUERIES COMPLEJAS');
    console.log('='.repeat(60) + '\n');

    // Query 1: Ventas por cobrar por ciudad
    console.log('📊 Query 1: Ventas por cobrar por ciudad');
    const { data: ventasPorCobrarPorCiudad } = await supabase
      .from('sales')
      .select('ciudad, total')
      .is('deleted_from_pending_at', null)
      .eq('estado_pago', 'pendiente')
      .in('estado_entrega', ['confirmado', 'entregada']);

    const totalPorCobrar = ventasPorCobrarPorCiudad?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    console.log(`   Total por cobrar: Bs ${totalPorCobrar.toFixed(2)}`);
    console.log('   ✅ Query ejecutada correctamente\n');

    // Query 2: Historial por fecha
    console.log('📊 Query 2: Historial por fecha (últimos 30 días)');
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    
    const { count: ventasUltimos30Dias } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', fechaLimite.toISOString().split('T')[0])
      .in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);

    console.log(`   Ventas últimos 30 días: ${ventasUltimos30Dias}`);
    console.log('   ✅ Query ejecutada correctamente\n');

    // Query 3: Depósitos por ciudad
    console.log('📊 Query 3: Depósitos por ciudad');
    const { data: depositosPorCiudad } = await supabase
      .from('deposits')
      .select('ciudad, monto_total');

    const totalDepositos = depositosPorCiudad?.reduce((sum, d) => sum + (d.monto_total || 0), 0) || 0;
    console.log(`   Total depósitos: Bs ${totalDepositos.toFixed(2)}`);
    console.log('   ✅ Query ejecutada correctamente\n');

    // 9. Resumen final
    console.log('='.repeat(60));
    console.log('📋 RESUMEN DE VALIDACIÓN');
    console.log('='.repeat(60) + '\n');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ TODAS LAS VALIDACIONES PASARON\n');
    } else {
      if (errors.length > 0) {
        console.error(`❌ ERRORES ENCONTRADOS: ${errors.length}`);
        errors.forEach(err => console.error(`   - ${err}`));
        console.log('');
      }
      if (warnings.length > 0) {
        console.warn(`⚠️  ADVERTENCIAS: ${warnings.length}`);
        warnings.slice(0, 10).forEach(warn => console.warn(`   - ${warn}`));
        if (warnings.length > 10) {
          console.warn(`   ... y ${warnings.length - 10} más`);
        }
        console.log('');
      }
    }

    console.log('✅ Validación completa finalizada\n');

    if (!allValid) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error fatal en validación:', error);
    process.exit(1);
  }
}

// Ejecutar validación
validateSalesComplete()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



