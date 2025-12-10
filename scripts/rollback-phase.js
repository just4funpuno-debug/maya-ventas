/**
 * Script de Rollback por Fase
 * Fase 0.3: Permite revertir cambios de una fase específica
 * 
 * Uso: node scripts/rollback-phase.js --phase 1
 */

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

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de fases a tablas/operaciones
const PHASE_ROLLBACK = {
  1: {
    name: 'Datos Base',
    tables: ['mis_numeros', 'team_messages'],
    description: 'Elimina tablas de datos no críticos'
  },
  2: {
    name: 'Usuarios',
    tables: ['users'],
    description: 'Elimina tabla de usuarios (NO elimina auth)',
    warning: '⚠️  Esto NO elimina usuarios de Supabase Auth'
  },
  3: {
    name: 'Productos',
    tables: ['products'],
    description: 'Elimina tabla de productos'
  },
  4: {
    name: 'Stock',
    tables: ['city_stock'],
    description: 'Elimina tabla de stock por ciudad',
    warning: '⚠️  CRÍTICO: Esto elimina todo el stock migrado'
  },
  5: {
    name: 'Ventas',
    tables: ['sales'],
    description: 'Elimina tabla de ventas',
    warning: '⚠️  CRÍTICO: Esto elimina todas las ventas migradas'
  },
  6: {
    name: 'Despachos',
    tables: ['dispatches'],
    description: 'Elimina tabla de despachos'
  }
};

async function rollbackPhase(phaseNumber) {
  const phase = PHASE_ROLLBACK[phaseNumber];
  
  if (!phase) {
    logger.error(`❌ Fase ${phaseNumber} no encontrada`);
    logger.info('Fases disponibles:', Object.keys(PHASE_ROLLBACK).join(', '));
    return false;
  }
  
  logger.warn(`\n⚠️  ROLLBACK: Fase ${phaseNumber} - ${phase.name}`);
  logger.warn(`   ${phase.description}`);
  if (phase.warning) {
    logger.warn(`   ${phase.warning}`);
  }
  
  logger.warn(`\n   Tablas a eliminar: ${phase.tables.join(', ')}`);
  logger.warn(`\n   ¿Estás seguro? Esto NO se puede deshacer.`);
  
  // En producción, aquí pedirías confirmación
  // Por ahora, solo mostramos qué se haría
  
  const results = [];
  
  for (const table of phase.tables) {
    try {
      logger.info(`\n🗑️  Eliminando tabla: ${table}...`);
      
      // Intentar eliminar todos los registros primero
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (trick)
      
      if (deleteError) {
        // Si falla, intentar truncar (requiere permisos especiales)
        logger.warn(`   No se pudo eliminar registros: ${deleteError.message}`);
        logger.warn(`   Nota: Puede requerir ejecutar TRUNCATE manualmente en Supabase SQL Editor`);
      } else {
        logger.info(`   ✅ Registros eliminados de ${table}`);
      }
      
      results.push({ table, success: !deleteError, error: deleteError?.message });
    } catch (error) {
      logger.error(`   ❌ Error eliminando ${table}:`, error.message);
      results.push({ table, success: false, error: error.message });
    }
  }
  
  // Resumen
  const success = results.filter(r => r.success).length;
  const total = results.length;
  
  logger.info(`\n📊 Resultado: ${success}/${total} tablas procesadas`);
  
  if (success < total) {
    logger.warn('\n⚠️  Algunas tablas no se pudieron eliminar completamente.');
    logger.warn('   Puedes eliminarlas manualmente desde Supabase SQL Editor:');
    results.filter(r => !r.success).forEach(r => {
      logger.warn(`   DROP TABLE IF EXISTS ${r.table} CASCADE;`);
    });
  }
  
  return success === total;
}

async function main() {
  const args = process.argv.slice(2);
  const phaseArg = args.find(arg => arg.startsWith('--phase'));
  const confirmArg = args.find(arg => arg === '--confirm');
  
  if (!phaseArg) {
    logger.error('❌ Debes especificar --phase=numero');
    logger.info('\nFases disponibles:');
    Object.entries(PHASE_ROLLBACK).forEach(([num, phase]) => {
      logger.info(`  ${num}: ${phase.name} - ${phase.description}`);
    });
    process.exit(1);
  }
  
  const phaseNumber = parseInt(phaseArg.split('=')[1]);
  
  if (!confirmArg) {
    logger.warn('\n⚠️  MODO SIMULACIÓN (no se eliminará nada)');
    logger.warn('   Para ejecutar realmente, agrega --confirm');
    logger.warn('   Ejemplo: node scripts/rollback-phase.js --phase=1 --confirm');
    
    const phase = PHASE_ROLLBACK[phaseNumber];
    if (phase) {
      logger.info(`\n📋 Operaciones que se realizarían:`);
      phase.tables.forEach(table => {
        logger.info(`  - TRUNCATE TABLE ${table} CASCADE;`);
      });
    }
    
    process.exit(0);
  }
  
  // Ejecutar rollback
  const success = await rollbackPhase(phaseNumber);
  
  if (success) {
    logger.info('\n✅ Rollback completado');
  } else {
    logger.error('\n❌ Rollback incompleto. Revisa los errores arriba.');
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

