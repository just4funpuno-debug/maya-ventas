/**
 * Validación de Variables de Entorno
 * 
 * Valida que todas las variables de entorno requeridas estén configuradas
 * al inicio de la aplicación. Muestra errores claros si faltan variables.
 * 
 * Uso:
 *   import { validateEnv } from './utils/envValidation';
 *   validateEnv();
 */

import { error } from './logger';

/**
 * Variables de entorno requeridas
 * Nota: En producción (Vercel) puede usar Firebase en lugar de Supabase
 */
const REQUIRED_ENV_VARS = {
  // Supabase solo requerido en desarrollo
  // En producción, se puede usar Firebase
};

/**
 * Variables de entorno opcionales (con valores por defecto)
 */
const OPTIONAL_ENV_VARS = {
  VITE_CLOUDINARY_SIGNATURE_URL: '/api/cloudinary-signature'
};

/**
 * Obtener valor de variable de entorno (compatible con Vite y Node.js)
 */
function getEnvVar(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
}

/**
 * Validar variables de entorno requeridas
 * 
 * @returns {Object} { isValid: boolean, missing: string[], errors: string[] }
 */
export function validateEnv() {
  const missing = [];
  const errors = [];
  
  // En desarrollo, validar Supabase
  // En producción, permitir Firebase o Supabase
  if (isDev()) {
    // En desarrollo, Supabase es requerido
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      missing.push('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY');
      errors.push(`❌ VITE_SUPABASE_URL no está configurada. URL de Supabase (ej: https://xxx.supabase.co)`);
      errors.push(`❌ VITE_SUPABASE_ANON_KEY no está configurada. Clave anónima de Supabase`);
    }
  }
  
  // En producción, validar que al menos uno esté configurado
  if (isProd()) {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
    // Firebase no requiere variables de entorno adicionales (usa config hardcodeada)
    
    // Si no hay Supabase, Firebase debería estar disponible
    if (!supabaseUrl || !supabaseKey) {
      // No es error, simplemente se usará Firebase
      console.log('ℹ️  Producción: Usando Firebase Auth (Supabase no configurado)');
    }
  }
  
  // Validar variables requeridas adicionales (si las hay)
  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = getEnvVar(varName);
    
    if (!value || value.trim() === '') {
      missing.push(varName);
      errors.push(`❌ ${varName} no está configurada. ${description}`);
    }
  }
  
  // Mostrar errores si hay variables faltantes
  if (errors.length > 0) {
    const errorMessage = [
      '═══════════════════════════════════════════════════════════',
      '⚠️  ERROR: Variables de entorno faltantes',
      '═══════════════════════════════════════════════════════════',
      '',
      ...errors,
      '',
      'Para solucionar esto:',
      '1. Crea un archivo .env en la raíz del proyecto',
      '2. Agrega las siguientes variables:',
      '',
      ...missing.map(name => `${name}=tu_valor_aqui`),
      '',
      'Ejemplo de .env:',
      'VITE_SUPABASE_URL=https://xxx.supabase.co',
      'VITE_SUPABASE_ANON_KEY=tu_clave_aqui',
      '',
      '═══════════════════════════════════════════════════════════'
    ].join('\n');
    
    error(errorMessage);
    
    // En desarrollo, también mostrar en la UI si es posible
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      // Crear un elemento visible en la página para desarrollo
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc2626;
        color: white;
        padding: 1rem;
        z-index: 99999;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        max-height: 50vh;
        overflow-y: auto;
      `;
      errorDiv.textContent = errorMessage;
      document.body.prepend(errorDiv);
    }
    
    return {
      isValid: false,
      missing,
      errors
    };
  }
  
  // Validar formato de variables (opcional, pero útil)
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    errors.push(`⚠️  VITE_SUPABASE_URL parece tener un formato incorrecto: ${supabaseUrl}`);
  }
  
  if (errors.length > 0 && import.meta.env.DEV) {
    error('Advertencias de validación:', errors);
  }
  
  return {
    isValid: true,
    missing: [],
    errors: errors.length > 0 ? errors : []
  };
}

/**
 * Obtener valor de variable de entorno con fallback
 * 
 * @param {string} name - Nombre de la variable
 * @param {string} defaultValue - Valor por defecto si no existe
 * @returns {string} Valor de la variable o valor por defecto
 */
export function getEnv(name, defaultValue = '') {
  const value = getEnvVar(name);
  return value || defaultValue || OPTIONAL_ENV_VARS[name] || '';
}

/**
 * Verificar si estamos en desarrollo
 */
export function isDev() {
  return import.meta.env.DEV === true;
}

/**
 * Verificar si estamos en producción
 */
export function isProd() {
  return import.meta.env.PROD === true;
}

