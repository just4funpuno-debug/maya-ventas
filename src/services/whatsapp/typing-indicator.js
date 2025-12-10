/**
 * Servicio para manejar el indicador "escribiendo..."
 * FASE 2: SUBFASE 2.4 - Indicador "Escribiendo..."
 */

import { supabase } from '../../supabaseClient';

/**
 * Actualizar estado de escritura de un contacto
 * @param {string} contactId - ID del contacto
 * @param {boolean} isTyping - Si está escribiendo
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function updateTypingStatus(contactId, isTyping) {
  try {
    const { error } = await supabase
      .from('whatsapp_contacts')
      .update({ is_typing: isTyping })
      .eq('id', contactId);

    if (error) {
      console.error('[updateTypingStatus] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[updateTypingStatus] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Suscribirse a cambios de estado de escritura de un contacto
 * @param {string} contactId - ID del contacto
 * @param {Function} callback - Función a llamar cuando hay cambios (recibe isTyping: boolean)
 * @returns {Function} Función para desuscribirse
 */
export function subscribeTypingStatus(contactId, callback) {
  const channel = supabase
    .channel(`typing_status_${contactId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_contacts',
        filter: `id=eq.${contactId}`
      },
      (payload) => {
        callback(payload.new.is_typing || false);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


