/**
 * Cliente Supabase para Node.js (scripts de testing)
 * Versión compatible con Node.js que usa process.env en lugar de import.meta.env
 */

import { createClient } from '@supabase/supabase-js';

// Variables de entorno (para Node.js)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.error('   Necesitas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  throw new Error('Supabase no configurado. Verifica las variables de entorno.');
}

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;



