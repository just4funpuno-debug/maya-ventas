/**
 * Utilidades para manejar usuarios y suscripciones genéricas
 * Fase 7.4: Reemplazo de firestoreUsers.js
 * 
 * IMPORTANTE: Nunca guardar contraseñas aquí; sólo en Auth.
 * 
 * Este módulo ahora detecta automáticamente el entorno:
 * - Desarrollo (localhost): Usa Supabase
 * - Producción (Vercel): Usa Firebase
 */

import { isDev, isProd } from './utils/envValidation';
import { denormalizeCity } from './utils/cityUtils';

// Importar cliente según el entorno
let supabase = null;
let firebaseDb = null;

// Lazy loading de clientes
async function getSupabaseClient() {
  if (!supabase) {
    try {
      const { supabase: client } = await import('./supabaseClient.js');
      supabase = client;
    } catch (error) {
      console.warn('[getSupabaseClient] Error importando cliente Supabase:', error);
      return null;
    }
  }
  return supabase;
}

/**
 * Suscripción a Firebase Firestore (solo en producción)
 */
function subscribeCollectionFirebase(tableName, callback, options = {}) {
  let unsubscribeFn = null;
  
  // Importar Firebase dinámicamente - usar paths completamente dinámicos para evitar análisis estático
  // Construir paths en runtime para que Vite no pueda analizarlos estáticamente
  const baseDir = '../';
  const deprecated = '_deprecated';
  const firebaseFile = 'firebase';
  const firebaseMod = 'firebase';
  const firestoreMod = 'firestore';
  
  const firebasePath = `${baseDir}${deprecated}/${firebaseFile}`;
  const firestorePath = `${firebaseMod}/${firestoreMod}`;
  
  Promise.all([
    import(/* @vite-ignore */ firebasePath).catch(() => null),
    import(/* @vite-ignore */ firestorePath).catch(() => null)
  ]).then((results) => {
    if (!results[0] || !results[1]) {
      console.warn('[subscribeCollectionFirebase] Firebase no disponible');
      callback([]);
      return;
    }
    const [{ db }, firestore] = results;
    const { collection, onSnapshot, query, where, orderBy, limit } = firestore;
    const colRef = collection(db, tableName);
    let firestoreQuery = colRef;
    
    // Aplicar filtros específicos según el tipo de colección
    if (tableName === 'ventasporcobrar') {
      firestoreQuery = query(firestoreQuery, where('estadoEntrega', 'in', ['confirmado', 'entregada', 'cancelado']));
    } else if (tableName === 'VentasSinConfirmar') {
      firestoreQuery = query(firestoreQuery, where('estadoEntrega', '==', 'pendiente'));
    } else if (tableName === 'ventashistorico') {
      firestoreQuery = query(firestoreQuery, where('estadoEntrega', 'in', ['confirmado', 'entregada', 'cancelado']));
    } else if (tableName === 'despachos') {
      firestoreQuery = query(firestoreQuery, where('status', '==', 'pendiente'));
    } else if (tableName === 'despachosHistorial') {
      firestoreQuery = query(firestoreQuery, where('status', '==', 'confirmado'));
    }
    
    // Aplicar filtros adicionales
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
    
    // Suscribirse a cambios
    unsubscribeFn = onSnapshot(firestoreQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const normalized = normalizeData(tableName, list);
      callback(normalized);
    }, (error) => {
      console.error(`[subscribeCollectionFirebase] Error en ${tableName}:`, error);
      callback([]);
    });
  }).catch(error => {
    console.error(`[subscribeCollectionFirebase] Error inicializando Firebase:`, error);
    callback([]);
  });
  
  // Retornar función de desuscripción
  return () => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
}

/**
 * Suscripción genérica a cualquier tabla/colección
 * Detecta automáticamente el entorno:
 * - Desarrollo: Usa Supabase
 * - Producción: Usa Firebase
 * 
 * @param {string} tableName - Nombre de la tabla/colección
 * @param {function} callback - Función que recibe el array de datos
 * @param {object} options - Opciones adicionales (filters, orderBy, etc.)
 * @returns {function} - Función para desuscribirse
 */
