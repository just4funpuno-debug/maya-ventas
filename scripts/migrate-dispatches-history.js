/**
 * Script de Migración: Despachos Historial
 * Fase 1.3: Migra colección 'despachosHistorial' de Firebase a Supabase
 * 
 * Uso: node scripts/migrate-dispatches-history.js
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
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para convertir Timestamp a ISO string
function convertTimestamp(value) {
  if (value && typeof value === 'object' && value.toDate) {
    return value.toDate().toISOString();
  }
  return value;
}

// Función para convertir fecha
function convertDate(value) {
  if (value && typeof value === 'object' && value.toDate) {
    return value.toDate().toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
  }
  if (typeof value === 'string') {
    return value.split('T')[0]; // Si es ISO string, extraer solo fecha
  }
  return value;
}

async function migrateDispatchesHistory() {
  logger.phaseStart('Migración de Despachos Historial', '1.3');
  
  try {
    // 1. Leer todos los documentos de Firebase
    logger.info('📖 Leyendo documentos de Firebase...');
    const snapshot = await db.collection('despachosHistorial').get();
    const firebaseDocs = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      firebaseDocs.push({
        id: doc.id,
        ...data
      });
    });
    
    logger.info(`📊 Documentos encontrados en Firebase: ${firebaseDocs.length}`);
    
    if (firebaseDocs.length === 0) {
      logger.warn('⚠️  No hay documentos para migrar');
      return { migrated: 0, errors: 0 };
    }
    
    // 2. Transformar y migrar a Supabase
    logger.info('🔄 Migrando a Supabase...');
    let migrated = 0;
    let errors = 0;
    
    for (const doc of firebaseDocs) {
      try {
        // Transformar items (puede ser array o objeto)
        let items = doc.items || [];
        if (!Array.isArray(items)) {
          // Si es objeto, convertirlo a array
          items = Object.entries(items).map(([sku, cantidad]) => ({
            sku,
            cantidad: Number(cantidad) || 0
          }));
        }
        
        // Transformar datos
        // No incluir id, dejar que Supabase genere uno nuevo (Firebase IDs no son UUIDs)
        const supabaseData = {
          fecha: convertDate(doc.fecha) || new Date().toISOString().split('T')[0],
          ciudad: doc.ciudad || null,
          status: 'confirmado', // Historial siempre es confirmado
          items: items, // JSONB
          created_at: convertTimestamp(doc.createdAt) || new Date().toISOString(),
          confirmed_at: convertTimestamp(doc.confirmedAt || doc.createdAt) || new Date().toISOString()
        };
        
        // Eliminar campos undefined
        Object.keys(supabaseData).forEach(key => {
          if (supabaseData[key] === undefined) {
            delete supabaseData[key];
          }
        });
        
        // Insertar en Supabase
        const { error } = await supabase
          .from('dispatches')
          .insert(supabaseData);
        
        if (error) {
          logger.error(`  ❌ Error insertando documento de Firebase ${doc.id}:`, error.message);
          errors++;
        } else {
          migrated++;
        }
        
        // Log cada 5 documentos
        if (migrated % 5 === 0) {
          logger.info(`  ✅ Migrados: ${migrated}/${firebaseDocs.length}`);
        }
      } catch (err) {
        logger.error(`  ❌ Error procesando documento ${doc.id}:`, err.message);
        errors++;
      }
    }
    
    // 3. Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 RESUMEN DE MIGRACIÓN');
    logger.info('='.repeat(60));
    logger.info(`✅ Migrados exitosamente: ${migrated}`);
    logger.info(`❌ Errores: ${errors}`);
    logger.info(`📊 Total procesados: ${firebaseDocs.length}`);
    
    if (migrated === firebaseDocs.length) {
      logger.info('\n✅ ¡Migración completada sin errores!');
    } else {
      logger.warn(`\n⚠️  Migración completada con ${errors} error(es)`);
    }
    
    logger.subphaseEnd('Migración de Despachos Historial', '1.3');
    
    return { migrated, errors, total: firebaseDocs.length };
  } catch (error) {
    logger.error('❌ Error fatal en migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateDispatchesHistory()
  .then(result => {
    if (result.errors > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch(error => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

