/**
 * Servicio para gestionar etiquetas de contactos WhatsApp
 * FASE 1: SUBFASE 1.2 - Servicios Backend
 */

import { supabase } from '../../supabaseClient';

const TAGS_TABLE = 'whatsapp_tags';
const CONTACT_TAGS_TABLE = 'whatsapp_contact_tags';

/**
 * Obtener todas las etiquetas de un producto
 * FASE 2 - SUBFASE 2.1: Actualizado para filtrar por product_id
 * @param {string} productId - ID del producto
 * @param {string} [accountId] - ID de la cuenta WhatsApp (opcional, para compatibilidad)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getAllTags(productId, accountId = null) {
  try {
    if (!productId) {
      return { data: null, error: { message: 'productId es requerido' } };
    }

    let query = supabase
      .from(TAGS_TABLE)
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    // Si se proporciona accountId, también filtrar por cuenta (para compatibilidad)
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAllTags] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getAllTags] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener una etiqueta por ID
 * @param {string} tagId - ID de la etiqueta
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getTagById(tagId) {
  try {
    if (!tagId) {
      return { data: null, error: { message: 'tagId es requerido' } };
    }

    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .select('*')
      .eq('id', tagId)
      .single();

    if (error) {
      console.error('[getTagById] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[getTagById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear una nueva etiqueta
 * FASE 2 - SUBFASE 2.1: Actualizado para requerir product_id
 * @param {string} productId - ID del producto (requerido)
 * @param {string} accountId - ID de la cuenta WhatsApp (requerido para compatibilidad)
 * @param {string} name - Nombre de la etiqueta
 * @param {string} color - Color hexadecimal (ej: #e7922b)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createTag(productId, accountId, name, color = '#e7922b') {
  try {
    if (!productId || !accountId || !name) {
      return { data: null, error: { message: 'productId, accountId y name son requeridos' } };
    }

    // Validar formato de color
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return { data: null, error: { message: 'Color debe ser un código hexadecimal válido (ej: #e7922b)' } };
    }

    // Validar longitud del nombre
    if (name.length > 50) {
      return { data: null, error: { message: 'El nombre de la etiqueta no puede exceder 50 caracteres' } };
    }

    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .insert({
        product_id: productId,
        account_id: accountId,
        name: name.trim(),
        color: color || '#e7922b'
      })
      .select()
      .single();

    if (error) {
      console.error('[createTag] Error:', error);
      // Si es error de duplicado, mensaje más claro
      if (error.code === '23505') {
        return { data: null, error: { message: 'Ya existe una etiqueta con ese nombre en este producto', code: 'DUPLICATE_TAG' } };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createTag] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar una etiqueta existente
 * @param {string} tagId - ID de la etiqueta
 * @param {Object} updates - Objeto con campos a actualizar (name, color)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateTag(tagId, updates) {
  try {
    if (!tagId) {
      return { data: null, error: { message: 'tagId es requerido' } };
    }

    if (!updates || Object.keys(updates).length === 0) {
      return { data: null, error: { message: 'Debe proporcionar al menos un campo para actualizar' } };
    }

    // Validar formato de color si se proporciona
    if (updates.color && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
      return { data: null, error: { message: 'Color debe ser un código hexadecimal válido (ej: #e7922b)' } };
    }

    // Validar longitud del nombre si se proporciona
    if (updates.name && updates.name.length > 50) {
      return { data: null, error: { message: 'El nombre de la etiqueta no puede exceder 50 caracteres' } };
    }

    // Preparar objeto de actualización
    const updateData = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.color !== undefined) {
      updateData.color = updates.color;
    }

    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .update(updateData)
      .eq('id', tagId)
      .select()
      .single();

    if (error) {
      console.error('[updateTag] Error:', error);
      // Si es error de duplicado, mensaje más claro
      if (error.code === '23505') {
        return { data: null, error: { message: 'Ya existe una etiqueta con ese nombre en esta cuenta', code: 'DUPLICATE_TAG' } };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[updateTag] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar una etiqueta
 * @param {string} tagId - ID de la etiqueta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteTag(tagId) {
  try {
    if (!tagId) {
      return { success: false, error: { message: 'tagId es requerido' } };
    }

    // La eliminación en cascada se maneja automáticamente por la FK
    const { error } = await supabase
      .from(TAGS_TABLE)
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('[deleteTag] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteTag] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener todas las etiquetas de un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getContactTags(contactId) {
  try {
    if (!contactId) {
      return { data: null, error: { message: 'contactId es requerido' } };
    }

    // Usar la función RPC o query directa
    const { data, error } = await supabase.rpc('get_contact_tags', {
      p_contact_id: contactId
    });

    if (error) {
      console.error('[getContactTags] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getContactTags] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Asignar una etiqueta a un contacto
 * @param {string} contactId - ID del contacto
 * @param {string} tagId - ID de la etiqueta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function addTagToContact(contactId, tagId) {
  try {
    if (!contactId || !tagId) {
      return { success: false, error: { message: 'contactId y tagId son requeridos' } };
    }

    const { error } = await supabase
      .from(CONTACT_TAGS_TABLE)
      .insert({
        contact_id: contactId,
        tag_id: tagId
      });

    if (error) {
      console.error('[addTagToContact] Error:', error);
      // Si es error de duplicado, no es un error crítico
      if (error.code === '23505') {
        return { success: true, error: null }; // Ya existe, consideramos éxito
      }
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[addTagToContact] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Quitar una etiqueta de un contacto
 * @param {string} contactId - ID del contacto
 * @param {string} tagId - ID de la etiqueta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function removeTagFromContact(contactId, tagId) {
  try {
    if (!contactId || !tagId) {
      return { success: false, error: { message: 'contactId y tagId son requeridos' } };
    }

    const { error } = await supabase
      .from(CONTACT_TAGS_TABLE)
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('[removeTagFromContact] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[removeTagFromContact] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Asignar múltiples etiquetas a un contacto (reemplaza las existentes)
 * @param {string} contactId - ID del contacto
 * @param {Array<string>} tagIds - Array de IDs de etiquetas
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function setContactTags(contactId, tagIds) {
  try {
    if (!contactId) {
      return { success: false, error: { message: 'contactId es requerido' } };
    }

    if (!Array.isArray(tagIds)) {
      return { success: false, error: { message: 'tagIds debe ser un array' } };
    }

    // Eliminar todas las etiquetas existentes del contacto
    const { error: deleteError } = await supabase
      .from(CONTACT_TAGS_TABLE)
      .delete()
      .eq('contact_id', contactId);

    if (deleteError) {
      console.error('[setContactTags] Error eliminando etiquetas existentes:', deleteError);
      return { success: false, error: deleteError };
    }

    // Si no hay etiquetas para asignar, terminamos aquí
    if (tagIds.length === 0) {
      return { success: true, error: null };
    }

    // Insertar las nuevas etiquetas
    const insertData = tagIds.map(tagId => ({
      contact_id: contactId,
      tag_id: tagId
    }));

    const { error: insertError } = await supabase
      .from(CONTACT_TAGS_TABLE)
      .insert(insertData);

    if (insertError) {
      console.error('[setContactTags] Error insertando etiquetas:', insertError);
      return { success: false, error: insertError };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[setContactTags] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}


