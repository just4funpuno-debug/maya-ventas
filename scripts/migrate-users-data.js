/**
 * Script de Migración: Datos de Usuarios
 * Fase 2.1: Migra colección 'users' de Firestore a Supabase (solo datos, sin auth)
 * 
 * Uso: node scripts/migrate-users-data.js
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
const auth = admin.auth();

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

async function migrateUsersData() {
  logger.phaseStart('Migración de Datos de Usuarios', '2.1');
  
  try {
    // 1. Leer todos los documentos de Firebase
    logger.info('📖 Leyendo documentos de Firebase...');
    const snapshot = await db.collection('users').get();
    const firebaseDocs = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      firebaseDocs.push({
        firebaseId: doc.id, // Guardar ID de Firebase para referencia
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
        // Obtener email del usuario en Firebase Auth
        let email = null;
        let firebaseAuthUser = null;
        try {
          firebaseAuthUser = await auth.getUser(doc.firebaseId);
          email = firebaseAuthUser.email;
        } catch (authErr) {
          logger.warn(`  ⚠️  Usuario ${doc.firebaseId} no encontrado en Firebase Auth: ${authErr.message}`);
        }
        
        // Extraer username del email (quitar @mayalife.shop)
        let username = doc.username || '';
        if (email && email.includes('@mayalife.shop')) {
          username = email.replace('@mayalife.shop', '');
        }
        
        // Transformar datos
        const supabaseData = {
          // No incluir id, dejar que Supabase genere uno nuevo
          username: username || `user_${doc.firebaseId.substring(0, 8)}`,
          password: 'TEMPORAL_CHANGE_ME', // Contraseña temporal, debe cambiarse
          nombre: doc.nombre || '',
          apellidos: doc.apellidos || '',
          celular: doc.celular || null,
          rol: (doc.rol === 'admin' || doc.rol === 'seller') ? doc.rol : 'seller',
          grupo: doc.grupo || null,
          fecha_ingreso: convertDate(doc.fechaIngreso || doc.fecha_ingreso) || new Date().toISOString().split('T')[0],
          sueldo: Number(doc.sueldo || 0) || 0,
          dia_pago: (doc.diaPago || doc.dia_pago) ? Number(doc.diaPago || doc.dia_pago) : null,
          created_at: convertTimestamp(doc.createdAt || doc.created_at) || new Date().toISOString()
        };
        
        // Validar dia_pago
        if (supabaseData.dia_pago && (supabaseData.dia_pago < 1 || supabaseData.dia_pago > 31)) {
          logger.warn(`  ⚠️  dia_pago inválido para ${username}, poniendo null`);
          supabaseData.dia_pago = null;
        }
        
        // Eliminar campos undefined
        Object.keys(supabaseData).forEach(key => {
          if (supabaseData[key] === undefined) {
            delete supabaseData[key];
          }
        });
        
        // Insertar en Supabase
        const { data: insertedData, error } = await supabase
          .from('users')
          .insert(supabaseData)
          .select()
          .single();
        
        if (error) {
          // Si es error de duplicado (username), intentar actualizar
          if (error.code === '23505') { // Unique violation
            logger.warn(`  ⚠️  Usuario ${username} ya existe, actualizando...`);
            const { error: updateError } = await supabase
              .from('users')
              .update(supabaseData)
              .eq('username', username);
            
            if (updateError) {
              logger.error(`  ❌ Error actualizando ${username}:`, updateError.message);
              errors++;
            } else {
              migrated++;
              logger.info(`  ✅ Actualizado: ${username}`);
            }
          } else {
            logger.error(`  ❌ Error insertando ${username}:`, error.message);
            errors++;
          }
        } else {
          migrated++;
          logger.info(`  ✅ Migrado: ${username} (ID: ${insertedData?.id})`);
        }
      } catch (err) {
        logger.error(`  ❌ Error procesando usuario ${doc.firebaseId}:`, err.message);
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
    logger.warn('\n⚠️  IMPORTANTE: Todos los usuarios tienen contraseña temporal "TEMPORAL_CHANGE_ME"');
    logger.warn('   Deben cambiar su contraseña o usar el script de migración de Auth');
    
    if (migrated === firebaseDocs.length) {
      logger.info('\n✅ ¡Migración completada sin errores!');
    } else {
      logger.warn(`\n⚠️  Migración completada con ${errors} error(es)`);
    }
    
    logger.subphaseEnd('Migración de Datos de Usuarios', '2.1');
    
    return { migrated, errors, total: firebaseDocs.length };
  } catch (error) {
    logger.error('❌ Error fatal en migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateUsersData()
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



