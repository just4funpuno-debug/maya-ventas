/**
 * Servicio para detectar bloqueos automáticamente
 * FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos
 * 
 * Detecta cuando un contacto bloquea el número monitoreando
 * el status de los mensajes enviados
 */

import { supabase } from '../../supabaseClient';

const CONTACTS_TABLE = 'whatsapp_contacts';
const MESSAGES_TABLE = 'whatsapp_messages';
const DELIVERY_ISSUES_TABLE = 'whatsapp_delivery_issues';

/**
 * Verificar status de un mensaje en WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - WhatsApp Message ID
 * @returns {Promise<{status: string, error: Object|null}>}
 */
export async function checkMessageStatus(accountId, messageId) {
  try {
    // Obtener cuenta para acceder al access_token
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('access_token, phone_number_id')
      .eq('id', accountId)
      .eq('active', true)
      .single();

    if (accountError || !account) {
      return {
        status: 'unknown',
        error: accountError || { message: 'Cuenta no encontrada' }
      };
    }

    // Verificar status en WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.phone_number_id}/messages?ids=${messageId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: 'unknown',
        error: { message: errorData.error?.message || 'Error verificando status' }
      };
    }

    const data = await response.json();
    const message = data.data?.[0];

    if (!message) {
      return {
        status: 'unknown',
        error: { message: 'Mensaje no encontrado en API' }
      };
    }

    // WhatsApp retorna: sent, delivered, read, failed
    return {
      status: message.status || 'unknown',
      error: null
    };
  } catch (err) {
    console.error('[checkMessageStatus] Error fatal:', err);
    return {
      status: 'unknown',
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Detectar si un contacto está bloqueado
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isBlocked: boolean, probability: number, consecutiveUndelivered: number, error: Object|null}>}
 */
