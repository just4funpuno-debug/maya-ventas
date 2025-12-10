/**
 * Servicio para manejar el estado de contactos (online, última vez visto)
 * FASE 2: SUBFASE 2.2 - Estado Online/Última Vez Visto
 */

import { supabase } from '../../supabaseClient';

/**
 * Actualizar estado online de un contacto
 * @param {string} contactId - ID del contacto
 * @param {boolean} isOnline - Si está en línea
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function updateContactOnlineStatus(contactId, isOnline) {
  try {
    const updates = {
      is_online: isOnline,
      ...(isOnline ? {} : { last_seen_at: new Date().toISOString() })
    };

    const { error } = await supabase
      .from('whatsapp_contacts')
      .update(updates)
      .eq('id', contactId);

    if (error) {
      console.error('[updateContactOnlineStatus] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[updateContactOnlineStatus] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Suscribirse a cambios de estado de un contacto
 * @param {string} contactId - ID del contacto
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @returns {Function} Función para desuscribirse
 */
export function subscribeContactStatus(contactId, callback) {
  const channel = supabase
    .channel(`contact_status_${contactId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_contacts',
        filter: `id=eq.${contactId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Formatear "última vez visto" para mostrar
 * @param {string|Date} lastSeenAt - Fecha de última vez visto
 * @returns {string} Texto formateado
 */
export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return 'Nunca visto';

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Visto ahora';
  } else if (diffMinutes < 60) {
    return `Visto hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHours < 24) {
    return `Visto hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays === 1) {
    return 'Visto ayer';
  } else if (diffDays < 7) {
    return `Visto hace ${diffDays} días`;
  } else {
    // Formato de fecha completa
    return `Visto el ${lastSeen.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })}`;
  }
}

/**
 * Obtener texto de estado para mostrar
 * @param {Object} contact - Objeto de contacto con is_online y last_seen_at
 * @returns {string} Texto de estado
 */
export function getContactStatusText(contact) {
  if (!contact) return '';

  if (contact.is_online) {
    return 'En línea';
  } else if (contact.last_seen_at) {
    return formatLastSeen(contact.last_seen_at);
  } else {
    return 'Nunca visto';
  }
}


