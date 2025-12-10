/**
 * Script de Comparación de Datos
 * Fase 0.3: Compara datos específicos entre Firebase y Supabase
 * 
 * Uso: node scripts/compare-data.js --collection nombre --limit 10
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de colecciones
const COLLECTION_MAP = {
  'almacenCentral': 'products',
  'cityStock': 'city_stock',
  'users': 'users',
  'numbers': 'mis_numeros',
  'team_messages': 'team_messages'
};

function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (value && typeof value === 'object' && value.toDate) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const normalized = {};
    for (const [k, v] of Object.entries(value)) {
      normalized[k] = normalizeValue(v);
    }
    return normalized;
  }
  return value;
}

function compareObjects(obj1, obj2, path = '') {
  const differences = [];
  
  // Obtener todas las claves únicas
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = normalizeValue(obj1?.[key]);
    const val2 = normalizeValue(obj2?.[key]);
    
    if (val1 === undefined && val2 !== undefined) {
      differences.push({
        path: currentPath,
        firebase: 'MISSING',
        supabase: val2,
        type: 'missing_in_firebase'
      });
    } else if (val2 === undefined && val1 !== undefined) {
      differences.push({
        path: currentPath,
        firebase: val1,
        supabase: 'MISSING',
        type: 'missing_in_supabase'
      });
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      differences.push({
        path: currentPath,
        firebase: val1,
        supabase: val2,
        type: 'different'
      });
    }
  }
  
  return differences;
}

async function compareCollection(collectionName, limit = 10) {
  logger.info(`\n🔍 Comparando datos de: ${collectionName} (limit: ${limit})`);
  
  const mapping = COLLECTION_MAP[collectionName];
  if (!mapping) {
    logger.warn(`No hay mapeo para: ${collectionName}`);
    return;
  }
  
  // Obtener documentos de Firebase
  const firebaseSnapshot = await db.collection(collectionName).limit(limit).get();
  const firebaseDocs = firebaseSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  logger.info(`📄 Firebase: ${firebaseDocs.length} documentos`);
  
  // Obtener documentos de Supabase
  const { data: supabaseDocs, error } = await supabase
    .from(mapping)
    .select('*')
    .limit(limit);
  
  if (error) {
    logger.error(`Error obteniendo datos de Supabase:`, error.message);
    return;
  }
  
  logger.info(`📄 Supabase: ${supabaseDocs?.length || 0} documentos`);
  
  // Comparar documento por documento
  const comparisons = [];
  
  for (const firebaseDoc of firebaseDocs) {
    const supabaseDoc = supabaseDocs?.find(d => {
      // Intentar match por ID o por campo único (sku, codigoUnico, etc.)
      if (d.id === firebaseDoc.id) return true;
      if (firebaseDoc.sku && d.sku === firebaseDoc.sku) return true;
      if (firebaseDoc.codigoUnico && d.codigo_unico === firebaseDoc.codigoUnico) return true;
      return false;
    });
    
    if (!supabaseDoc) {
      comparisons.push({
        id: firebaseDoc.id,
        status: 'missing_in_supabase',
        differences: [{ path: 'document', firebase: 'EXISTS', supabase: 'MISSING' }]
      });
      continue;
    }
    
    const differences = compareObjects(firebaseDoc, supabaseDoc);
    
    comparisons.push({
      id: firebaseDoc.id,
      status: differences.length === 0 ? 'match' : 'different',
      differences
    });
  }
  
  // Mostrar resultados
  const matches = comparisons.filter(c => c.status === 'match').length;
  const different = comparisons.filter(c => c.status === 'different').length;
  const missing = comparisons.filter(c => c.status === 'missing_in_supabase').length;
  
  logger.info(`\n📊 Resultados:`);
  logger.info(`  ✅ Coinciden: ${matches}`);
  logger.info(`  ⚠️  Diferentes: ${different}`);
  logger.info(`  ❌ Faltantes en Supabase: ${missing}`);
  
  // Mostrar diferencias detalladas
  if (different > 0 || missing > 0) {
    logger.warn('\n⚠️  Diferencias encontradas:');
    comparisons
      .filter(c => c.status !== 'match')
      .forEach(comp => {
        logger.warn(`\n  Documento: ${comp.id}`);
        comp.differences.slice(0, 5).forEach(diff => {
          logger.warn(`    ${diff.path}:`);
          logger.warn(`      Firebase: ${JSON.stringify(diff.firebase)}`);
          logger.warn(`      Supabase: ${JSON.stringify(diff.supabase)}`);
        });
        if (comp.differences.length > 5) {
          logger.warn(`    ... y ${comp.differences.length - 5} diferencias más`);
        }
      });
  }
  
  return {
    collection: collectionName,
    total: comparisons.length,
    matches,
    different,
    missing,
    comparisons
  };
}

async function main() {
  const args = process.argv.slice(2);
  const collectionArg = args.find(arg => arg.startsWith('--collection'));
  const limitArg = args.find(arg => arg.startsWith('--limit'));
  
  const collectionName = collectionArg ? collectionArg.split('=')[1] : null;
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
  
  if (!collectionName) {
    logger.error('❌ Debes especificar --collection=nombre');
    logger.info('Colecciones disponibles:', Object.keys(COLLECTION_MAP).join(', '));
    process.exit(1);
  }
  
  const result = await compareCollection(collectionName, limit);
  
  // Guardar resultados
  if (result) {
    const outputFile = path.join(__dirname, '../logs', `compare-${collectionName}-${Date.now()}.json`);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');
    logger.info(`\n📄 Resultados guardados en: ${outputFile}`);
  }
  
  process.exit(0);
}

main().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