export async function detectBlockedContact(contactId) {
  try {
    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from(CONTACTS_TABLE)
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        isBlocked: false,
        probability: 0,
        consecutiveUndelivered: 0,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Obtener mensajes "sent" con más de 72 horas
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: oldMessages, error: messagesError } = await supabase
      .from(MESSAGES_TABLE)
      .select('id, wa_message_id, status, timestamp, sent_via, account_id')
      .eq('contact_id', contactId)
      .eq('is_from_me', true)
      .eq('status', 'sent')
      .lt('timestamp', seventyTwoHoursAgo)
      .order('timestamp', { ascending: false })
      .limit(10); // Verificar últimos 10 mensajes

    if (messagesError) {
      console.error('[detectBlockedContact] Error obteniendo mensajes:', messagesError);
      return {
        isBlocked: false,
        probability: contact.block_probability || 0,
        consecutiveUndelivered: contact.consecutive_undelivered || 0,
        error: messagesError
      };
    }

    if (!oldMessages || oldMessages.length === 0) {
      // No hay mensajes antiguos para verificar
      return {
        isBlocked: false,
        probability: contact.block_probability || 0,
        consecutiveUndelivered: contact.consecutive_undelivered || 0,
        error: null
      };
    }

    // Verificar status de cada mensaje
    let consecutiveUndelivered = 0;
    let totalChecked = 0;
    let undeliveredCount = 0;

    for (const message of oldMessages) {
      if (!message.wa_message_id || !message.account_id) continue;

      totalChecked++;
      const statusCheck = await checkMessageStatus(message.account_id, message.wa_message_id);

      if (statusCheck.status === 'sent' && !statusCheck.error) {
        // Mensaje sigue en "sent" después de 72h, probablemente no entregado
        consecutiveUndelivered++;
        undeliveredCount++;
      } else if (statusCheck.status === 'delivered' || statusCheck.status === 'read') {
        // Mensaje entregado, resetear contador
        consecutiveUndelivered = 0;
      } else if (statusCheck.status === 'failed') {
        // Mensaje fallido, incrementar contador
        consecutiveUndelivered++;
        undeliveredCount++;
      }
    }

    // Calcular probabilidad de bloqueo (0-100%)
    let probability = 0;
    if (totalChecked > 0) {
      const undeliveredRatio = undeliveredCount / totalChecked;
      probability = Math.round(undeliveredRatio * 100);
    }

    // Si hay mensajes consecutivos sin entregar, aumentar probabilidad
    if (consecutiveUndelivered >= 3) {
      probability = Math.min(100, probability + (consecutiveUndelivered * 10));
    }

    // Marcar como bloqueado si probabilidad > 80%
    const isBlocked = probability >= 80;

    return {
      isBlocked,
      probability,
      consecutiveUndelivered,
      error: null
    };
  } catch (err) {
    console.error('[detectBlockedContact] Error fatal:', err);
    return {
      isBlocked: false,
      probability: 0,
      consecutiveUndelivered: 0,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Actualizar estado de bloqueo de un contacto
 * @param {string} contactId - ID del contacto
 * @param {Object} detectionResult - Resultado de detectBlockedContact
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function updateBlockStatus(contactId, detectionResult) {
  try {
    const { isBlocked, probability, consecutiveUndelivered } = detectionResult;

    // Actualizar contacto
    const { error: updateError } = await supabase
      .from(CONTACTS_TABLE)
      .update({
        consecutive_undelivered: consecutiveUndelivered,
        block_probability: probability,
        is_blocked: isBlocked,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[updateBlockStatus] Error actualizando contacto:', updateError);
      return { success: false, error: updateError };
    }

    // Si está bloqueado, pausar secuencias automáticamente
    if (isBlocked) {
      await supabase
        .from(CONTACTS_TABLE)
        .update({
          sequence_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
    }

    // Registrar en delivery_issues si está bloqueado o tiene alta probabilidad
    if (isBlocked || probability >= 50) {
      const { data: contact } = await supabase
        .from(CONTACTS_TABLE)
        .select('account_id')
        .eq('id', contactId)
        .single();

      if (contact) {
        await supabase
          .from(DELIVERY_ISSUES_TABLE)
          .insert({
            contact_id: contactId,
            account_id: contact.account_id,
            issue_type: isBlocked ? 'confirmed_block' : 'probable_block',
            message_source: 'cloud_api', // Por ahora solo verificamos Cloud API
            days_undelivered: Math.floor(consecutiveUndelivered / 2), // Aproximación
            consecutive_count: consecutiveUndelivered,
            action_taken: isBlocked ? 'paused' : 'none',
            resolved: false
          });
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[updateBlockStatus] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Calcular probabilidad de bloqueo basada en métricas
 * @param {Object} metrics - Métricas del contacto
 * @param {number} metrics.consecutiveUndelivered - Mensajes consecutivos sin entregar
 * @param {number} metrics.totalMessagesSent - Total de mensajes enviados
 * @param {number} metrics.totalMessagesDelivered - Total de mensajes entregados
 * @param {Date} metrics.lastDeliveredAt - Última vez que se entregó un mensaje
 * @returns {number} Probabilidad de bloqueo (0-100)
 */
export function calculateBlockProbability(metrics) {
  const {
    consecutiveUndelivered = 0,
    totalMessagesSent = 0,
    totalMessagesDelivered = 0,
    lastDeliveredAt = null
  } = metrics;

  let probability = 0;

  // Factor 1: Mensajes consecutivos sin entregar
  if (consecutiveUndelivered >= 5) {
    probability += 60;
  } else if (consecutiveUndelivered >= 3) {
    probability += 40;
  } else if (consecutiveUndelivered >= 2) {
    probability += 20;
  } else if (consecutiveUndelivered >= 1) {
    probability += 10;
  }

  // Factor 2: Tasa de entrega general
  if (totalMessagesSent > 0) {
    const deliveryRate = totalMessagesDelivered / totalMessagesSent;
    if (deliveryRate < 0.5) {
      probability += 30;
    } else if (deliveryRate < 0.7) {
      probability += 15;
    }
  }

  // Factor 3: Tiempo desde última entrega
  if (lastDeliveredAt) {
    const daysSinceLastDelivery = (Date.now() - new Date(lastDeliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastDelivery > 7) {
      probability += 20;
    } else if (daysSinceLastDelivery > 3) {
      probability += 10;
    }
  }

  return Math.min(100, Math.max(0, probability));
}

/**
 * Obtener contactos que necesitan verificación de bloqueo
 * @param {Object} options - Opciones
 * @param {number} options.hoursThreshold - Horas desde último mensaje (default: 72)
 * @param {number} options.limit - Límite de contactos (default: 50)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getContactsToCheck(options = {}) {
  try {
    const { hoursThreshold = 72, limit = 50 } = options;
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

    // Obtener contactos con mensajes "sent" antiguos
    const { data: contacts, error } = await supabase
      .from(CONTACTS_TABLE)
      .select(`
        *,
        whatsapp_messages!inner (
          id,
          status,
          timestamp,
          wa_message_id
        )
      `)
      .eq('whatsapp_messages.is_from_me', true)
      .eq('whatsapp_messages.status', 'sent')
      .lt('whatsapp_messages.timestamp', thresholdDate)
      .limit(limit);

    if (error) {
      console.error('[getContactsToCheck] Error:', error);
      return { data: null, error };
    }

    // Agrupar por contacto y obtener el más reciente
    const contactMap = new Map();
    (contacts || []).forEach(contact => {
      if (!contactMap.has(contact.id)) {
        contactMap.set(contact.id, contact);
      }
    });

    return { data: Array.from(contactMap.values()), error: null };
  } catch (err) {
    console.error('[getContactsToCheck] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}


