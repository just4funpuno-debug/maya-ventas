/**
 * Servicio para gestionar contactos bloqueados
 * FASE 5: SUBFASE 5.3 - Panel de Posibles Bloqueos
 * FASE 2: SUBFASE 2.3 - Filtrado por productos del usuario
 */

import { supabase } from '../../supabaseClient';

const CONTACTS_TABLE = 'whatsapp_contacts';
const DELIVERY_ISSUES_TABLE = 'whatsapp_delivery_issues';

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
 * Obtener contactos bloqueados (is_blocked = true)
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.accountId - Filtrar por cuenta
 * @param {string} options.search - Búsqueda por nombre o teléfono
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @param {number} options.limit - Límite de resultados
 * @param {number} options.offset - Offset para paginación
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getBlockedContacts(options = {}) {
  try {
    const { accountId, search, userSkus = null, limit = 50, offset = 0 } = options;

    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    let query = supabase
      .from(CONTACTS_TABLE)
      .select('*')
      .eq('is_blocked', true);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    } else if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getBlockedContacts] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getBlockedContacts] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener contactos sospechosos (probabilidad 50-79%)
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.accountId - Filtrar por cuenta
 * @param {string} options.search - Búsqueda por nombre o teléfono
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @param {number} options.limit - Límite de resultados
 * @param {number} options.offset - Offset para paginación
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getSuspiciousContacts(options = {}) {
  try {
    const { accountId, search, userSkus = null, limit = 50, offset = 0 } = options;

    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    let query = supabase
      .from(CONTACTS_TABLE)
      .select('*')
      .gte('block_probability', 50)
      .lt('block_probability', 80)
      .eq('is_blocked', false);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    } else if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    query = query
      .order('block_probability', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getSuspiciousContacts] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getSuspiciousContacts] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener issues de entrega para un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getContactDeliveryIssues(contactId) {
  try {
    const { data, error } = await supabase
      .from(DELIVERY_ISSUES_TABLE)
      .select('*')
      .eq('contact_id', contactId)
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('[getContactDeliveryIssues] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getContactDeliveryIssues] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Reactivar contacto (marcar como no bloqueado)
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function reactivateContact(contactId) {
  try {
    // Actualizar contacto
    const { error: updateError } = await supabase
      .from(CONTACTS_TABLE)
      .update({
        is_blocked: false,
        block_probability: 0,
        consecutive_undelivered: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[reactivateContact] Error actualizando contacto:', updateError);
      return { success: false, error: updateError };
    }

    // Marcar issues como resueltos
    await supabase
      .from(DELIVERY_ISSUES_TABLE)
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        action_taken: 'none'
      })
      .eq('contact_id', contactId)
      .eq('resolved', false);

    return { success: true, error: null };
  } catch (err) {
    console.error('[reactivateContact] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteContact(contactId) {
  try {
    const { error } = await supabase
      .from(CONTACTS_TABLE)
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('[deleteContact] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteContact] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Agregar nota a un contacto
 * @param {string} contactId - ID del contacto
 * @param {string} note - Nota a agregar
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function addContactNote(contactId, note) {
  try {
    // Obtener nota actual
    const { data: contact, error: fetchError } = await supabase
      .from(CONTACTS_TABLE)
      .select('notes')
      .eq('id', contactId)
      .single();

    if (fetchError) {
      console.error('[addContactNote] Error obteniendo contacto:', fetchError);
      return { success: false, error: fetchError };
    }

    // Agregar nueva nota con timestamp
    const timestamp = new Date().toLocaleString('es-ES');
    const newNote = `[${timestamp}] ${note}`;
    const updatedNotes = contact.notes
      ? `${contact.notes}\n${newNote}`
      : newNote;

    const { error: updateError } = await supabase
      .from(CONTACTS_TABLE)
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[addContactNote] Error actualizando nota:', updateError);
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[addContactNote] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener estadísticas de bloqueo
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {string} accountId - ID de la cuenta (opcional)
 * @param {Array<string>|null} userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @returns {Promise<{data: Object, error: Object|null}>}
 */
export async function getBlockingStats(accountId = null, userSkus = null) {
  try {
    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar estadísticas vacías
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return {
        data: {
          total: 0,
          blocked: 0,
          suspicious: 0,
          active: 0,
          averageProbability: 0
        },
        error: null
      };
    }
    
    let query = supabase
      .from(CONTACTS_TABLE)
      .select('is_blocked, block_probability');

    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    } else if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getBlockingStats] Error:', error);
      return { data: null, error };
    }

    const stats = {
      total: data?.length || 0,
      blocked: 0,
      suspicious: 0,
      active: 0,
      averageProbability: 0
    };

    let totalProbability = 0;
    let contactsWithProbability = 0;

    data?.forEach(contact => {
      if (contact.is_blocked) {
        stats.blocked++;
      } else if (contact.block_probability >= 50) {
        stats.suspicious++;
      } else {
        stats.active++;
      }

      if (contact.block_probability > 0) {
        totalProbability += contact.block_probability;
        contactsWithProbability++;
      }
    });

    stats.averageProbability = contactsWithProbability > 0
      ? Math.round(totalProbability / contactsWithProbability)
      : 0;

    return { data: stats, error: null };
  } catch (err) {
    console.error('[getBlockingStats] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener issues de entrega no resueltos
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Object} options - Opciones
 * @param {string} options.accountId - Filtrar por cuenta
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @param {number} options.limit - Límite de resultados
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getUnresolvedIssues(options = {}) {
  try {
    const { accountId, userSkus = null, limit = 100 } = options;

    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    let query = supabase
      .from(DELIVERY_ISSUES_TABLE)
      .select(`
        *,
        whatsapp_contacts!inner (
          id,
          name,
          phone,
          block_probability,
          is_blocked
        )
      `)
      .eq('resolved', false);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    } else if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    query = query
      .order('detected_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[getUnresolvedIssues] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getUnresolvedIssues] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}


