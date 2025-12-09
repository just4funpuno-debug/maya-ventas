/**
 * Cliente Supabase
 * Fase 7.1: Cliente Supabase para reemplazar Firebase
 * 
 * Configuración del cliente Supabase con variables de entorno
 * En producción, si no hay Supabase configurado, crea un cliente dummy
 * (la aplicación debería usar Firebase en ese caso)
 */

import { createClient } from '@supabase/supabase-js';

// Detectar entorno - verificar tanto PROD como Vercel deployment
const isProduction = typeof import.meta !== 'undefined' && import.meta.env 
  ? (import.meta.env.PROD === true || import.meta.env.MODE === 'production')
  : (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1');

// Variables de entorno (compatible con Vite y Node.js)
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY;

// Crear cliente Supabase según disponibilidad
let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  if (isProduction) {
    // En producción sin Supabase: crear cliente dummy que no intente conexiones reales
    console.log('ℹ️  Producción: Variables de Supabase no configuradas. El código usará Firebase automáticamente para datos.');
    
    // Crear cliente dummy completo que NO intenta conexiones reales
    // Este mock debe cubrir todos los métodos encadenados posibles
    const createDummyQuery = () => {
      const dummyResult = Promise.resolve({ data: [], error: { message: 'Supabase no disponible en producción - usar Firebase' } });
      const dummySingle = Promise.resolve({ data: null, error: { message: 'Supabase no disponible en producción - usar Firebase' } });
      
      // Objeto que retorna a sí mismo para permitir encadenamiento infinito
      const chainable = () => chainableObj;
      const chainableObj = {
        eq: chainable,
        in: chainable,
        is: chainable,
        neq: chainable,
        gt: chainable,
        gte: chainable,
        lt: chainable,
        lte: chainable,
        like: chainable,
        ilike: chainable,
        contains: chainable,
        order: chainable,
        limit: chainable,
        range: chainable,
        select: chainable,
        maybeSingle: () => dummySingle,
        single: () => dummySingle,
        then: (callback) => {
          dummyResult.then(result => callback(result));
          return dummyResult;
        }
      };
      
      return chainableObj;
    };
    
    supabaseClient = {
      from: (table) => {
        // Silenciar llamadas a Supabase en producción sin config
        if (typeof console !== 'undefined' && console.warn) {
          // Solo loguear una vez por tabla para no saturar la consola
          if (!supabaseClient._warnedTables) {
            supabaseClient._warnedTables = new Set();
          }
          if (!supabaseClient._warnedTables.has(table)) {
            console.warn(`[Supabase Dummy] Llamada a tabla '${table}' ignorada - usar Firebase en producción`);
            supabaseClient._warnedTables.add(table);
          }
        }
        
        return {
          select: (columns) => createDummyQuery(),
          insert: (data) => Promise.resolve({ data: null, error: { message: 'Supabase no disponible - usar Firebase' } }),
          update: (data) => ({
            eq: () => Promise.resolve({ data: null, error: { message: 'Supabase no disponible - usar Firebase' } }),
            in: () => Promise.resolve({ data: null, error: { message: 'Supabase no disponible - usar Firebase' } })
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: { message: 'Supabase no disponible - usar Firebase' } }),
            in: () => Promise.resolve({ error: { message: 'Supabase no disponible - usar Firebase' } })
          }),
          upsert: (data) => Promise.resolve({ data: null, error: { message: 'Supabase no disponible - usar Firebase' } })
        };
      },
      channel: (name) => {
        // Canal dummy que no intenta conexiones WebSocket
        return {
          on: () => ({
            subscribe: () => ({ unsubscribe: () => {} })
          }),
          subscribe: () => ({ unsubscribe: () => {} })
        };
      },
      rpc: (func, params) => Promise.resolve({ data: null, error: { message: 'RPC no disponible - usar Firebase' } }),
      auth: {
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Usar authProvider para autenticación' } }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ unsubscribe: () => {} })
      },
      _isDummy: true // Flag para identificar que es un cliente dummy
    };
  } else {
    // En desarrollo: lanzar error
    const error = new Error('Supabase no configurado. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    console.error('❌ Variables de entorno de Supabase no configuradas');
    console.error('   Necesitas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    throw error;
  }
} else {
  // Crear cliente Supabase normal
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
}

export const supabase = supabaseClient;

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
