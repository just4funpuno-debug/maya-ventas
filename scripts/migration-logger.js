/**
 * Logger Estructurado para Migración
 * Fase 0.3: Sistema de logging para todas las fases de migración
 * 
 * Uso:
 *   import { logger } from './migration-logger.js';
 *   logger.info('Mensaje', { data });
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, `migration-${new Date().toISOString().split('T')[0]}.log`);

// Asegurar que el directorio existe
await fs.mkdir(LOG_DIR, { recursive: true });

const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class MigrationLogger {
  constructor() {
    this.logs = [];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    
    return logEntry;
  }

  async writeToFile(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(LOG_FILE, line, 'utf8');
    } catch (error) {
      console.error('Error escribiendo al log:', error);
    }
  }

  async log(level, message, data = null) {
    const entry = this.formatMessage(level, message, data);
    this.logs.push(entry);
    
    // Escribir a archivo
    await this.writeToFile(entry);
    
    // También mostrar en consola con colores
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m'
    };
    
    const color = colors[level] || '';
    const reset = colors.RESET;
    const prefix = `[${level}]`;
    
    if (data) {
      console.log(`${color}${prefix}${reset} ${message}`, data);
    } else {
      console.log(`${color}${prefix}${reset} ${message}`);
    }
  }

  debug(message, data) {
    return this.log('DEBUG', message, data);
  }

  info(message, data) {
    return this.log('INFO', message, data);
  }

  warn(message, data) {
    return this.log('WARN', message, data);
  }

  error(message, data) {
    return this.log('ERROR', message, data);
  }

  // Métodos especiales para fases
  phaseStart(phaseName, phaseNumber) {
    return this.info(`🚀 Iniciando Fase ${phaseNumber}: ${phaseName}`, { phase: phaseNumber, name: phaseName });
  }

  phaseEnd(phaseName, phaseNumber, results) {
    return this.info(`✅ Fase ${phaseNumber} completada: ${phaseName}`, { phase: phaseNumber, name: phaseName, results });
  }

  subphaseStart(subphaseName, subphaseNumber) {
    return this.info(`  📍 Subfase ${subphaseNumber}: ${subphaseName}`, { subphase: subphaseNumber, name: subphaseName });
  }

  subphaseEnd(subphaseName, subphaseNumber) {
    return this.info(`  ✅ Subfase ${subphaseNumber} completada: ${subphaseName}`, { subphase: subphaseNumber, name: subphaseName });
  }

  validation(collection, firebaseCount, supabaseCount, match) {
    const status = match ? '✅' : '❌';
    const message = `${status} Validación ${collection}: Firebase=${firebaseCount}, Supabase=${supabaseCount}`;
    if (match) {
      return this.info(message, { collection, firebaseCount, supabaseCount });
    } else {
      return this.error(message, { collection, firebaseCount, supabaseCount });
    }
  }

  // Exportar logs
  async exportLogs(outputPath) {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    this.info(`📄 Logs exportados a: ${outputPath}`);
  }

  getLogs() {
    return this.logs;
  }
}

export const logger = new MigrationLogger();



