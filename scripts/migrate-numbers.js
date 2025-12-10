/**
 * Script de Migración: Numbers (Contactos)
 * Fase 1.1: Migra colección 'numbers' de Firebase a Supabase
 * 
 * Uso: node scripts/migrate-numbers.js
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
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

async function migrateNumbers() {
  logger.phaseStart('Migración de Numbers', '1.1');
  
  try {
    // 1. Leer todos los documentos de Firebase
    logger.info('📖 Leyendo documentos de Firebase...');
    const snapshot = await db.collection('numbers').get();
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
        // Verificar si el SKU existe en products (si no, poner null para evitar foreign key error)
        let sku = doc.sku || null;
        if (sku) {
          const { data: product } = await supabase
            .from('products')
            .select('sku')
            .eq('sku', sku)
            .single();
          
          if (!product) {
            logger.warn(`  ⚠️  SKU ${sku} no existe en products, poniendo null`);
            sku = null;
          }
        }
        
        // Transformar datos
        const supabaseData = {
          // No incluir id, dejar que Supabase genere uno nuevo
          sku: sku,
          email: doc.email || null,
          celular: doc.celular || null,
          caduca: doc.caduca || null,
          created_at: convertTimestamp(doc.createdAt) || new Date().toISOString()
        };
        
        // Eliminar campos undefined/null innecesarios
        Object.keys(supabaseData).forEach(key => {
          if (supabaseData[key] === undefined) {
            delete supabaseData[key];
          }
        });
        
        // Insertar en Supabase
        const { error } = await supabase
          .from('mis_numeros')
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
    
    logger.subphaseEnd('Migración de Numbers', '1.1');
    
    return { migrated, errors, total: firebaseDocs.length };
  } catch (error) {
    logger.error('❌ Error fatal en migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateNumbers()
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

