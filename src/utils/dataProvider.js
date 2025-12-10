/**
 * Proveedor de Datos con Supabase
 * 
 * Usa Supabase Database en todos los entornos (desarrollo y producción).
 * Migración completa desde Firebase a Supabase completada.
 */

/**
 * Determina qué proveedor de datos usar
 * @returns {'supabase'} - Siempre retorna Supabase
 */
export function getDataProvider() {
  // Siempre usar Supabase en todos los entornos
  return 'supabase';
}

/**
 * Obtener el cliente de datos (Supabase)
 * @returns {Promise<object>} Cliente de Supabase
 */
export async function getDataClient() {
  const { supabase } = await import('../supabaseClient');
  return { type: 'supabase', client: supabase };
}

/**
 * Suscripción genérica a una colección/tabla (usa Supabase)
 * @param {string} collectionName - Nombre de la colección/tabla
 * @param {function} callback - Función que recibe el array de datos
 * @param {object} options - Opciones adicionales (filters, orderBy, etc.)
 * @returns {function} - Función para desuscribirse
 */
export async function subscribeCollection(collectionName, callback, options = {}) {
  const { subscribeCollection: supabaseSubscribe } = await import('../supabaseUsers');
  return supabaseSubscribe(collectionName, callback, options);
}

/**
 * Obtener todos los documentos de una colección/tabla (usa Supabase)
 * @param {string} collectionName - Nombre de la colección/tabla
 * @param {object} options - Opciones adicionales (filters, orderBy, etc.)
 * @returns {Promise<Array>} Array de documentos
 */
export async function getAllDocuments(collectionName, options = {}) {
  const { supabase } = await import('../supabaseClient');
  
  // Mapeo de colecciones de Firebase a tablas de Supabase
  const tableMap = {
    'almacenCentral': 'almacen_central',
    'cityStock': 'city_stock',
    'despachos': 'dispatches',
    'despachosHistorial': 'dispatches',
    'numbers': 'mis_numeros',
    'team_messages': 'team_messages',
    'users': 'users',
    'VentasSinConfirmar': 'ventas',
    'ventasporcobrar': 'ventas',
    'ventashistorico': 'ventas',
    'GenerarDeposito': 'generar_deposito',
    'grupos': 'grupos'
  };
  
  const tableName = tableMap[collectionName] || collectionName;
  let query = supabase.from(tableName).select('*');
  
  // Aplicar filtros
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }
  
  // Aplicar ordenamiento
  if (options.orderBy) {
    query = query.order(
      options.orderBy.column,
      { ascending: options.orderBy.ascending !== false }
    );
  }
  
  // Aplicar límite
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`[getAllDocuments] Error obteniendo ${collectionName}:`, error);
    return [];
  }
  
  return data || [];
}

/**
 * Suscripción específica a usuarios (wrapper para compatibilidad)
 * @param {function} callback - Función que recibe el array de usuarios
 * @returns {function} - Función para desuscribirse
 */
export async function subscribeUsers(callback) {
  return subscribeCollection('users', callback);
}

/**
 * Obtener todos los usuarios (usa Supabase)
 * @returns {Promise<Array>} Array de usuarios
 */
export async function getAllUsers() {
  const { getAllUsers: supabaseGetAllUsers } = await import('../supabaseUsers');
  return await supabaseGetAllUsers();
}

