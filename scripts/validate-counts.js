/**
 * Script de Validación de Conteos
 * Fase 0.3: Compara conteos entre Firebase y Supabase
 * 
 * Uso: node scripts/validate-counts.js [--collection nombre]
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './migration-logger.js';

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
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Variables de entorno de Supabase no configuradas');
  logger.error('   Necesitas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de colecciones Firebase → Tablas Supabase
const COLLECTION_MAP = {
  'almacenCentral': 'products',
  'cityStock': 'city_stock',
  'VentasSinConfirmar': 'sales',
  'ventashistorico': 'sales',
  'ventasporcobrar': 'sales',
  'GenerarDeposito': 'sales', // Se migra como sales con deposit_id
  'users': 'users',
  'despachos': 'dispatches',
  'despachosHistorial': 'dispatches',
  'numbers': 'mis_numeros',
  'team_messages': 'team_messages'
};

// Filtros especiales para colecciones que se unifican en una tabla
const SPECIAL_FILTERS = {
  'VentasSinConfirmar': { table: 'sales', filter: { estado_entrega: 'pendiente' } },
  'ventashistorico': { table: 'sales', filter: { estado_entrega: { $in: ['confirmado', 'entregada', 'cancelado'] } } },
  'ventasporcobrar': { table: 'sales', filter: { deleted_from_pending_at: null, estado_pago: 'pendiente' } },
  'despachos': { table: 'dispatches', filter: { status: 'pendiente' } },
  'despachosHistorial': { table: 'dispatches', filter: { status: 'confirmado' } }
};

async function getFirebaseCount(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.size;
  } catch (error) {
    logger.error(`Error contando ${collectionName} en Firebase:`, error.message);
    return null;
  }
}

async function getSupabaseCount(collectionName) {
  try {
    const mapping = COLLECTION_MAP[collectionName];
    if (!mapping) {
      logger.warn(`No hay mapeo para colección: ${collectionName}`);
      return null;
    }

    // Verificar si tiene filtro especial
    const special = SPECIAL_FILTERS[collectionName];
    if (special) {
      const { table, filter } = special;
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      
      // Aplicar filtros
      if (filter.estado_entrega) {
        if (Array.isArray(filter.estado_entrega.$in)) {
          // Para múltiples valores, usar OR
          const orConditions = filter.estado_entrega.$in.map(val => `estado_entrega.eq.${val}`).join(',');
          query = supabase.from(table).select('*', { count: 'exact', head: true })
            .or(orConditions);
        } else {
          query = query.eq('estado_entrega', filter.estado_entrega);
        }
      }
      if (filter.deleted_from_pending_at === null) {
        query = query.is('deleted_from_pending_at', null);
      }
      if (filter.estado_pago) {
        query = query.eq('estado_pago', filter.estado_pago);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count;
    }

    // Conteo normal
    const { count, error } = await supabase
      .from(mapping)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count;
  } catch (error) {
    logger.error(`Error contando ${collectionName} en Supabase:`, error.message);
    return null;
  }
}

async function validateCollection(collectionName) {
  logger.info(`\n📊 Validando: ${collectionName}`);
  
  const firebaseCount = await getFirebaseCount(collectionName);
  const supabaseCount = await getSupabaseCount(collectionName);
  
  if (firebaseCount === null || supabaseCount === null) {
    logger.warn(`⚠️  No se pudo validar ${collectionName} (datos faltantes)`);
    return { collection: collectionName, match: false, firebaseCount, supabaseCount };
  }
  
  const match = firebaseCount === supabaseCount;
  logger.validation(collectionName, firebaseCount, supabaseCount, match);
  
  return {
    collection: collectionName,
    match,
    firebaseCount,
    supabaseCount,
    difference: Math.abs(firebaseCount - supabaseCount)
  };
}

async function main() {
  const args = process.argv.slice(2);
  const collectionArg = args.find(arg => arg.startsWith('--collection'));
  const collectionName = collectionArg ? collectionArg.split('=')[1] : null;
  
  logger.info('🔍 Iniciando validación de conteos...');
  
  const collections = collectionName 
    ? [collectionName] 
    : Object.keys(COLLECTION_MAP);
  
  const results = [];
  
  for (const collection of collections) {
    const result = await validateCollection(collection);
    results.push(result);
    
    // Pequeña pausa
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen
  const matched = results.filter(r => r.match).length;
  const total = results.length;
  
  logger.info('\n' + '='.repeat(60));
  logger.info('📋 RESUMEN DE VALIDACIÓN');
  logger.info('='.repeat(60));
  logger.info(`✅ Coincidencias: ${matched}/${total}`);
  logger.info(`❌ Diferencias: ${total - matched}/${total}`);
  
  // Mostrar diferencias
  const differences = results.filter(r => !r.match);
  if (differences.length > 0) {
    logger.warn('\n⚠️  Colecciones con diferencias:');
    differences.forEach(r => {
      logger.warn(`  ${r.collection}: Firebase=${r.firebaseCount}, Supabase=${r.supabaseCount}, Diferencia=${r.difference}`);
    });
  }
  
  // Guardar resultados
  const outputFile = path.join(__dirname, '../logs', `validation-${Date.now()}.json`);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf8');
  logger.info(`\n📄 Resultados guardados en: ${outputFile}`);
  
  if (matched === total) {
    logger.info('\n✅ ¡Todas las validaciones pasaron!');
    process.exit(0);
  } else {
    logger.error('\n❌ Hay diferencias. Revisa los resultados arriba.');
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

