/**
 * Motor de evaluación de secuencias de mensajes
 * FASE 4: SUBFASE 4.2 - Motor de Evaluación
 * 
 * Evalúa cuándo enviar el siguiente mensaje de una secuencia
 */

import { supabase } from '../../supabaseClient';
import { getSequenceWithMessages } from './sequences';
import { getAccountById } from './accounts';
import { getLeadByContact, moveLeadToStage } from './leads';

/**
 * Evaluar todas las secuencias activas de una cuenta
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{contacts: Array, error: Object|null}>}
 */
export async function evaluateSequences(accountId) {
  try {
    // Obtener todos los contactos con secuencias activas para esta cuenta
    // Primero obtener contactos con secuencia activa
    const { data: contacts, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('account_id', accountId)
      .eq('sequence_active', true)
      .not('sequence_id', 'is', null);

    if (error) {
      console.error('[evaluateSequences] Error:', error);
      return { contacts: [], error };
    }

    // Filtrar solo aquellos cuya secuencia esté activa
    const contactsWithActiveSequences = [];
    for (const contact of contacts || []) {
      if (contact.sequence_id) {
        const { data: sequence } = await supabase
          .from('whatsapp_sequences')
          .select('active')
          .eq('id', contact.sequence_id)
          .single();
        
        if (sequence && sequence.active) {
          contactsWithActiveSequences.push(contact);
        }
      }
    }

    // Evaluar cada contacto
    const contactsToProcess = [];
    for (const contact of contactsWithActiveSequences) {
      const evaluation = await evaluateContactSequence(contact.id);
      if (evaluation.shouldSend) {
        contactsToProcess.push({
          contact,
          evaluation
        });
      }
    }

    return { contacts: contactsToProcess, error: null };
  } catch (err) {
    console.error('[evaluateSequences] Error fatal:', err);
    return { contacts: [], error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Evaluar secuencia de un contacto específico
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{shouldSend: boolean, nextMessage: Object|null, timeUntilSend: number|null, error: Object|null}>}
 */
export async function evaluateContactSequence(contactId) {
  try {
    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        shouldSend: false,
        nextMessage: null,
        timeUntilSend: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Verificar si tiene secuencia activa
    if (!contact.sequence_active || !contact.sequence_id) {
      return {
        shouldSend: false,
        nextMessage: null,
        timeUntilSend: null,
        error: null
      };
    }

    // Verificar si el cliente respondió (pausar secuencia)
    if (contact.client_responses_count > 0 && contact.last_interaction_source === 'client') {
      // Verificar si la última interacción del cliente fue después del inicio de la secuencia
      if (contact.sequence_started_at && contact.last_interaction_at) {
        const sequenceStart = new Date(contact.sequence_started_at);
        const lastInteraction = new Date(contact.last_interaction_at);
        
        if (lastInteraction > sequenceStart) {
          // Cliente respondió después de iniciar la secuencia, pausar
          return {
            shouldSend: false,
            nextMessage: null,
            timeUntilSend: null,
            error: null,
            reason: 'client_responded'
          };
        }
      }
    }

    // Obtener la secuencia y sus mensajes
    const { data: sequence, error: seqError } = await getSequenceWithMessages(contact.sequence_id);
    
    if (seqError || !sequence || !sequence.active) {
      return {
        shouldSend: false,
        nextMessage: null,
        timeUntilSend: null,
        error: seqError || { message: 'Flujo no encontrado o inactivo' }
      };
    }

    // Verificar si hay mensajes en la secuencia
    if (!sequence.messages || sequence.messages.length === 0) {
      return {
        shouldSend: false,
        nextMessage: null,
        timeUntilSend: null,
        error: { message: 'Flujo sin mensajes' }
      };
    }

    // FASE 7: Procesar cambios de etapa pendientes antes de buscar siguiente mensaje
    // Los cambios de etapa se procesan inmediatamente (delay = 0)
    if (contact.account_id) {
      const { processed, newPosition, error: stageChangeError } = await processPendingStageChanges(
        contactId,
        contact.account_id,
        sequence,
        contact.sequence_position || 0
      );

      if (processed && !stageChangeError) {
        // Si se procesaron cambios de etapa, actualizar la posición del contacto
        // y buscar el siguiente mensaje desde la nueva posición
        const { error: updateError } = await supabase
          .from('whatsapp_contacts')
          .update({
            sequence_position: newPosition,
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId);

        if (!updateError) {
          // Actualizar posición en memoria para la siguiente búsqueda
          contact.sequence_position = newPosition;
        }
      }
    }

    // Obtener siguiente mensaje a enviar
    const nextMessage = await getNextSequenceMessage(contactId, sequence);
    
    if (!nextMessage || !nextMessage.message) {
      // Secuencia completada
      return {
        shouldSend: false,
        nextMessage: null,
        timeUntilSend: null,
        error: null,
        reason: 'sequence_completed'
      };
    }

    // Verificar si es momento de enviar
    // FASE 6: Pasar delay acumulado de pausas consecutivas
    const accumulatedDelay = nextMessage.accumulatedPauseDelay || 0;
    const shouldSend = await shouldSendNextMessage(contactId, nextMessage.message, contact, accumulatedDelay);
    
    if (!shouldSend.shouldSend) {
      return {
        shouldSend: false,
        nextMessage: nextMessage.message,
        timeUntilSend: shouldSend.timeUntilSend,
        error: null,
        reason: shouldSend.reason
      };
    }

    return {
      shouldSend: true,
      nextMessage: nextMessage.message,
      timeUntilSend: 0,
      error: null
    };
  } catch (err) {
    console.error('[evaluateContactSequence] Error fatal:', err);
    return {
      shouldSend: false,
      nextMessage: null,
      timeUntilSend: null,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Verificar si el cliente respondió después del último mensaje enviado
 * FASE 2: SUBFASE 2.1 - Pausas Inteligentes
 * @param {string} contactId - ID del contacto
 * @param {Date} lastMessageTime - Fecha del último mensaje enviado
 * @returns {Promise<{hasResponded: boolean, lastResponseTime: Date|null}>}
 */
async function checkIfClientRespondedAfterMessage(contactId, lastMessageTime) {
  try {
    // Obtener el último mensaje del cliente después del último mensaje enviado
    const { data: clientMessages, error } = await supabase
      .from('whatsapp_messages')
      .select('timestamp')
      .eq('contact_id', contactId)
      .eq('is_from_me', false)
      .gt('timestamp', lastMessageTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[checkIfClientRespondedAfterMessage] Error:', error);
      return { hasResponded: false, lastResponseTime: null };
    }

    if (clientMessages && clientMessages.length > 0) {
      return {
        hasResponded: true,
        lastResponseTime: new Date(clientMessages[0].timestamp)
      };
    }

    return { hasResponded: false, lastResponseTime: null };
  } catch (err) {
    console.error('[checkIfClientRespondedAfterMessage] Error fatal:', err);
    return { hasResponded: false, lastResponseTime: null };
  }
}

/**
 * Calcular días sin respuesta del cliente
 * FASE 2: SUBFASE 2.1 - Pausas Inteligentes
 * @param {string} contactId - ID del contacto
 * @returns {Promise<number>} - Días sin respuesta (0 si respondió recientemente)
 */
async function getDaysSinceLastResponse(contactId) {
  try {
    // Obtener el último mensaje del cliente
    const { data: lastClientMessage, error } = await supabase
      .from('whatsapp_messages')
      .select('timestamp')
      .eq('contact_id', contactId)
      .eq('is_from_me', false)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[getDaysSinceLastResponse] Error:', error);
      return 0; // Por defecto, asumir que no hay días sin respuesta
    }

    if (!lastClientMessage) {
      // Si nunca ha respondido, retornar un número grande
      return 999;
    }

    const now = new Date();
    const lastResponseTime = new Date(lastClientMessage.timestamp);
    const daysSince = (now - lastResponseTime) / (1000 * 60 * 60 * 24); // días

    return Math.floor(daysSince);
  } catch (err) {
    console.error('[getDaysSinceLastResponse] Error fatal:', err);
    return 0;
  }
}

/**
 * Verificar si es momento de enviar el siguiente mensaje
 * FASE 2: SUBFASE 2.1 - Pausas Inteligentes: Soporte para pause_type
 * FASE 6: Suma de pausas consecutivas
 * @param {string} contactId - ID del contacto
 * @param {Object} nextMessage - Siguiente mensaje a enviar
 * @param {Object} contact - Datos del contacto
 * @param {number} accumulatedPauseDelay - Delay acumulado de pausas consecutivas (horas)
 * @returns {Promise<{shouldSend: boolean, timeUntilSend: number, reason: string}>}
 */
export async function shouldSendNextMessage(contactId, nextMessage, contact, accumulatedPauseDelay = 0) {
  try {
    const now = new Date();
    const pauseType = nextMessage.pause_type || 'fixed_delay'; // Por defecto, comportamiento actual
    
    // Si es el primer mensaje (sequence_position === 0)
    if (contact.sequence_position === 0) {
      // Verificar si la secuencia ya comenzó
      if (contact.sequence_started_at) {
        const startedAt = new Date(contact.sequence_started_at);
        const timeSinceStart = (now - startedAt) / (1000 * 60 * 60); // horas
        
        // Si han pasado menos de 1 hora desde el inicio, esperar
        if (timeSinceStart < 1) {
          return {
            shouldSend: false,
            timeUntilSend: (1 - timeSinceStart) * 60, // minutos
            reason: 'waiting_initial_delay'
          };
        }
      }
      
      // Primer mensaje, enviar inmediatamente si no hay delay
      // FASE 6: Considerar delay acumulado de pausas consecutivas
      const firstMessageDelay = nextMessage.delay_hours_from_previous || 0;
      const firstTotalDelay = firstMessageDelay + (accumulatedPauseDelay || 0);
      if (pauseType === 'fixed_delay' && firstTotalDelay === 0) {
        return {
          shouldSend: true,
          timeUntilSend: 0,
          reason: 'ready'
        };
      }
    }

    // Obtener el último mensaje enviado de esta secuencia
    const { data: lastMessage, error } = await supabase
      .from('whatsapp_messages')
      .select('timestamp, sequence_message_id')
      .eq('contact_id', contactId)
      .eq('sequence_message_id', contact.sequence_position)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[shouldSendNextMessage] Error obteniendo último mensaje:', error);
      return {
        shouldSend: false,
        timeUntilSend: null,
        reason: 'error'
      };
    }

    // Si no hay último mensaje, es el primer mensaje
    if (!lastMessage) {
      // FASE 6: Considerar delay acumulado de pausas consecutivas
      const noLastMessageDelay = nextMessage.delay_hours_from_previous || 0;
      const noLastTotalDelay = noLastMessageDelay + (accumulatedPauseDelay || 0);
      if (pauseType === 'fixed_delay' && noLastTotalDelay === 0) {
        return {
          shouldSend: true,
          timeUntilSend: 0,
          reason: 'ready'
        };
      } else if (pauseType === 'fixed_delay') {
        return {
          shouldSend: false,
          timeUntilSend: noLastTotalDelay * 60, // minutos
          reason: 'waiting_delay'
        };
      }
      // Para otros tipos de pausa, continuar con la lógica específica
    }

    const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp) : null;

    // Evaluar según el tipo de pausa
    if (pauseType === 'until_message') {
      // Pausar hasta recibir mensaje del cliente
      if (!lastMessageTime) {
        // No hay mensaje anterior, enviar inmediatamente
        return {
          shouldSend: true,
          timeUntilSend: 0,
          reason: 'ready'
        };
      }

      // Verificar si el cliente respondió después del último mensaje
      const { hasResponded } = await checkIfClientRespondedAfterMessage(contactId, lastMessageTime);
      
      if (!hasResponded) {
        return {
          shouldSend: false,
          timeUntilSend: null,
          reason: 'waiting_for_message'
        };
      }

      // Cliente respondió, enviar mensaje
      return {
        shouldSend: true,
        timeUntilSend: 0,
        reason: 'ready'
      };
    } else if (pauseType === 'until_days_without_response') {
      // Pausar hasta X días sin respuesta
      const daysWithoutResponse = nextMessage.days_without_response || 0;
      
      if (daysWithoutResponse <= 0) {
        // Si no se especificó días, usar comportamiento por defecto
        return {
          shouldSend: true,
          timeUntilSend: 0,
          reason: 'ready'
        };
      }

      const daysSince = await getDaysSinceLastResponse(contactId);
      
      if (daysSince < daysWithoutResponse) {
        return {
          shouldSend: false,
          timeUntilSend: null,
          reason: `waiting_days_without_response: ${daysSince}/${daysWithoutResponse} días`
        };
      }

      // Han pasado los días requeridos sin respuesta
      return {
        shouldSend: true,
        timeUntilSend: 0,
        reason: 'ready'
      };
    } else {
      // pauseType === 'fixed_delay' (comportamiento original + interrupción por keywords)
      // FASE 6: Calcular delay total (delay del mensaje + pausas consecutivas acumuladas)
      const messageDelay = nextMessage.delay_hours_from_previous || 0;
      const totalDelayRequired = messageDelay + (accumulatedPauseDelay || 0);
      
      // FASE 2: SUBFASE 2.1 - Verificar interrupción por keywords o cualquier mensaje
      if (nextMessage.pause_interrupt_keywords && lastMessageTime) {
        // Determinar tipo de interrupción
        const interruptType = nextMessage.pause_interrupt_keywords.interrupt_type || 
          (nextMessage.pause_interrupt_keywords.keywords && nextMessage.pause_interrupt_keywords.keywords.length > 0 
            ? 'keywords' 
            : 'any_message');
        
        let hasInterruptMessage = false;
        
        if (interruptType === 'any_message') {
          // Cualquier respuesta del cliente interrumpe
          const interruptMessage = await getLastClientMessageAfter(contactId, lastMessageTime);
          hasInterruptMessage = interruptMessage !== null;
        } else {
          // Solo interrumpe si tiene las keywords específicas
          hasInterruptMessage = await checkMessageKeywords(
            contactId,
            nextMessage.pause_interrupt_keywords,
            lastMessageTime
          );
        }

        if (hasInterruptMessage) {
          // La pausa fue interrumpida por keywords
          // Verificar si hay delay opcional después de la interrupción
          const delayAfterInterrupt = nextMessage.pause_delay_after_interrupt || 0;

          if (delayAfterInterrupt > 0) {
            // Hay delay después de interrupción, verificar si ya pasó
            const interruptMessage = await getLastClientMessageAfter(contactId, lastMessageTime);
            
            if (interruptMessage && interruptMessage.timestamp) {
              const interruptTime = new Date(interruptMessage.timestamp);
              const hoursSinceInterrupt = (now - interruptTime) / (1000 * 60 * 60);

              if (hoursSinceInterrupt >= delayAfterInterrupt) {
                // Ya pasó el delay después de interrupción
                return {
                  shouldSend: true,
                  timeUntilSend: 0,
                  reason: 'interrupted_and_delay_passed'
                };
              } else {
                // Aún esperando el delay después de interrupción
                const timeRemaining = delayAfterInterrupt - hoursSinceInterrupt;
                return {
                  shouldSend: false,
                  timeUntilSend: timeRemaining * 60, // minutos
                  reason: 'waiting_delay_after_interrupt'
                };
              }
            }
          }

          // No hay delay después de interrupción, o no se encontró el mensaje
          // Enviar inmediatamente
          return {
            shouldSend: true,
            timeUntilSend: 0,
            reason: 'interrupted_by_keywords'
          };
        }
      }
      
      // Si no hay interrupción, comportamiento normal de fixed_delay
      if (!lastMessageTime) {
        if (totalDelayRequired === 0) {
          return {
            shouldSend: true,
            timeUntilSend: 0,
            reason: 'ready'
          };
        } else {
          return {
            shouldSend: false,
            timeUntilSend: totalDelayRequired * 60, // minutos
            reason: 'waiting_delay'
          };
        }
      }

      // Calcular tiempo desde último mensaje
      const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
      const delayRequired = totalDelayRequired;

      if (hoursSinceLastMessage >= delayRequired) {
        return {
          shouldSend: true,
          timeUntilSend: 0,
          reason: 'ready'
        };
      } else {
        const timeRemaining = delayRequired - hoursSinceLastMessage;
        return {
          shouldSend: false,
          timeUntilSend: timeRemaining * 60, // minutos
          reason: 'waiting_delay'
        };
      }
    }
  } catch (err) {
    console.error('[shouldSendNextMessage] Error fatal:', err);
    return {
      shouldSend: false,
      timeUntilSend: null,
      reason: 'error'
    };
  }
}

/**
 * Calcular cuándo enviar el siguiente mensaje
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{nextSendTime: Date|null, hoursUntilSend: number|null, error: Object|null}>}
 */
export async function calculateNextMessageTime(contactId) {
  try {
    const evaluation = await evaluateContactSequence(contactId);
    
    if (!evaluation.nextMessage) {
      return {
        nextSendTime: null,
        hoursUntilSend: null,
        error: evaluation.error
      };
    }

    if (evaluation.shouldSend) {
      return {
        nextSendTime: new Date(),
        hoursUntilSend: 0,
        error: null
      };
    }

    const now = new Date();
    const nextSendTime = new Date(now.getTime() + (evaluation.timeUntilSend || 0) * 60 * 1000);
    const hoursUntilSend = evaluation.timeUntilSend ? evaluation.timeUntilSend / 60 : null;

    return {
      nextSendTime,
      hoursUntilSend,
      error: null
    };
  } catch (err) {
    console.error('[calculateNextMessageTime] Error fatal:', err);
    return {
      nextSendTime: null,
      hoursUntilSend: null,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Normalizar texto removiendo tildes y convirtiendo a minúsculas
 * FASE 1: SUBFASE 2.1 - Normalización para búsqueda de keywords
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con tildes
    .replace(/[\u0300-\u036f]/g, ''); // Remueve marcas diacríticas (tildes)
}

/**
 * Verificar si un mensaje contiene palabras clave
 * FASE 1: SUBFASE 2.1 - Detección de keywords en mensajes
 * @param {string} messageText - Texto del mensaje a verificar
 * @param {Object} keywordsConfig - Configuración de keywords {keywords: Array, match_type: 'any'|'all'}
 * @returns {boolean} - true si coincide, false si no
 */
function checkMessageContainsKeywords(messageText, keywordsConfig) {
  if (!messageText || !keywordsConfig || !keywordsConfig.keywords) {
    return false;
  }

  const keywords = keywordsConfig.keywords || [];
  const matchType = keywordsConfig.match_type || 'any'; // 'any' (OR) por defecto
  
  if (keywords.length === 0) {
    return false;
  }

  // Normalizar el texto del mensaje
  const normalizedMessage = normalizeText(messageText);

  // Normalizar todas las keywords
  const normalizedKeywords = keywords.map(kw => normalizeText(kw));

  if (matchType === 'all') {
    // AND: todas las keywords deben estar presentes
    return normalizedKeywords.every(keyword => normalizedMessage.includes(keyword));
  } else {
    // OR (any): al menos una keyword debe estar presente
    return normalizedKeywords.some(keyword => normalizedMessage.includes(keyword));
  }
}

/**
 * Buscar keywords en mensajes del cliente después del último envío
 * FASE 1: SUBFASE 2.1 - Búsqueda de keywords en mensajes del cliente
 * @param {string} contactId - ID del contacto
 * @param {Object} keywordsConfig - Configuración de keywords
 * @param {Date} lastSentMessageTime - Fecha del último mensaje enviado
 * @returns {Promise<boolean>} - true si se encontraron keywords, false si no
 */
async function checkMessageKeywords(contactId, keywordsConfig, lastSentMessageTime) {
  try {
    if (!keywordsConfig || !keywordsConfig.keywords || keywordsConfig.keywords.length === 0) {
      return false;
    }

    // Buscar el último mensaje del cliente después del último mensaje enviado
    const { data: clientMessages, error } = await supabase
      .from('whatsapp_messages')
      .select('text_content, timestamp')
      .eq('contact_id', contactId)
      .eq('is_from_me', false)
      .eq('message_type', 'text') // Solo buscar en mensajes de texto
      .gt('timestamp', lastSentMessageTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1); // Solo el último mensaje

    if (error) {
      console.error('[checkMessageKeywords] Error obteniendo mensajes:', error);
      return false;
    }

    if (!clientMessages || clientMessages.length === 0) {
      return false;
    }

    // Verificar si el último mensaje contiene las keywords
    const lastMessage = clientMessages[0];
    if (!lastMessage.text_content) {
      return false;
    }

    return checkMessageContainsKeywords(lastMessage.text_content, keywordsConfig);
  } catch (err) {
    console.error('[checkMessageKeywords] Error fatal:', err);
    return false;
  }
}

/**
 * Obtener el último mensaje del cliente después de una fecha específica
 * FASE 2: SUBFASE 2.1 - Helper para interrupción de pausas
 * @param {string} contactId - ID del contacto
 * @param {Date} afterTime - Fecha después de la cual buscar
 * @returns {Promise<Object|null>} - Mensaje del cliente o null
 */
async function getLastClientMessageAfter(contactId, afterTime) {
  try {
    if (!afterTime) {
      return null;
    }

    const { data: clientMessages, error } = await supabase
      .from('whatsapp_messages')
      .select('text_content, timestamp')
      .eq('contact_id', contactId)
      .eq('is_from_me', false)
      .eq('message_type', 'text')
      .gt('timestamp', afterTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[getLastClientMessageAfter] Error obteniendo mensajes:', error);
      return null;
    }

    if (!clientMessages || clientMessages.length === 0) {
      return null;
    }

    return clientMessages[0];
  } catch (err) {
    console.error('[getLastClientMessageAfter] Error fatal:', err);
    return null;
  }
}

/**
 * Evaluar condición de un mensaje
 * FASE 3: SUBFASE 3.1 - Condiciones Básicas
 * FASE 1: SUBFASE 2.1 - Extendido para soportar keywords
 * @param {string} contactId - ID del contacto
 * @param {string} conditionType - Tipo de condición ('none', 'if_responded', 'if_not_responded', 'if_message_contains')
 * @param {Object} conditionConfig - Configuración adicional (keywords, etc.)
 * @param {Date} lastSentMessageTime - Fecha del último mensaje enviado (para keywords)
 * @returns {Promise<boolean>} - true si la condición se cumple, false si no
 */
async function evaluateCondition(contactId, conditionType, conditionConfig = null, lastSentMessageTime = null) {
  try {
    // Si no hay condición, siempre retornar true
    if (!conditionType || conditionType === 'none') {
      return true;
    }

    // FASE 1: SUBFASE 2.1 - Condición basada en keywords
    if (conditionType === 'if_message_contains') {
      if (!lastSentMessageTime) {
        // Si no hay fecha de último mensaje, buscar desde el inicio de la secuencia
        const { data: contact } = await supabase
          .from('whatsapp_contacts')
          .select('sequence_started_at')
          .eq('id', contactId)
          .single();
        
        if (contact && contact.sequence_started_at) {
          lastSentMessageTime = new Date(contact.sequence_started_at);
        } else {
          // Si no hay inicio de secuencia, buscar desde hace 30 días
          lastSentMessageTime = new Date();
          lastSentMessageTime.setDate(lastSentMessageTime.getDate() - 30);
        }
      }
      
      if (!conditionConfig || !conditionConfig.keywords) {
        console.warn('[evaluateCondition] Condición if_message_contains sin keywords configuradas');
        return false;
      }

      return await checkMessageKeywords(contactId, conditionConfig, lastSentMessageTime);
    }

    // Obtener información del contacto (para condiciones antiguas)
    const { data: contact, error } = await supabase
      .from('whatsapp_contacts')
      .select('client_responses_count, last_interaction_source, sequence_started_at, last_interaction_at')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      console.error('[evaluateCondition] Error obteniendo contacto:', error);
      return false; // Por seguridad, si hay error, no enviar
    }

    // Verificar si el cliente ha respondido
    const hasResponded = contact.client_responses_count > 0 && 
                         contact.last_interaction_source === 'client';

    // Verificar si la respuesta fue después del inicio de la secuencia
    let respondedAfterSequence = false;
    if (hasResponded && contact.sequence_started_at && contact.last_interaction_at) {
      const sequenceStart = new Date(contact.sequence_started_at);
      const lastInteraction = new Date(contact.last_interaction_at);
      respondedAfterSequence = lastInteraction > sequenceStart;
    }

    // Evaluar según tipo de condición
    if (conditionType === 'if_responded') {
      return respondedAfterSequence;
    } else if (conditionType === 'if_not_responded') {
      return !respondedAfterSequence;
    }

    // Por defecto, retornar true (sin condición)
    return true;
  } catch (err) {
    console.error('[evaluateCondition] Error fatal:', err);
    return false; // Por seguridad, si hay error, no enviar
  }
}

/**
 * Obtener mensaje por ID en una secuencia
 * FASE 4: SUBFASE 4.1 - Ramificaciones
 * @param {Object} sequence - Secuencia con mensajes
 * @param {string} messageId - ID del mensaje a buscar
 * @returns {Object|null} - Mensaje encontrado o null
 */
function getMessageById(sequence, messageId) {
  if (!messageId || !sequence || !sequence.messages) {
    return null;
  }

  return sequence.messages.find(msg => msg.id === messageId) || null;
}

/**
 * FASE 6: Calcular delay acumulado de pausas consecutivas antes de un mensaje
 * Suma todos los delays de pausas consecutivas (step_type = 'pause') que aparecen
 * antes del mensaje objetivo, sin interrupciones.
 * 
 * @param {Array} sortedMessages - Mensajes ordenados por order_position
 * @param {number} targetPosition - Posición del mensaje objetivo
 * @param {number} startPosition - Posición desde donde empezar a buscar hacia atrás
 * @returns {number} - Total de horas acumuladas de pausas consecutivas
 */
function calculateConsecutivePausesDelay(sortedMessages, targetPosition, startPosition) {
  if (!sortedMessages || sortedMessages.length === 0) {
    return 0;
  }

  let totalDelay = 0;
  
  // Buscar mensajes entre startPosition y targetPosition
  const messagesBetween = sortedMessages.filter(msg => {
    const msgPos = msg.order_position || 0;
    return msgPos > startPosition && msgPos < targetPosition;
  });

  // Si no hay mensajes intermedios, no hay pausas consecutivas
  if (messagesBetween.length === 0) {
    return 0;
  }

  // Buscar pausas consecutivas inmediatamente antes del mensaje objetivo
  // Empezar desde el mensaje más cercano al objetivo y retroceder
  const reversedMessages = [...messagesBetween].reverse();
  
  for (const msg of reversedMessages) {
    // Si es una pausa (step_type = 'pause' o pause_type está definido), sumar su delay
    const isPause = msg.step_type === 'pause' || 
                    (msg.pause_type && msg.pause_type === 'fixed_delay');
    
    if (isPause && msg.pause_type === 'fixed_delay') {
      // Solo sumar delays fijos (las otras pausas se manejan diferente)
      totalDelay += msg.delay_hours_from_previous || 0;
    } else {
      // Si encontramos un paso que no es pausa (mensaje o cambio de etapa),
      // rompemos la cadena de pausas consecutivas
      break;
    }
  }

  return totalDelay;
}

/**
 * FASE 6: Obtener el siguiente mensaje real (no pausa ni cambio de etapa)
 * y calcular delay acumulado de pausas consecutivas
 * 
 * @param {Array} sortedMessages - Mensajes ordenados por order_position
 * @param {number} currentPosition - Posición actual del contacto
 * @returns {Object} - { nextMessage, accumulatedPauseDelay, stepsSkipped }
 */
function getNextRealMessageWithPauseDelay(sortedMessages, currentPosition) {
  if (!sortedMessages || sortedMessages.length === 0) {
    return {
      nextMessage: null,
      accumulatedPauseDelay: 0,
      stepsSkipped: 0
    };
  }

  let accumulatedDelay = 0;
  let stepsSkipped = 0;
  let lastPosition = currentPosition;

  // Buscar el siguiente paso después de currentPosition
  for (let i = 0; i < sortedMessages.length; i++) {
    const msg = sortedMessages[i];
    const msgPos = msg.order_position || 0;

    // Solo considerar mensajes después de la posición actual
    if (msgPos <= currentPosition) {
      continue;
    }

    const stepType = msg.step_type || 'message'; // Compatibilidad con registros antiguos

    // Si es una pausa (step_type = 'pause'), acumular su delay y continuar
    if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
      accumulatedDelay += msg.delay_hours_from_previous || 0;
      stepsSkipped++;
      lastPosition = msgPos;
      continue; // Saltar esta pausa y seguir buscando
    }

    // Si es un cambio de etapa, solo saltarlo (no tiene delay)
    if (stepType === 'stage_change') {
      stepsSkipped++;
      lastPosition = msgPos;
      continue; // Saltar y seguir buscando
    }

    // Si es una condición, solo saltarlo (no tiene delay, solo ramifica)
    if (stepType === 'condition') {
      stepsSkipped++;
      lastPosition = msgPos;
      continue; // Saltar y seguir buscando
    }

    // Si llegamos aquí, es un mensaje real
    // El delay acumulado ya está calculado (suma de todas las pausas consecutivas anteriores)
    return {
      nextMessage: msg,
      accumulatedPauseDelay: accumulatedDelay,
      stepsSkipped: stepsSkipped
    };
  }

  // No se encontró ningún mensaje real después de las pausas
  return {
    nextMessage: null,
    accumulatedPauseDelay: accumulatedDelay,
    stepsSkipped: stepsSkipped
  };
}

/**
 * FASE 7: Procesar cambio de etapa automático
 * Ejecuta un cambio de etapa cuando se encuentra un paso tipo 'stage_change'
 * 
 * @param {string} contactId - ID del contacto
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {Object} stageChangeStep - Paso de cambio de etapa con target_stage_name
 * @param {number} stepPosition - Posición del paso en la secuencia
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
async function processStageChangeStep(contactId, accountId, stageChangeStep, stepPosition) {
  try {
    const targetStageName = stageChangeStep.target_stage_name;
    
    if (!targetStageName || targetStageName.trim() === '') {
      console.warn('[processStageChangeStep] Paso de cambio de etapa sin target_stage_name');
      return { success: false, error: { message: 'Paso de cambio de etapa sin etapa destino' } };
    }

    // 1. Obtener product_id desde account_id
    const { data: account, error: accountError } = await getAccountById(accountId);
    
    if (accountError || !account) {
      console.error('[processStageChangeStep] Error obteniendo cuenta:', accountError);
      return { success: false, error: accountError || { message: 'Cuenta no encontrada' } };
    }

    if (!account.product_id) {
      console.warn('[processStageChangeStep] Cuenta sin product_id, no se puede cambiar etapa');
      return { success: false, error: { message: 'La cuenta no tiene producto asociado' } };
    }

    // 2. Obtener lead del contacto para este producto
    const { data: lead, error: leadError } = await getLeadByContact(contactId, account.product_id);
    
    if (leadError) {
      console.error('[processStageChangeStep] Error obteniendo lead:', leadError);
      return { success: false, error: leadError };
    }

    if (!lead) {
      console.warn('[processStageChangeStep] Contacto sin lead, creando lead automáticamente');
      // Opcional: crear lead automáticamente si no existe
      // Por ahora, retornar error para que el usuario cree el lead manualmente
      return { 
        success: false, 
        error: { 
          message: 'El contacto no tiene un lead asociado. Crea un lead primero para usar cambios automáticos de etapa.',
          code: 'NO_LEAD_FOUND'
        } 
      };
    }

    // 3. Mover lead a la etapa destino
    // moveLeadToStage ya maneja:
    // - Detener el flujo actual si la etapa destino tiene un flujo diferente
    // - Iniciar automáticamente el nuevo flujo si la etapa destino tiene uno asignado
    // - Registrar actividad
    const { data: updatedLead, error: moveError } = await moveLeadToStage(
      lead.id,
      targetStageName,
      null, // userId (null para cambios automáticos)
      account.product_id
    );

    if (moveError) {
      console.error('[processStageChangeStep] Error moviendo lead a etapa:', moveError);
      return { success: false, error: moveError };
    }

    // 4. Actualizar posición del contacto para marcar este paso como procesado
    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_position: stepPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[processStageChangeStep] Error actualizando posición del contacto:', updateError);
      // No retornar error, el cambio de etapa ya se hizo
      // Solo loguear el error
    }

    console.log(`[processStageChangeStep] ✅ Lead movido a etapa "${targetStageName}" automáticamente`);
    return { success: true, error: null };
  } catch (err) {
    console.error('[processStageChangeStep] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * FASE 7: Buscar y procesar cambios de etapa pendientes
 * Busca cambios de etapa que están pendientes de procesar antes del siguiente mensaje
 * 
 * @param {string} contactId - ID del contacto
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {Object} sequence - Secuencia con mensajes
 * @param {number} currentPosition - Posición actual del contacto
 * @returns {Promise<{processed: boolean, newPosition: number, error: Object|null}>}
 */
async function processPendingStageChanges(contactId, accountId, sequence, currentPosition) {
  try {
    const messages = sequence.messages || [];
    const sortedMessages = [...messages].sort((a, b) => 
      (a.order_position || 0) - (b.order_position || 0)
    );

    // FASE 7: Buscar cambios de etapa pendientes que estén listos para procesar
    // Solo procesamos cambios de etapa que:
    // 1. Están después de currentPosition
    // 2. No tienen pausas intermedias (son inmediatos, delay = 0)
    // 3. O están después de pausas que ya se cumplieron
    
    // Buscar el PRIMER cambio de etapa inmediatamente después de la posición actual
    // (sin pausas intermedias que bloqueen)
    let nextStageChange = null;
    let foundPauseBeforeStageChange = false;
    
    for (const msg of sortedMessages) {
      const msgPos = msg.order_position || 0;
      
      // Solo considerar mensajes después de la posición actual
      if (msgPos <= currentPosition) {
        continue;
      }
      
      const stepType = msg.step_type || 'message';
      
      // Si encontramos una pausa antes de un cambio de etapa, no procesar todavía
      if (stepType === 'pause' && msg.pause_type === 'fixed_delay' && msg.delay_hours_from_previous > 0) {
        // Hay una pausa con delay antes del cambio de etapa
        // El cambio de etapa debe esperar
        foundPauseBeforeStageChange = true;
        break;
      }
      
      // Si encontramos un cambio de etapa antes de cualquier pausa o mensaje
      if (stepType === 'stage_change' && !nextStageChange) {
        nextStageChange = msg;
        // Continuar buscando para ver si hay pausas después
        continue;
      }
      
      // Si encontramos un mensaje antes de encontrar un cambio de etapa, no hay cambios inmediatos
      if (stepType === 'message' && !nextStageChange) {
        break;
      }
    }

    // Procesar solo el primer cambio de etapa si no hay pausas bloqueándolo
    let lastProcessedPosition = currentPosition;
    if (nextStageChange && !foundPauseBeforeStageChange) {
      const { success, error } = await processStageChangeStep(
        contactId,
        accountId,
        nextStageChange,
        nextStageChange.order_position || 0
      );

      if (success) {
        lastProcessedPosition = nextStageChange.order_position || 0;
        console.log(`[processPendingStageChanges] ✅ Cambio de etapa procesado: posición ${lastProcessedPosition} -> "${nextStageChange.target_stage_name}"`);
      } else {
        console.error(`[processPendingStageChanges] ❌ Error procesando cambio de etapa:`, error);
        // Si falla, no actualizar posición para que se intente de nuevo en el siguiente ciclo
      }
    }

    return {
      processed: pendingStageChanges.length > 0,
      newPosition: lastProcessedPosition,
      error: null
    };
  } catch (err) {
    console.error('[processPendingStageChanges] Error fatal:', err);
    return {
      processed: false,
      newPosition: currentPosition,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Obtener siguiente mensaje de secuencia a enviar
 * FASE 3: SUBFASE 3.1 - Condiciones Básicas: Evaluar condition_type
 * FASE 4: SUBFASE 4.1 - Ramificaciones: Usar next_message_if_true/false
 * FASE 7: Procesa cambios de etapa automáticamente antes de buscar mensaje
 * @param {string} contactId - ID del contacto
 * @param {Object} sequence - Secuencia con mensajes
 * @param {number} startPosition - Posición inicial para buscar (opcional, para recursión)
 * @returns {Promise<{message: Object|null, position: number, error: Object|null}>}
 */
export async function getNextSequenceMessage(contactId, sequence, startPosition = null) {
  try {
    // Obtener posición actual del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_position')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        message: null,
        position: -1,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const currentPosition = startPosition !== null ? startPosition : (contact.sequence_position || 0);
    const messages = sequence.messages || [];
    
    // Ordenar mensajes por order_position
    const sortedMessages = [...messages].sort((a, b) => 
      (a.order_position || 0) - (b.order_position || 0)
    );

    // FASE 6: Obtener siguiente mensaje real saltando pausas consecutivas
    const { nextMessage: nextRealMessage, accumulatedPauseDelay, stepsSkipped } = 
      getNextRealMessageWithPauseDelay(sortedMessages, currentPosition);

    if (!nextRealMessage) {
      // No hay más mensajes reales, secuencia completada
      return {
        message: null,
        position: -1,
        accumulatedPauseDelay: accumulatedPauseDelay || 0,
        error: null
      };
    }

    const nextMessage = nextRealMessage;
    const stepType = nextMessage.step_type || 'message';
    const conditionType = nextMessage.condition_type || 'none';

    // Si es un paso de condición, procesarlo y ramificar (no es un mensaje para enviar)
    if (stepType === 'condition') {
      // Obtener fecha del último mensaje enviado para condiciones de keywords
      let lastSentMessageTime = null;
      if (conditionType === 'if_message_contains') {
        const { data: lastSentMessage } = await supabase
          .from('whatsapp_messages')
          .select('timestamp')
          .eq('contact_id', contactId)
          .eq('is_from_me', true)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastSentMessage && lastSentMessage.timestamp) {
          lastSentMessageTime = new Date(lastSentMessage.timestamp);
        }
      }
      
      // Preparar configuración de keywords si aplica
      const conditionConfig = (conditionType === 'if_message_contains' && nextMessage.condition_keywords) 
        ? nextMessage.condition_keywords 
        : null;
      
      const conditionResult = await evaluateCondition(
        contactId, 
        conditionType, 
        conditionConfig, 
        lastSentMessageTime
      );
      
      // Buscar siguiente paso según ramificación
      let targetStepId = null;
      if (conditionResult && nextMessage.next_message_if_true) {
        targetStepId = nextMessage.next_message_if_true;
      } else if (!conditionResult && nextMessage.next_message_if_false) {
        targetStepId = nextMessage.next_message_if_false;
      }

      // Si hay ramificación, buscar el paso objetivo
      if (targetStepId) {
        const targetStep = getMessageById(sequence, targetStepId);
        if (targetStep) {
          // Actualizar posición del contacto al paso de condición
          await supabase
            .from('whatsapp_contacts')
            .update({ sequence_position: nextMessage.order_position })
            .eq('id', contactId);

          // Buscar el siguiente paso desde el objetivo (puede ser otro paso de condición, pausa, etc.)
          return await getNextSequenceMessage(contactId, sequence, targetStep.order_position - 1);
        }
      }

      // Si no hay ramificación configurada, continuar con el siguiente paso
      return await getNextSequenceMessage(contactId, sequence, nextMessage.order_position);
    }

    // FASE 4: SUBFASE 4.1 - Si hay condición en mensaje, evaluarla y verificar ramificaciones
    // FASE 1: SUBFASE 2.1 - Extendido para soportar keywords
    if (conditionType !== 'none') {
      // Obtener fecha del último mensaje enviado para condiciones de keywords
      let lastSentMessageTime = null;
      if (conditionType === 'if_message_contains') {
        const { data: lastSentMessage } = await supabase
          .from('whatsapp_messages')
          .select('timestamp')
          .eq('contact_id', contactId)
          .eq('is_from_me', true)
          .eq('sequence_message_id', currentPosition)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastSentMessage && lastSentMessage.timestamp) {
          lastSentMessageTime = new Date(lastSentMessage.timestamp);
        }
      }
      
      // Preparar configuración de keywords si aplica
      const conditionConfig = (conditionType === 'if_message_contains' && nextMessage.condition_keywords) 
        ? nextMessage.condition_keywords 
        : null;
      
      const conditionResult = await evaluateCondition(
        contactId, 
        conditionType, 
        conditionConfig, 
        lastSentMessageTime
      );
      
      // Si hay ramificación para condición verdadera
      if (conditionResult && nextMessage.next_message_if_true) {
        const branchedMessage = getMessageById(sequence, nextMessage.next_message_if_true);
        if (branchedMessage) {
          // FASE 6: Para ramificaciones, recalcular delay acumulado desde la nueva posición
          const branchResult = getNextRealMessageWithPauseDelay(sortedMessages, nextMessage.order_position);
          return {
            message: branchedMessage,
            position: branchedMessage.order_position || 0,
            accumulatedPauseDelay: branchResult.accumulatedPauseDelay || 0,
            error: null
          };
        }
      }
      
      // Si hay ramificación para condición falsa
      if (!conditionResult && nextMessage.next_message_if_false) {
        const branchedMessage = getMessageById(sequence, nextMessage.next_message_if_false);
        if (branchedMessage) {
          // FASE 6: Para ramificaciones, recalcular delay acumulado desde la nueva posición
          const branchResult = getNextRealMessageWithPauseDelay(sortedMessages, nextMessage.order_position);
          return {
            message: branchedMessage,
            position: branchedMessage.order_position || 0,
            accumulatedPauseDelay: branchResult.accumulatedPauseDelay || 0,
            error: null
          };
        }
      }
      
      // Si no hay ramificaciones pero la condición no se cumple, buscar siguiente mensaje
      if (!conditionResult && !nextMessage.next_message_if_false) {
        return await getNextSequenceMessage(contactId, sequence, nextMessage.order_position);
      }
      
      // Si la condición se cumple pero no hay ramificación, continuar con este mensaje
      if (conditionResult && !nextMessage.next_message_if_true) {
        // Continuar con el mensaje actual (comportamiento normal)
      }
    }

    return {
      message: nextMessage,
      position: nextMessage.order_position || 0,
      accumulatedPauseDelay: accumulatedPauseDelay || 0,
      error: null
    };
  } catch (err) {
    console.error('[getNextSequenceMessage] Error fatal:', err);
    return {
      message: null,
      position: -1,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

