/**
 * Proveedor de Datos Unificado
 * 
 * Detecta automáticamente el entorno y usa:
 * - Supabase en desarrollo (localhost)
 * - Firebase (Firestore) en producción (Vercel)
 * 
 * Esta capa de abstracción permite mantener ambos sistemas funcionando
 * durante la transición de Firebase a Supabase.
 */

import { isDev, isProd } from './envValidation';

/**
 * Determina qué proveedor de datos usar
 * @returns {'supabase' | 'firebase'}
 */
export function getDataProvider() {
  // Si estamos en desarrollo, usar Supabase
  if (isDev()) {
    return 'supabase';
  }
  
  // Si estamos en producción, usar Firebase
  if (isProd()) {
    return 'firebase';
  }
  
  // Por defecto, usar Supabase
  return 'supabase';
}

/**
 * Obtener el cliente de datos según el proveedor
 * @returns {Promise<object>} Cliente de Supabase o Firebase
 */
export async function getDataClient() {
  const provider = getDataProvider();
  
  if (provider === 'supabase') {
    const { supabase } = await import('../supabaseClient');
    return { type: 'supabase', client: supabase };
  } else {
    const { db } = await import('../_deprecated/firebase');
    return { type: 'firebase', client: db };
  }
}

/**
 * Suscripción genérica a una colección/tabla
 * @param {string} collectionName - Nombre de la colección/tabla
 * @param {function} callback - Función que recibe el array de datos
 * @param {object} options - Opciones adicionales (filters, orderBy, etc.)
 * @returns {function} - Función para desuscribirse
 */
export async function subscribeCollection(collectionName, callback, options = {}) {
  const provider = getDataProvider();
  
  if (provider === 'supabase') {
    // Usar Supabase
    const { subscribeCollection: supabaseSubscribe } = await import('../supabaseUsers');
    return supabaseSubscribe(collectionName, callback, options);
  } else {
    // Usar Firebase
    const { db } = await import('../_deprecated/firebase');
    const { collection, onSnapshot, query, where, orderBy, limit } = await import('firebase/firestore');
    
    const colRef = collection(db, collectionName);
    let firestoreQuery = colRef;
    
    // Aplicar filtros si existen
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          firestoreQuery = query(firestoreQuery, where(key, '==', value));
        }
      });
    }
    
    // Aplicar ordenamiento si existe
    if (options.orderBy) {
      firestoreQuery = query(
        firestoreQuery,
        orderBy(
          options.orderBy.column,
          options.orderBy.ascending !== false ? 'asc' : 'desc'
        )
      );
    }
    
    // Aplicar límite si existe
    if (options.limit) {
      firestoreQuery = query(firestoreQuery, limit(options.limit));
    }
    
    // Suscribirse a cambios
    return onSnapshot(firestoreQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(list);
    });
  }
}

/**
 * Obtener todos los documentos de una colección/tabla
 * @param {string} collectionName - Nombre de la colección/tabla
 * @param {object} options - Opciones adicionales (filters, orderBy, etc.)
 * @returns {Promise<Array>} Array de documentos
 */
export async function getAllDocuments(collectionName, options = {}) {
  const provider = getDataProvider();
  
  if (provider === 'supabase') {
    // Usar Supabase
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
  } else {
    // Usar Firebase
    const { db } = await import('../_deprecated/firebase');
    const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
    
    const colRef = collection(db, collectionName);
    let firestoreQuery = colRef;
    
    // Aplicar filtros
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          firestoreQuery = query(firestoreQuery, where(key, '==', value));
        }
      });
    }
    
    // Aplicar ordenamiento
    if (options.orderBy) {
      firestoreQuery = query(
        firestoreQuery,
        orderBy(
          options.orderBy.column,
          options.orderBy.ascending !== false ? 'asc' : 'desc'
        )
      );
    }
    
    // Aplicar límite
    if (options.limit) {
      firestoreQuery = query(firestoreQuery, limit(options.limit));
    }
    
    const snap = await getDocs(firestoreQuery);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
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
 * Obtener todos los usuarios
 * @returns {Promise<Array>} Array de usuarios
 */
export async function getAllUsers() {
  const provider = getDataProvider();
  
  if (provider === 'supabase') {
    const { getAllUsers: supabaseGetAllUsers } = await import('../supabaseUsers');
    return await supabaseGetAllUsers();
  } else {
    const { db } = await import('../_deprecated/firebase');
    const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
    
    const colRef = collection(db, 'users');
    const q = query(colRef, orderBy('nombre', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

