/**
 * Cliente Supabase
 * Fase 7.1: Cliente Supabase para reemplazar Firebase
 * 
 * Configuración del cliente Supabase con variables de entorno
 */

import { createClient } from '@supabase/supabase-js';

// Variables de entorno (compatible con Vite y Node.js)
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY;

// Nota: La validación completa de variables de entorno se hace en main.jsx
// Aquí solo validamos que existan antes de crear el cliente
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Supabase no configurado. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.error('   Necesitas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  throw error;
}

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Helper: Verificar conexión a Supabase
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('almacen_central')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Error conectando a Supabase:', error);
      return { success: false, error };
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    return { success: true, data };
  } catch (err) {
    console.error('❌ Error fatal conectando a Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Helper: Obtener tabla completa (para migración gradual)
 */
export async function getTable(tableName, filters = {}) {
  try {
    let query = supabase.from(tableName).select('*');
    
    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ Error obteniendo ${tableName}:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`❌ Error fatal obteniendo ${tableName}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Helper: Suscripción en tiempo real (reemplaza onSnapshot)
 */
export function subscribeTable(tableName, callback, filters = {}) {
  let query = supabase
    .channel(`${tableName}_changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: tableName 
      }, 
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    query.unsubscribe();
  };
}

/**
 * Helper: Insertar registro
 */
export async function insertRecord(tableName, record) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error insertando en ${tableName}:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`❌ Error fatal insertando en ${tableName}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Helper: Actualizar registro
 */
export async function updateRecord(tableName, id, updates) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error actualizando ${tableName}:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`❌ Error fatal actualizando ${tableName}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Helper: Eliminar registro
 */
export async function deleteRecord(tableName, id) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`❌ Error eliminando de ${tableName}:`, error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error(`❌ Error fatal eliminando de ${tableName}:`, err);
    return { success: false, error: err };
  }
}

// Exportar por defecto el cliente
export default supabase;
