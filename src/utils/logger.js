/**
 * Logger condicional - Solo muestra logs en desarrollo
 * 
 * En producción, los logs se eliminan completamente para mejorar el rendimiento
 * y evitar exponer información sensible en la consola del navegador.
 * 
 * Uso:
 *   import { log, warn, error, info, debug } from './utils/logger';
 *   
 *   log('Mensaje informativo');
 *   warn('Advertencia');
 *   error('Error crítico'); // Siempre se muestra, incluso en producción
 *   info('Información');
 *   debug('Debug'); // Solo en desarrollo
 */

const isDev = import.meta.env.DEV;

/**
 * Log normal - Solo en desarrollo
 */
export function log(...args) {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * Warning - Solo en desarrollo
 */
export function warn(...args) {
  if (isDev) {
    console.warn(...args);
  }
}

/**
 * Error - Siempre se muestra (incluso en producción)
 * Los errores son críticos y deben ser visibles para debugging en producción
 */
export function error(...args) {
  console.error(...args);
}

/**
 * Info - Solo en desarrollo
 */
export function info(...args) {
  if (isDev) {
    console.info(...args);
  }
}

/**
 * Debug - Solo en desarrollo
 */
export function debug(...args) {
  if (isDev) {
    console.debug(...args);
  }
}

/**
 * Log con contexto - Útil para debugging con contexto adicional
 * Solo en desarrollo
 */
export function logWithContext(context, ...args) {
  if (isDev) {
    console.log(`[${context}]`, ...args);
  }
}

