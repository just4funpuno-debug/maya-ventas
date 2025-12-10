/**
 * Servicio para gestionar la cola de mensajes de Puppeteer
 * FASE 5: SUBFASE 5.1 - Panel de Cola Puppeteer
 * FASE 2: SUBFASE 2.3 - Filtrado por productos del usuario
 */

import { supabase } from '../../supabaseClient';

const QUEUE_TABLE = 'puppeteer_queue';
const CONFIG_TABLE = 'puppeteer_config';

/**
 * Helper: Obtener account_ids permitidos para un usuario
 * @param {Array<string>|null} userSkus - SKUs del usuario (null = admin, ver todas)
 * @returns {Promise<Array<string>|null>} - Array de account_ids o null si no hay filtro
 */
async function getAccountIdsForUser(userSkus) {
  // Si userSkus es null o undefined, retornar null (sin filtro, admin)
  if (!userSkus || userSkus.length === 0) {
    return null;
  }
  
  try {
    // Usar función SQL helper para obtener account_ids
    const { data, error } = await supabase.rpc('get_account_ids_by_user_skus', {
      p_skus: userSkus
    });
    
    if (error) {
      console.error('[getAccountIdsForUser] Error:', error);
      // Si hay error, retornar array vacío para que no se muestre nada
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('[getAccountIdsForUser] Error fatal:', err);
    return [];
  }
}

/**
 * Obtener mensajes de la cola
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.status - Filtrar por status (pending, processing, sent, failed)
 * @param {string} options.priority - Filtrar por prioridad (HIGH, MEDIUM, LOW)
 * @param {string} options.messageType - Filtrar por tipo de mensaje
 * @param {string} options.search - Búsqueda por nombre de contacto o teléfono
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @param {number} options.limit - Límite de resultados
 * @param {number} options.offset - Offset para paginación
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getQueueMessages(options = {}) {
  try {
    const {
      status,
      priority,
      messageType,
      search,
      userSkus = null,
      limit = 50,
      offset = 0
    } = options;

    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    // Construir query base con join a contactos
    let query = supabase
      .from(QUEUE_TABLE)
      .select(`
        *,
        whatsapp_contacts!inner (
          id,
          name,
          phone
        )
      `);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    }
    
    query = query
      .order('added_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (messageType) {
      query = query.eq('message_type', messageType);
    }

    // Búsqueda por nombre o teléfono del contacto
    if (search && search.trim()) {
      // Necesitamos hacer un join y filtrar
      // Por ahora, obtenemos todos y filtramos en JS
      // TODO: Optimizar con query más compleja si es necesario
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getQueueMessages] Error:', error);
      return { data: null, error };
    }

    // Filtrar por búsqueda si existe
    let filteredData = data || [];
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredData = filteredData.filter(item => {
        const contact = item.whatsapp_contacts;
        if (!contact) return false;
        const name = (contact.name || '').toLowerCase();
        const phone = (contact.phone || '').toLowerCase();
        return name.includes(searchTerm) || phone.includes(searchTerm);
      });
    }

    return { data: filteredData, error: null };
  } catch (err) {
    console.error('[getQueueMessages] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener estadísticas de la cola
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {string} accountId - ID de la cuenta (opcional)
 * @param {Array<string>|null} userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @returns {Promise<{data: Object, error: Object|null}>}
 */
export async function getQueueStats(accountId = null, userSkus = null) {
  try {
    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar estadísticas vacías
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return {
        data: {
          total: 0,
          byStatus: { pending: 0, processing: 0, sent: 0, failed: 0 },
          byPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 },
          byType: { text: 0, image: 0, video: 0, audio: 0, document: 0 }
        },
        error: null
      };
    }
    
    let query = supabase
      .from(QUEUE_TABLE)
      .select('status, priority, message_type', { count: 'exact' });

    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    } else if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getQueueStats] Error:', error);
      return { data: null, error };
    }

    // Calcular estadísticas
    const stats = {
      total: data?.length || 0,
      byStatus: {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0
      },
      byPriority: {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      byType: {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0
      }
    };

    (data || []).forEach(item => {
      if (item.status) stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      if (item.priority) stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      if (item.message_type) stats.byType[item.message_type] = (stats.byType[item.message_type] || 0) + 1;
    });

    return { data: stats, error: null };
  } catch (err) {
    console.error('[getQueueStats] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener log de últimos envíos
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Object} options - Opciones
 * @param {number} options.limit - Límite de resultados (default: 100)
 * @param {string} options.status - Filtrar por status
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getQueueLog(options = {}) {
  try {
    const { limit = 100, status, userSkus = null } = options;

    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    let query = supabase
      .from(QUEUE_TABLE)
      .select(`
        *,
        whatsapp_contacts!inner (
          id,
          name,
          phone
        )
      `)
      .in('status', ['sent', 'failed']);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    }
    
    query = query
      .order('processed_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getQueueLog] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getQueueLog] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener estado del bot (pausado/activo)
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<{data: Object, error: Object|null}>}
 */
export async function getBotStatus(accountId) {
  try {
    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('bot_active, last_heartbeat')
      .eq('account_id', accountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[getBotStatus] Error:', error);
      return { data: null, error };
    }

    return {
      data: {
        bot_active: data?.bot_active ?? true,
        last_heartbeat: data?.last_heartbeat || null
      },
      error: null
    };
  } catch (err) {
    console.error('[getBotStatus] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Pausar bot (emergencia)
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function pauseBot(accountId) {
  try {
    // Verificar si existe configuración
    const { data: existing } = await supabase
      .from(CONFIG_TABLE)
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existing) {
      // Actualizar
      const { error } = await supabase
        .from(CONFIG_TABLE)
        .update({ bot_active: false, updated_at: new Date().toISOString() })
        .eq('account_id', accountId);

      if (error) {
        console.error('[pauseBot] Error:', error);
        return { success: false, error };
      }
    } else {
      // Crear
      const { error } = await supabase
        .from(CONFIG_TABLE)
        .insert({
          account_id: accountId,
          bot_active: false
        });

      if (error) {
        console.error('[pauseBot] Error:', error);
        return { success: false, error };
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[pauseBot] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Reanudar bot
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function resumeBot(accountId) {
  try {
    // Verificar si existe configuración
    const { data: existing } = await supabase
      .from(CONFIG_TABLE)
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existing) {
      // Actualizar
      const { error } = await supabase
        .from(CONFIG_TABLE)
        .update({ bot_active: true, updated_at: new Date().toISOString() })
        .eq('account_id', accountId);

      if (error) {
        console.error('[resumeBot] Error:', error);
        return { success: false, error };
      }
    } else {
      // Crear
      const { error } = await supabase
        .from(CONFIG_TABLE)
        .insert({
          account_id: accountId,
          bot_active: true
        });

      if (error) {
        console.error('[resumeBot] Error:', error);
        return { success: false, error };
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[resumeBot] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar mensaje de la cola
 * @param {string} messageId - ID del mensaje en la cola
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function removeFromQueue(messageId) {
  try {
    const { error } = await supabase
      .from(QUEUE_TABLE)
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('[removeFromQueue] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[removeFromQueue] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Reintentar mensaje fallido
 * @param {string} messageId - ID del mensaje en la cola
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function retryMessage(messageId) {
  try {
    const { error } = await supabase
      .from(QUEUE_TABLE)
      .update({
        status: 'pending',
        attempts: 0,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('[retryMessage] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[retryMessage] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Suscribirse a cambios en la cola
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @returns {Function} Función para desuscribirse
 */
export function subscribeQueue(callback) {
  const channel = supabase
    .channel('puppeteer_queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: QUEUE_TABLE
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


