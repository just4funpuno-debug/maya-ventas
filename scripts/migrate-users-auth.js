/**
 * Script de Migración: Usuarios de Firebase Auth a Supabase Auth
 * Fase 2.2: Migra usuarios de Firebase Auth a Supabase Auth
 * 
 * IMPORTANTE: Este script requiere que los usuarios cambien su contraseña
 * porque Firebase Auth no permite leer contraseñas.
 * 
 * Uso: node scripts/migrate-users-auth.js
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
const auth = admin.auth();

// Inicializar Supabase (necesitamos service_role key para crear usuarios)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('❌ Variables de entorno de Supabase no configuradas');
  logger.error('   Necesitas: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  logger.error('   Obtén SERVICE_ROLE_KEY desde Supabase Dashboard → Settings → API');
  process.exit(1);
}

// Usar service_role para poder crear usuarios
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateUsersAuth() {
  logger.phaseStart('Migración de Usuarios a Supabase Auth', '2.2');
  
  try {
    // 1. Listar todos los usuarios de Firebase Auth
    logger.info('📖 Listando usuarios de Firebase Auth...');
    const listUsersResult = await auth.listUsers();
    const firebaseUsers = listUsersResult.users;
    
    logger.info(`📊 Usuarios encontrados en Firebase Auth: ${firebaseUsers.length}`);
    
    if (firebaseUsers.length === 0) {
      logger.warn('⚠️  No hay usuarios para migrar');
      return { migrated: 0, errors: 0, needsPasswordReset: [] };
    }
    
    // 2. Obtener usuarios de Supabase (datos)
    logger.info('📖 Obteniendo usuarios de Supabase...');
    const { data: supabaseUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, username');
    
    if (fetchError) {
      logger.error('❌ Error obteniendo usuarios de Supabase:', fetchError.message);
      throw fetchError;
    }
    
    logger.info(`📊 Usuarios en Supabase (datos): ${supabaseUsers?.length || 0}`);
    
    // 3. Migrar usuarios a Supabase Auth
    logger.info('🔄 Migrando a Supabase Auth...');
    let migrated = 0;
    let errors = 0;
    const needsPasswordReset = [];
    
    for (const firebaseUser of firebaseUsers) {
      try {
        // Extraer username del email
        let username = '';
        if (firebaseUser.email && firebaseUser.email.includes('@mayalife.shop')) {
          username = firebaseUser.email.replace('@mayalife.shop', '');
        } else {
          // Si no tiene el formato esperado, usar el UID como username
          username = `user_${firebaseUser.uid.substring(0, 8)}`;
        }
        
        // Buscar usuario correspondiente en Supabase (datos)
        let supabaseUserData = supabaseUsers?.find(u => u.username === username);
        
        // Si no existe en tabla users, crearlo
        if (!supabaseUserData) {
          logger.warn(`  ⚠️  Usuario ${username} no encontrado en tabla users, creándolo...`);
          
          // Crear usuario en tabla users con datos mínimos
          const newUserData = {
            username: username,
            password: 'TEMPORAL_CHANGE_ME', // Contraseña temporal
            nombre: firebaseUser.displayName?.split(' ')[0] || username,
            apellidos: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            rol: 'seller', // Default
            fecha_ingreso: new Date().toISOString().split('T')[0]
          };
          
          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert(newUserData)
            .select()
            .single();
          
          if (createError) {
            logger.error(`  ❌ Error creando usuario ${username} en tabla users:`, createError.message);
            errors++;
            continue;
          }
          
          supabaseUserData = createdUser;
          logger.info(`  ✅ Usuario ${username} creado en tabla users`);
        }
        
        // Crear usuario en Supabase Auth
        // NOTA: No podemos obtener la contraseña de Firebase, así que creamos con contraseña temporal
        const tempPassword = `Temp${Date.now()}${Math.random().toString(36).substring(7)}`;
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: firebaseUser.email || `${username}@mayalife.shop`,
          password: tempPassword,
          email_confirm: true, // Confirmar email automáticamente
          user_metadata: {
            firebase_uid: firebaseUser.uid,
            username: username
          }
        });
        
        if (authError) {
          // Si el usuario ya existe, considerarlo como migrado exitosamente
          if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
            logger.warn(`  ⚠️  Usuario ${username} ya existe en Supabase Auth (considerado migrado)`);
            migrated++;
            needsPasswordReset.push({
              username,
              email: firebaseUser.email || `${username}@mayalife.shop`,
              reason: 'Usuario ya existía en Supabase Auth, necesita reset de contraseña si no puede iniciar sesión'
            });
          } else {
            logger.error(`  ❌ Error creando usuario ${username} en Supabase Auth:`, authError.message);
            errors++;
          }
        } else {
          // Vincular auth user con tabla users
          // Nota: Supabase Auth usa su propio sistema de IDs, no podemos vincular directamente
          // Pero podemos usar el email como referencia
          migrated++;
          needsPasswordReset.push({
            username,
            email: firebaseUser.email || `${username}@mayalife.shop`,
            tempPassword: tempPassword,
            reason: 'Contraseña temporal generada, usuario debe cambiarla'
          });
          logger.info(`  ✅ Creado en Supabase Auth: ${username}`);
        }
      } catch (err) {
        logger.error(`  ❌ Error procesando usuario ${firebaseUser.uid}:`, err.message);
        errors++;
      }
    }
    
    // 4. Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 RESUMEN DE MIGRACIÓN');
    logger.info('='.repeat(60));
    logger.info(`✅ Migrados exitosamente: ${migrated}`);
    logger.info(`❌ Errores: ${errors}`);
    logger.info(`📊 Total procesados: ${firebaseUsers.length}`);
    
    if (needsPasswordReset.length > 0) {
      logger.warn('\n⚠️  USUARIOS QUE NECESITAN CAMBIAR CONTRASEÑA:');
      needsPasswordReset.forEach(user => {
        if (user.tempPassword) {
          logger.warn(`  - ${user.username} (${user.email})`);
          logger.warn(`    Contraseña temporal: ${user.tempPassword}`);
        } else {
          logger.warn(`  - ${user.username} (${user.email})`);
          logger.warn(`    ${user.reason}`);
        }
      });
      logger.warn('\n   Estos usuarios deben usar "Olvidé mi contraseña" o cambiar su contraseña al iniciar sesión.');
    }
    
    if (migrated === firebaseUsers.length) {
      logger.info('\n✅ ¡Migración completada sin errores!');
    } else {
      logger.warn(`\n⚠️  Migración completada con ${errors} error(es)`);
    }
    
    logger.subphaseEnd('Migración de Usuarios a Supabase Auth', '2.2');
    
    return { migrated, errors, total: firebaseUsers.length, needsPasswordReset };
  } catch (error) {
    logger.error('❌ Error fatal en migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateUsersAuth()
  .then(result => {
    // Guardar lista de usuarios que necesitan reset
    if (result.needsPasswordReset && result.needsPasswordReset.length > 0) {
      const outputFile = path.join(__dirname, '../logs', `users-need-password-reset-${Date.now()}.json`);
      fs.mkdir(path.dirname(outputFile), { recursive: true }).then(() => {
        fs.writeFile(outputFile, JSON.stringify(result.needsPasswordReset, null, 2), 'utf8');
        logger.info(`\n📄 Lista de usuarios guardada en: ${outputFile}`);
      });
    }
    
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

