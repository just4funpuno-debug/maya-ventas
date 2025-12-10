/**
 * Servicio para pausar secuencias cuando el cliente responde
 * FASE 4: SUBFASE 4.2 - Detección de Respuestas
 * 
 * Detecta cuando un cliente responde y pausa automáticamente la secuencia
 */

import { supabase } from '../../supabaseClient';

/**
 * Verificar si el cliente respondió después de iniciar la secuencia
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{hasResponded: boolean, shouldPause: boolean, lastResponseTime: Date|null, error: Object|null}>}
 */
export async function checkClientResponse(contactId) {
  try {
    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        hasResponded: false,
        shouldPause: false,
        lastResponseTime: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Si no tiene secuencia activa, no hay nada que pausar
    if (!contact.sequence_active || !contact.sequence_id) {
      return {
        hasResponded: false,
        shouldPause: false,
        lastResponseTime: null,
        error: null
      };
    }

    // Verificar si el cliente ha respondido
    const hasResponded = contact.client_responses_count > 0;
    const lastInteractionSource = contact.last_interaction_source;
    const lastInteractionAt = contact.last_interaction_at;
    const sequenceStartedAt = contact.sequence_started_at;

    if (!hasResponded || lastInteractionSource !== 'client') {
      return {
        hasResponded: false,
        shouldPause: false,
        lastResponseTime: null,
        error: null
      };
    }

    // Verificar si la respuesta fue después de iniciar la secuencia
    let shouldPause = false;
    let lastResponseTime = null;

    if (lastInteractionAt && sequenceStartedAt) {
      const lastInteraction = new Date(lastInteractionAt);
      const sequenceStart = new Date(sequenceStartedAt);

      if (lastInteraction > sequenceStart) {
        shouldPause = true;
        lastResponseTime = lastInteraction;
      }
    } else if (lastInteractionAt) {
      // Si no hay sequence_started_at pero hay interacción del cliente, pausar
      shouldPause = true;
      lastResponseTime = new Date(lastInteractionAt);
    }

    return {
      hasResponded: true,
      shouldPause,
      lastResponseTime,
      error: null
    };
  } catch (err) {
    console.error('[checkClientResponse] Error fatal:', err);
    return {
      hasResponded: false,
      shouldPause: false,
      lastResponseTime: null,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Pausar secuencia de un contacto
 * @param {string} contactId - ID del contacto
 * @param {string} reason - Razón de la pausa (opcional)
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function pauseSequence(contactId, reason = 'client_responded') {
  try {
    // Verificar primero si debe pausarse
    const { shouldPause, error: checkError } = await checkClientResponse(contactId);

    if (checkError) {
      return { success: false, error: checkError };
    }

    if (!shouldPause) {
      // No es necesario pausar
      return { success: true, error: null };
    }

    // Actualizar contacto para pausar secuencia
    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[pauseSequence] Error actualizando contacto:', updateError);
      return { success: false, error: updateError };
    }

    console.log(`[pauseSequence] Secuencia pausada para contacto ${contactId}. Razón: ${reason}`);
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[pauseSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Reanudar secuencia de un contacto (si el cliente no ha respondido recientemente)
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function resumeSequence(contactId) {
  try {
    // Verificar que el cliente no haya respondido recientemente
    const { shouldPause, error: checkError } = await checkClientResponse(contactId);

    if (checkError) {
      return { success: false, error: checkError };
    }

    if (shouldPause) {
      return {
        success: false,
        error: { message: 'No se puede reanudar: el cliente respondió recientemente' }
      };
    }

    // Obtener información del contacto
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_id')
      .eq('id', contactId)
      .single();

    if (!contact || !contact.sequence_id) {
      return {
        success: false,
        error: { message: 'Contacto sin secuencia asignada' }
      };
    }

    // Verificar que la secuencia existe y está activa
    const { data: sequence } = await supabase
      .from('whatsapp_sequences')
      .select('active')
      .eq('id', contact.sequence_id)
      .single();

    if (!sequence || !sequence.active) {
      return {
        success: false,
        error: { message: 'Flujo no encontrado o inactivo' }
      };
    }

    // Reanudar secuencia
    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[resumeSequence] Error actualizando contacto:', updateError);
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[resumeSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Verificar y pausar secuencias para múltiples contactos
 * Útil para procesar en batch
 * @param {Array<string>} contactIds - IDs de contactos
 * @returns {Promise<{paused: Array<string>, errors: Array<Object>}>}
 */
export async function pauseSequencesBatch(contactIds) {
  try {
    const paused = [];
    const errors = [];

    for (const contactId of contactIds) {
      const { success, error } = await pauseSequence(contactId);
      
      if (success) {
        paused.push(contactId);
      } else {
        errors.push({ contactId, error });
      }
    }

    return { paused, errors };
  } catch (err) {
    console.error('[pauseSequencesBatch] Error fatal:', err);
    return {
      paused: [],
      errors: [{ error: { message: err.message || 'Error desconocido' } }]
    };
  }
}


