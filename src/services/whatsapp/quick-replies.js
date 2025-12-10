/**
 * Servicio para gestionar respuestas rápidas de WhatsApp
 * FASE 2: SUBFASE 2.2 - Servicios Backend
 */

import { supabase } from '../../supabaseClient';

const QUICK_REPLIES_TABLE = 'whatsapp_quick_replies';

/**
 * Obtener todas las respuestas rápidas de un producto
 * FASE 2 - SUBFASE 2.2: Actualizado para filtrar por product_id
 * @param {string} productId - ID del producto
 * @param {string} [accountId] - ID de la cuenta WhatsApp (opcional, para compatibilidad)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getAllQuickReplies(productId, accountId = null) {
  try {
    if (!productId) {
      return { data: null, error: { message: 'productId es requerido' } };
    }

    let query = supabase
      .from(QUICK_REPLIES_TABLE)
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    // Si se proporciona accountId, también filtrar por cuenta (para compatibilidad)
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAllQuickReplies] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getAllQuickReplies] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener una respuesta rápida por ID
 * @param {string} quickReplyId - ID de la respuesta rápida
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getQuickReplyById(quickReplyId) {
  try {
    if (!quickReplyId) {
      return { data: null, error: { message: 'quickReplyId es requerido' } };
    }

    const { data, error } = await supabase
      .from(QUICK_REPLIES_TABLE)
      .select('*')
      .eq('id', quickReplyId)
      .single();

    if (error) {
      console.error('[getQuickReplyById] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[getQuickReplyById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Buscar respuestas rápidas por término de búsqueda (trigger o name)
 * FASE 2 - SUBFASE 2.2: Actualizado para filtrar por product_id
 * @param {string} productId - ID del producto
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} [accountId] - ID de la cuenta WhatsApp (opcional, para compatibilidad)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function searchQuickReplies(productId, searchTerm, accountId = null) {
  try {
    if (!productId) {
      return { data: null, error: { message: 'productId es requerido' } };
    }

    // Usar query directa en lugar de RPC para filtrar por product_id
    let query = supabase
      .from(QUICK_REPLIES_TABLE)
      .select('*')
      .eq('product_id', productId);

    // Si se proporciona accountId, también filtrar por cuenta (para compatibilidad)
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Aplicar búsqueda si hay término
    if (searchTerm && searchTerm.trim()) {
      const search = `%${searchTerm.trim()}%`;
      query = query.or(`trigger.ilike.${search},name.ilike.${search}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[searchQuickReplies] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[searchQuickReplies] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear una nueva respuesta rápida
 * FASE 2 - SUBFASE 2.2: Actualizado para requerir product_id
 * @param {string} productId - ID del producto (requerido)
 * @param {string} accountId - ID de la cuenta WhatsApp (requerido para compatibilidad)
 * @param {Object} quickReplyData - Datos de la respuesta rápida
 * @param {string} quickReplyData.trigger - Comando trigger (ej: "/saludo")
 * @param {string} quickReplyData.name - Nombre descriptivo
 * @param {string} quickReplyData.type - Tipo: 'text', 'image', 'image_text', 'audio', 'audio_text'
 * @param {string} [quickReplyData.content_text] - Texto (requerido para text, image_text, audio_text)
 * @param {string} [quickReplyData.media_path] - Ruta al archivo (requerido para image, image_text, audio, audio_text)
 * @param {string} [quickReplyData.media_type] - Tipo de media: 'image' o 'audio'
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createQuickReply(productId, accountId, quickReplyData) {
  try {
    if (!productId || !accountId) {
      return { data: null, error: { message: 'productId y accountId son requeridos' } };
    }

    const { trigger, name, type, content_text, media_path, media_type } = quickReplyData;

    // Validaciones
    if (!trigger || !trigger.trim()) {
      return { data: null, error: { message: 'trigger es requerido' } };
    }

    if (!trigger.startsWith('/')) {
      return { data: null, error: { message: 'trigger debe empezar con "/"' } };
    }

    if (!name || !name.trim()) {
      return { data: null, error: { message: 'name es requerido' } };
    }

    if (!type || !['text', 'image', 'image_text', 'audio', 'audio_text'].includes(type)) {
      return { data: null, error: { message: 'type debe ser: text, image, image_text, audio, o audio_text' } };
    }

    // Validar campos según tipo
    if (['text', 'image_text', 'audio_text'].includes(type) && !content_text) {
      return { data: null, error: { message: `content_text es requerido para tipo ${type}` } };
    }

    if (['image', 'image_text', 'audio', 'audio_text'].includes(type) && !media_path) {
      return { data: null, error: { message: `media_path es requerido para tipo ${type}` } };
    }

    if (media_path && !media_type) {
      return { data: null, error: { message: 'media_type es requerido cuando hay media_path' } };
    }

    if (media_type && !['image', 'audio'].includes(media_type)) {
      return { data: null, error: { message: 'media_type debe ser "image" o "audio"' } };
    }

    // Preparar datos para insertar
    const insertData = {
      product_id: productId,
      account_id: accountId,
      trigger: trigger.trim(),
      name: name.trim(),
      type,
      content_text: content_text || null,
      media_path: media_path || null,
      media_type: media_type || null
    };

    const { data, error } = await supabase
      .from(QUICK_REPLIES_TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createQuickReply] Error:', error);
      // Si es error de duplicado, mensaje más claro
      if (error.code === '23505') {
        return { data: null, error: { message: 'Ya existe una respuesta rápida con ese trigger en esta cuenta', code: 'DUPLICATE_TRIGGER' } };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createQuickReply] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar una respuesta rápida
 * @param {string} quickReplyId - ID de la respuesta rápida
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateQuickReply(quickReplyId, updates) {
  try {
    if (!quickReplyId) {
      return { data: null, error: { message: 'quickReplyId es requerido' } };
    }

    if (!updates || Object.keys(updates).length === 0) {
      return { data: null, error: { message: 'Debe proporcionar al menos un campo para actualizar' } };
    }

    // Validar trigger si se actualiza
    if (updates.trigger && !updates.trigger.startsWith('/')) {
      return { data: null, error: { message: 'trigger debe empezar con "/"' } };
    }

    // Validar type si se actualiza
    if (updates.type && !['text', 'image', 'image_text', 'audio', 'audio_text'].includes(updates.type)) {
      return { data: null, error: { message: 'type debe ser: text, image, image_text, audio, o audio_text' } };
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (updates.trigger !== undefined) updateData.trigger = updates.trigger.trim();
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.content_text !== undefined) updateData.content_text = updates.content_text || null;
    if (updates.media_path !== undefined) updateData.media_path = updates.media_path || null;
    if (updates.media_type !== undefined) updateData.media_type = updates.media_type || null;

    const { data, error } = await supabase
      .from(QUICK_REPLIES_TABLE)
      .update(updateData)
      .eq('id', quickReplyId)
      .select()
      .single();

    if (error) {
      console.error('[updateQuickReply] Error:', error);
      // Si es error de duplicado, mensaje más claro
      if (error.code === '23505') {
        return { data: null, error: { message: 'Ya existe una respuesta rápida con ese trigger en esta cuenta', code: 'DUPLICATE_TRIGGER' } };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[updateQuickReply] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar una respuesta rápida
 * @param {string} quickReplyId - ID de la respuesta rápida
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteQuickReply(quickReplyId) {
  try {
    if (!quickReplyId) {
      return { success: false, error: { message: 'quickReplyId es requerido' } };
    }

    const { error } = await supabase
      .from(QUICK_REPLIES_TABLE)
      .delete()
      .eq('id', quickReplyId);

    if (error) {
      console.error('[deleteQuickReply] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteQuickReply] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Subir media para respuesta rápida
 * @param {File} file - Archivo a subir
 * @param {string} mediaType - Tipo de media: 'image' o 'audio'
 * @returns {Promise<{url: string, path: string, error: Object|null}>}
 */
export async function uploadQuickReplyMedia(file, mediaType) {
  try {
    if (!file) {
      return { url: null, path: null, error: { message: 'file es requerido' } };
    }

    if (!mediaType || !['image', 'audio'].includes(mediaType)) {
      return { url: null, path: null, error: { message: 'mediaType debe ser "image" o "audio"' } };
    }

    // Importar servicio de storage
    const { uploadMediaToWhatsAppStorage } = await import('./storage');

    // Validar tamaño según tipo
    const fileSizeKB = file.size / 1024;
    const maxSizes = {
      image: 5120, // 5 MB (según plan)
      audio: 16384 // 16 MB (según plan)
    };

    const maxSize = maxSizes[mediaType];
    if (fileSizeKB > maxSize) {
      return {
        url: null,
        path: null,
        error: {
          message: `El archivo es demasiado grande. Máximo para ${mediaType}: ${(maxSize / 1024).toFixed(1)} MB`
        }
      };
    }

    // Subir archivo
    const result = await uploadMediaToWhatsAppStorage(file, mediaType);

    return {
      url: result.url,
      path: result.path,
      error: null
    };
  } catch (err) {
    console.error('[uploadQuickReplyMedia] Error fatal:', err);
    return {
      url: null,
      path: null,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