export function subscribeCollection(tableName, callback, options = {}) {
  if (!tableName || typeof callback !== 'function') {
    return () => {};
  }

  // Detectar entorno - en producción usar Firebase siempre
  const isDevelopment = isDev();
  
  // Si estamos en producción, usar Firebase directamente
  if (!isDevelopment) {
    return subscribeCollectionFirebase(tableName, callback, options);
  }

  // En desarrollo, verificar si Supabase está realmente disponible (no dummy)
  // Esto se hace de forma asíncrona dentro del getSupabaseClient

  // Desarrollo con Supabase disponible: usar Supabase
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

  const supabaseTable = tableMap[tableName] || tableName;

  // Verificar si Supabase está disponible antes de intentar usarlo
  let unsubscribeFn = null;
  let supabaseAvailable = false;

  // Obtener datos iniciales y configurar suscripción
  getSupabaseClient().then(client => {
    if (!client || client._isDummy) {
      console.warn(`[subscribeCollection] Supabase no disponible para ${tableName}, usando Firebase`);
      // Si Supabase no está disponible, usar Firebase en su lugar
      unsubscribeFn = subscribeCollectionFirebase(tableName, callback, options);
      return;
    }

    supabaseAvailable = true;

    let query = client.from(supabaseTable).select('*');

  // Aplicar filtros específicos según el tipo de colección
  if (tableName === 'ventasporcobrar') {
    // Ventas por cobrar: solo las que no están eliminadas, no están cobradas, y están confirmadas/entregadas/canceladas con costo
    query = query
      .is('deleted_from_pending_at', null)
      .eq('estado_pago', 'pendiente')
      .is('settled_at', null)
      .in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);
  } else if (tableName === 'VentasSinConfirmar') {
    // Ventas sin confirmar: solo pendientes
    query = query.eq('estado_entrega', 'pendiente');
  } else if (tableName === 'ventashistorico') {
    // Ventas históricas: solo confirmadas, entregadas o canceladas
    query = query.in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);
  } else if (tableName === 'despachos') {
    // Despachos pendientes: solo status='pendiente'
    query = query.eq('status', 'pendiente');
  } else if (tableName === 'despachosHistorial') {
    // Despachos históricos: solo status='confirmado'
    query = query.eq('status', 'confirmado');
  }

  // Aplicar filtros adicionales si existen
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  // Aplicar ordenamiento si existe
  if (options.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
  }

  // Ejecutar query inicial
  query.then(({ data, error }) => {
    if (error) {
      console.error(`[subscribeCollection] Error obteniendo ${tableName}:`, error);
      callback([]);
      return;
    }

    // Normalizar datos según el tipo de tabla
    const normalized = normalizeData(tableName, data || []);
    callback(normalized);
  });

    // Suscripción en tiempo real
    const channel = client
      .channel(`${tableName}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: supabaseTable 
        }, 
        async () => {
          // Obtener datos actualizados después del cambio
          let refreshQuery = client.from(supabaseTable).select('*');
          
          // Aplicar los mismos filtros que en la query inicial
          if (tableName === 'ventasporcobrar') {
            refreshQuery = refreshQuery
              .is('deleted_from_pending_at', null)
              .eq('estado_pago', 'pendiente')
              .is('settled_at', null)
              .in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);
          } else if (tableName === 'VentasSinConfirmar') {
            refreshQuery = refreshQuery.eq('estado_entrega', 'pendiente');
          } else if (tableName === 'ventashistorico') {
            refreshQuery = refreshQuery.in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);
          } else if (tableName === 'despachos') {
            refreshQuery = refreshQuery.eq('status', 'pendiente');
          } else if (tableName === 'despachosHistorial') {
            refreshQuery = refreshQuery.eq('status', 'confirmado');
          }
          
          if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                refreshQuery = refreshQuery.eq(key, value);
              }
            });
          }
          
          if (options.orderBy) {
            refreshQuery = refreshQuery.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
          }

          const { data, error } = await refreshQuery;
          
          if (error) {
            console.error(`[subscribeCollection] Error refrescando ${tableName}:`, error);
            return;
          }

          const normalized = normalizeData(tableName, data || []);
          callback(normalized);
        }
      )
      .subscribe();

    // Guardar función de desuscripción
    unsubscribeFn = () => channel.unsubscribe();
  }).catch(error => {
    console.error(`[subscribeCollection] Error en Supabase:`, error);
    // Si falla Supabase, intentar usar Firebase como fallback
    if (!unsubscribeFn) {
      unsubscribeFn = subscribeCollectionFirebase(tableName, callback, options);
    }
    callback([]);
  });

  // Retornar función de desuscripción que se actualizará cuando se configure
  return () => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
}

/**
 * Normaliza datos según el tipo de tabla
 */
function normalizeData(tableName, data) {
  if (!Array.isArray(data)) return [];

  switch (tableName) {
    case 'almacenCentral':
      // Productos: mantener estructura similar
      return data.map(p => ({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        precio: Number(p.precio || 0),
        delivery: Number(p.delivery || 0),
        precioPar: Number(p.precio_par || p.precioPar || 0), // Incluir precioPar desde precio_par
        costo: Number(p.costo || 0),
        stock: Number(p.stock || 0),
        imagen: p.imagen || p.imagen_url || null, // Usar 'imagen' como principal, fallback a 'imagen_url'
        imagen_url: p.imagen_url || p.imagen || null, // Mantener para compatibilidad
        imagen_id: p.imagen_id,
        sintetico: Boolean(p.sintetico)
      }));

    case 'cityStock':
      // cityStock: convertir de formato normalizado a objeto por ciudad
      const grouped = {};
      data.forEach(item => {
        const ciudad = item.ciudad;
        if (!grouped[ciudad]) {
          grouped[ciudad] = {};
        }
        grouped[ciudad][item.sku] = Number(item.cantidad || 0);
      });
      // Retornar como array de objetos { id: ciudad, ...skus }
      return Object.entries(grouped).map(([ciudad, skus]) => ({
        id: ciudad,
        ...skus
      }));

    case 'despachos':
    case 'despachosHistorial':
      // Despachos: mantener estructura similar
      return data.map(d => ({
        id: d.id,
        fecha: d.fecha,
        ciudad: d.ciudad,
        status: d.status || 'pendiente',
        items: d.items || [],
        created_at: d.created_at,
        confirmed_at: d.confirmed_at
      }));

    case 'VentasSinConfirmar':
      // Ventas pendientes: estado_entrega='pendiente'
      return data
        .filter(s => s.estado_entrega === 'pendiente')
        .map(s => normalizeSale(s));

    case 'ventasporcobrar':
      // Ventas por cobrar: ya filtradas en la consulta SQL, solo normalizar
      // El filtro adicional aquí es redundante pero seguro por si acaso
      return data
        .filter(s => s.deleted_from_pending_at === null && s.estado_pago === 'pendiente' && s.settled_at === null)
        .map(s => normalizeSale(s));

    case 'ventashistorico':
      // Ventas históricas: estado_entrega IN ('confirmado', 'entregada', 'cancelado')
      return data
        .filter(s => ['confirmado', 'entregada', 'cancelado'].includes(s.estado_entrega))
        .map(s => normalizeSale(s));

    case 'GenerarDeposito':
      // Depósitos: mantener estructura similar, desnormalizar ciudad
      return data.map(d => ({
        id: d.id,
        ciudad: denormalizeCity(d.ciudad), // Desnormalizar ciudad para mostrar
        city: denormalizeCity(d.ciudad), // También en campo 'city' para compatibilidad
        fecha: d.fecha,
        monto_total: Number(d.monto_total || 0),
        nota: d.nota,
        estado: d.estado || 'pendiente',
        created_at: d.created_at,
        confirmed_at: d.confirmed_at
      }));

    case 'users':
      // Usuarios: normalizar usando normalizeUser
      return data.map(u => normalizeUser({ id: u.id, ...u }));

    case 'team_messages':
      // Team messages: mantener estructura similar
      return data.map(m => ({
        id: m.id,
        grupo: m.grupo,
        authorId: m.author_id,
        authorNombre: m.author_nombre,
        text: m.text,
        createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        readBy: Array.isArray(m.read_by) ? m.read_by : []
      }));

    case 'numbers':
      // Numbers: mantener estructura similar, mapear campos correctamente
      return data.map(n => ({
        id: n.id,
        sku: n.sku,
        email: n.email, // Mantener por compatibilidad
        telefonia: n.telefonia || n.email, // Usar telefonia si existe, sino email (compatibilidad)
        nombreOtro: n.nombre_otro || n.nombreOtro, // Mapear nombre_otro
        celular: n.celular,
        caduca: n.caduca,
        createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now()
      }));

    case 'grupos':
      // Grupos: mantener estructura simple
      return data
        .filter(g => g.activo !== false) // Solo grupos activos
        .map(g => ({
          id: g.id,
          nombre: g.nombre,
          descripcion: g.descripcion || '',
          activo: g.activo !== false,
          createdAt: g.created_at ? new Date(g.created_at).getTime() : Date.now()
        }));

    default:
      // Por defecto, retornar datos tal cual
      return data;
  }
}

/**
 * Normaliza una venta de Supabase a formato compatible con Firebase
 */
export function normalizeSale(s) {
  return {
    id: s.id,
    fecha: s.fecha,
    ciudad: denormalizeCity(s.ciudad), // Desnormalizar ciudad para que coincida con formato esperado
    sku: s.sku,
    cantidad: Number(s.cantidad || 0),
    precio: Number(s.precio || 0),
    skuExtra: s.sku_extra,
    cantidadExtra: Number(s.cantidad_extra || 0),
    total: s.total !== null ? Number(s.total) : null,
    vendedora: s.vendedora,
    vendedoraId: s.vendedora_id,
    celular: s.celular,
    metodo: s.metodo,
    cliente: s.cliente,
    notas: s.notas,
    estadoEntrega: s.estado_entrega,
    estadoPago: s.estado_pago,
    gasto: Number(s.gasto || 0),
    gastoCancelacion: Number(s.gasto_cancelacion || 0),
    codigoUnico: s.codigo_unico,
    confirmadoAt: s.confirmado_at ? new Date(s.confirmado_at).getTime() : null,
    entregadaAt: s.entregada_at ? new Date(s.entregada_at).getTime() : null,
    canceladoAt: s.cancelado_at ? new Date(s.cancelado_at).getTime() : null,
    settledAt: s.settled_at ? new Date(s.settled_at).getTime() : null,
    createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
    comprobante: s.comprobante,
    horaEntrega: s.hora_entrega,
    destinoEncomienda: s.destino_encomienda,
    motivo: s.motivo,
    sinteticaCancelada: Boolean(s.sintetica_cancelada),
    depositId: s.deposit_id,
    idPorCobrar: s.id_por_cobrar || s.id,
    idHistorico: s.id_historico || s.id
  };
}

/**
 * Leer todos los usuarios una sola vez
 * Reemplaza: firestoreUsers.getAllUsers()
 */
export async function getAllUsers() {
  const provider = isDev() ? 'supabase' : 'firebase';
  
  if (provider === 'firebase') {
    // Usar Firebase
    try {
      // Importar Firebase dinámicamente - usar paths completamente dinámicos
      const baseDir = '../';
      const deprecated = '_deprecated';
      const firebaseFile = 'firebase';
      const firebaseMod = 'firebase';
      const firestoreMod = 'firestore';
      
      const firebasePath = `${baseDir}${deprecated}/${firebaseFile}`;
      const firestorePath = `${firebaseMod}/${firestoreMod}`;
      
      const results = await Promise.all([
        import(/* @vite-ignore */ firebasePath).catch(() => null),
        import(/* @vite-ignore */ firestorePath).catch(() => null)
      ]);
      
      if (!results[0] || !results[1]) {
        console.warn('[getAllUsers] Firebase no disponible');
        return [];
      }
      
      const [{ db }, firestore] = results;
      const { collection, getDocs, query, orderBy } = firestore;
      
      const colRef = collection(db, 'users');
      const q = query(colRef, orderBy('nombre', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => normalizeUser({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[getAllUsers] Error fatal (Firebase):', err);
      return [];
    }
  } else {
    // Usar Supabase
    try {
      const client = await getSupabaseClient();
      if (!client) {
        console.error('[getAllUsers] Supabase no disponible');
        return [];
      }
      
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('[getAllUsers] Error:', error);
        return [];
      }

      return (data || []).map(u => normalizeUser({ id: u.id, ...u }));
    } catch (err) {
      console.error('[getAllUsers] Error fatal (Supabase):', err);
      return [];
    }
  }
}

/**
 * Suscripción en tiempo real a usuarios
 * Reemplaza: firestoreUsers.subscribeUsers()
 */
export function subscribeUsers(callback) {
  return subscribeCollection('users', callback, {
    orderBy: { column: 'nombre', ascending: true }
  });
}

/**
 * Normalizador de usuario
 * Reemplaza: firestoreUsers.normalizeUserDoc()
 */
export function normalizeUser(u) {
  if (!u) return null;
  
  // Normalizar productos: puede venir como array de texto de PostgreSQL o como array normal
  let productos = [];
  if (Array.isArray(u.productos)) {
    productos = u.productos;
  } else if (u.productos) {
    // Si viene como string (JSON), parsearlo
    try {
      productos = JSON.parse(u.productos);
    } catch {
      productos = [];
    }
  }
  
  return {
    id: u.id,
    username: u.username || u.email || '',
    nombre: u.nombre || '',
    apellidos: u.apellidos || '',
    celular: u.celular || '',
    password: u.password || '', // Mantener password para compatibilidad local
    rol: u.rol || 'seller',
    grupo: u.grupo || '',
    fechaIngreso: u.fecha_ingreso || u.fechaIngreso || new Date().toISOString().split('T')[0],
    fechaPago: u.fechaPago || u.fecha_ingreso || new Date().toISOString().split('T')[0], // Legacy
    sueldo: Number(u.sueldo || 0),
    diaPago: u.dia_pago || u.diaPago || Number(new Date().toISOString().slice(-2)),
    productos: productos, // Array de SKUs asignados
    createdAt: u.created_at ? new Date(u.created_at).getTime() : (u.createdAt || Date.now())
  };
}

