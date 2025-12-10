/**
 * Servicio para gestionar conversaciones de WhatsApp
 * FASE 3: SUBFASE 3.1 - Servicio de Conversaciones
 * FASE 2: SUBFASE 2.2 - Filtrado por productos del usuario
 * 
 * Proporciona funciones para obtener y gestionar conversaciones
 */

import { supabase } from '../../supabaseClient';

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
 * Obtener lista de conversaciones (contactos con mensajes)
 * Ordenados por última interacción (más reciente primero)
 * FASE 2: Filtrado por productos del usuario
 * FASE 3: Filtrado por product_id específico
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.search - Búsqueda por nombre o teléfono
 * @param {Array<string>} options.tagIds - IDs de etiquetas para filtrar (AND: contacto debe tener TODAS las etiquetas)
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @param {string|null} options.productId - ID de producto específico para filtrar (sobrescribe userSkus)
 * @param {number} options.limit - Límite de resultados
 * @param {number} options.offset - Offset para paginación
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getConversations(options = {}) {
  try {
    const { search, tagIds, userSkus = null, productId = null, limit = 50, offset = 0 } = options;
    
    let allowedAccountIds = null;
    
    // Si hay productId específico, usar ese (sobrescribe userSkus)
    if (productId) {
      const { data, error } = await supabase.rpc('get_account_ids_by_product_id', {
        p_product_id: productId
      });
      
      if (error) {
        console.error('[getConversations] Error obteniendo account_ids por product_id:', error);
        return { data: [], error: null };
      }
      
      allowedAccountIds = data || [];
    } else {
      // Obtener account_ids permitidos si hay filtro de productos
      allowedAccountIds = await getAccountIdsForUser(userSkus);
    }
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if ((userSkus || productId) && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }
    
    // Si hay filtro de productos, obtener contactos que tienen mensajes con esas cuentas
    let allowedContactIds = null;
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabase
        .from('whatsapp_messages')
        .select('contact_id')
        .in('account_id', allowedAccountIds);
      
      if (contactsError) {
        console.error('[getConversations] Error obteniendo contactos:', contactsError);
        return { data: [], error: null };
      }
      
      // Obtener IDs únicos de contactos
      allowedContactIds = [...new Set((contactsData || []).map(msg => msg.contact_id))];
      
      if (allowedContactIds.length === 0) {
        return { data: [], error: null };
      }
    }

    // Si hay filtro por etiquetas, necesitamos hacer un JOIN
    if (tagIds && tagIds.length > 0) {
      // Obtener contactos que tienen TODAS las etiquetas especificadas
      // Usamos una subquery para cada etiqueta y luego intersectamos
      let contactIdsWithAllTags = await getContactsWithTags(tagIds);
      
      // Intersectar con contactos permitidos por productos si hay filtro
      if (allowedContactIds !== null) {
        const allowedSet = new Set(allowedContactIds);
        contactIdsWithAllTags = contactIdsWithAllTags.filter(id => allowedSet.has(id));
      }
      
      if (contactIdsWithAllTags.length === 0) {
        // No hay contactos con todas las etiquetas y productos permitidos, retornar vacío
        return { data: [], error: null };
      }

      // Construir query base con filtro de IDs
      let query = supabase
        .from('whatsapp_contacts')
        .select(`
          id,
          name,
          phone,
          profile_pic_url,
          window_expires_at,
          last_interaction_at,
          last_interaction_source,
          is_online,
          last_seen_at,
          created_at
        `)
        .in('id', contactIdsWithAllTags)
        .order('last_interaction_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      // Aplicar filtro de búsqueda si existe
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[getConversations] Error:', error);
        return { data: null, error };
      }

      // Enriquecer con información de último mensaje (con filtro de productos)
      const enrichedData = await Promise.all(
        (data || []).map(async (contact) => {
          const lastMessage = await getLastMessage(contact.id, userSkus);
          return {
            ...contact,
            lastMessage: lastMessage?.data || null
          };
        })
      );

      return { data: enrichedData, error: null };
    }

    // Sin filtro de etiquetas, query normal
    // Construir query base
    let query = supabase
      .from('whatsapp_contacts')
      .select(`
        id,
        name,
        phone,
        profile_pic_url,
        window_expires_at,
        last_interaction_at,
        last_interaction_source,
        is_online,
        last_seen_at,
        created_at
      `);
    
    // Aplicar filtro por contactos permitidos si hay filtro de productos
    if (allowedContactIds !== null && allowedContactIds.length > 0) {
      query = query.in('id', allowedContactIds);
    }
    
    query = query
      .order('last_interaction_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtro de búsqueda si existe
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getConversations] Error:', error);
      return { data: null, error };
    }

    // Enriquecer con información de último mensaje (con filtro de productos)
    const enrichedData = await Promise.all(
      (data || []).map(async (contact) => {
        const lastMessage = await getLastMessage(contact.id, userSkus);
        return {
          ...contact,
          lastMessage: lastMessage?.data || null
        };
      })
    );

    return { data: enrichedData, error: null };
  } catch (err) {
    console.error('[getConversations] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener IDs de contactos que tienen TODAS las etiquetas especificadas
 * @param {Array<string>} tagIds - IDs de etiquetas
 * @returns {Promise<Array<string>>} - Array de contact IDs
 */
async function getContactsWithTags(tagIds) {
  try {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    // Para cada etiqueta, obtener los contactos que la tienen
    const contactIdsByTag = await Promise.all(
      tagIds.map(async (tagId) => {
        const { data, error } = await supabase
          .from('whatsapp_contact_tags')
          .select('contact_id')
          .eq('tag_id', tagId);

        if (error) {
          console.error('[getContactsWithTags] Error para tagId', tagId, ':', error);
          return [];
        }

        return (data || []).map(row => row.contact_id);
      })
    );

    // Intersectar: contactos que tienen TODAS las etiquetas
    if (contactIdsByTag.length === 0) {
      return [];
    }

    // Empezar con la primera lista
    let intersection = contactIdsByTag[0];

    // Intersectar con cada lista subsiguiente
    for (let i = 1; i < contactIdsByTag.length; i++) {
      const currentList = new Set(contactIdsByTag[i]);
      intersection = intersection.filter(id => currentList.has(id));
    }

    return intersection;
  } catch (err) {
    console.error('[getContactsWithTags] Error fatal:', err);
    return [];
  }
}

/**
 * Obtener último mensaje de un contacto
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {string} contactId - ID del contacto
 * @param {Array<string>|null} userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLastMessage(contactId, userSkus = null) {
  try {
    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar null
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: null, error: null };
    }
    
    // Construir query base
    let query = supabase
      .from('whatsapp_messages')
      .select(`
        id,
        contact_id,
        account_id,
        wa_message_id,
        message_type,
        text_content,
        media_url,
        media_filename,
        media_mime_type,
        media_caption,
        is_from_me,
        sent_via,
        status,
        timestamp,
        created_at
      `)
      .eq('contact_id', contactId);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    }
    
    query = query
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const { data, error } = await query;

    if (error) {
      // Ignorar error PGRST116 (no rows) - es normal cuando no hay mensajes
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('[getLastMessage] Error:', error);
      return { data: null, error };
    }

    // Mapear text_content a content_text para compatibilidad con componentes
    if (data) {
      return { 
        data: {
          ...data,
          content_text: data.text_content // Alias para compatibilidad
        }, 
        error: null 
      };
    }

    return { data: null, error: null };
  } catch (err) {
    console.error('[getLastMessage] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener mensajes de un contacto
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {string} contactId - ID del contacto
 * @param {Object} options - Opciones de paginación
 * @param {number} options.limit - Límite de mensajes
 * @param {number} options.offset - Offset para paginación
 * @param {Array<string>|null} options.userSkus - SKUs del usuario para filtrar por productos (null = admin, ver todas)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getContactMessages(contactId, options = {}) {
  try {
    const { limit = 50, offset = 0, userSkus = null } = options;
    
    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }

    // Construir query base
    let query = supabase
      .from('whatsapp_messages')
      .select(`
        id,
        contact_id,
        account_id,
        wa_message_id,
        message_type,
        text_content,
        media_url,
        media_filename,
        media_mime_type,
        media_caption,
        is_from_me,
        sent_via,
        status,
        reply_to_message_id,
        timestamp,
        created_at
      `)
      .eq('contact_id', contactId);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('account_id', allowedAccountIds);
    }
    
    query = query
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);
    
    const { data, error } = await query;

    if (error) {
      console.error('[getContactMessages] Error:', error);
      return { data: null, error };
    }

    // Mapear text_content a content_text para compatibilidad con componentes
    const mappedData = (data || []).map(msg => ({
      ...msg,
      content_text: msg.text_content // Alias para compatibilidad
    }));

    return { data: mappedData, error: null };
  } catch (err) {
    console.error('[getContactMessages] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener información de un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getContact(contactId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) {
      console.error('[getContact] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[getContact] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener mensaje por ID (para mostrar mensajes citados)
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getMessageById(messageId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select(`
        id,
        contact_id,
        account_id,
        wa_message_id,
        message_type,
        text_content,
        media_url,
        media_filename,
        media_caption,
        is_from_me,
        sent_via,
        status,
        timestamp,
        created_at
      `)
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('[getMessageById] Error:', error);
      return { data: null, error };
    }

    // Mapear text_content a content_text para compatibilidad
    if (data) {
      return {
        data: {
          ...data,
          content_text: data.text_content
        },
        error: null
      };
    }

    return { data: null, error: null };
  } catch (err) {
    console.error('[getMessageById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Marcar mensajes como leídos
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function markMessagesAsRead(contactId) {
  try {
    // Placeholder: la lógica de "no leídos" se implementará en una fase posterior.
    // Por ahora, solo retornamos éxito sin hacer nada.
    // Esto evita warnings en consola ya que la funcionalidad aún no está implementada.
    return { success: true, error: null };
  } catch (err) {
    console.error('[markMessagesAsRead] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Suscribirse a cambios en conversaciones
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @returns {Function} Función para desuscribirse
 */
export function subscribeConversations(callback) {
  const channel = supabase
    .channel('whatsapp_conversations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'whatsapp_contacts'
      },
      (payload) => {
        callback(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages'
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

/**
 * Suscribirse a mensajes de un contacto específico
 * @param {string} contactId - ID del contacto
 * @param {Function} callback - Función a llamar cuando hay nuevos mensajes
 * @returns {Function} Función para desuscribirse
 */
export function subscribeContactMessages(contactId, callback) {
  const channel = supabase
    .channel(`whatsapp_messages_${contactId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `contact_id=eq.${contactId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `contact_id=eq.${contactId}`
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

