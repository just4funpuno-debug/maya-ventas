/**
 * Servicio para gestionar secuencias de mensajes WhatsApp
 * FASE 4: SUBFASE 4.1 - Servicio de Secuencias
 * FASE 2: SUBFASE 2.3 - Filtrado por productos del usuario
 * 
 * Proporciona funciones CRUD para secuencias y sus mensajes
 */

import { supabase } from '../../supabaseClient';

const SEQUENCES_TABLE = 'whatsapp_sequences';
const SEQUENCE_MESSAGES_TABLE = 'whatsapp_sequence_messages';

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
 * Obtener todas las secuencias de una cuenta
 * FASE 2: Verificación de permisos por productos del usuario
 * 
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {Array<string>|null} userSkus - SKUs del usuario para verificar permisos (null = admin, ver todas)
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getSequences(accountId, userSkus = null) {
  try {
    // Si hay filtro de productos, verificar permisos primero
    if (userSkus && userSkus.length > 0) {
      const allowedAccountIds = await getAccountIdsForUser(userSkus);
      
      // Si no hay cuentas permitidas o la cuenta no está en la lista, retornar error
      if (!allowedAccountIds || allowedAccountIds.length === 0 || !allowedAccountIds.includes(accountId)) {
        return {
          data: [],
          error: {
            message: 'No tienes permisos para acceder a las secuencias de esta cuenta',
            code: 'PERMISSION_DENIED'
          }
        };
      }
    }
    
    const { data, error } = await supabase
      .from(SEQUENCES_TABLE)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getSequences] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getSequences] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener secuencia por ID
 * FASE 2: Verificación de permisos por productos del usuario
 * 
 * @param {string} sequenceId - ID de la secuencia
 * @param {Array<string>|null} userSkus - SKUs del usuario para verificar permisos (null = admin, ver todas)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getSequenceById(sequenceId, userSkus = null) {
  try {
    // Primero obtener la secuencia para verificar su account_id
    const { data: sequence, error: seqError } = await supabase
      .from(SEQUENCES_TABLE)
      .select('*')
      .eq('id', sequenceId)
      .single();

    if (seqError) {
      console.error('[getSequenceById] Error:', seqError);
      return { data: null, error: seqError };
    }

    // Si hay filtro de productos, verificar permisos
    if (userSkus && userSkus.length > 0 && sequence) {
      const allowedAccountIds = await getAccountIdsForUser(userSkus);
      
      // Si no hay cuentas permitidas o la cuenta no está en la lista, retornar error
      if (!allowedAccountIds || allowedAccountIds.length === 0 || !allowedAccountIds.includes(sequence.account_id)) {
        return {
          data: null,
          error: {
            message: 'No tienes permisos para acceder a esta secuencia',
            code: 'PERMISSION_DENIED'
          }
        };
      }
    }

    return { data: sequence, error: null };
  } catch (err) {
    console.error('[getSequenceById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear nueva secuencia
 * @param {Object} sequenceData - Datos de la secuencia
 * @param {string} sequenceData.account_id - ID de la cuenta
 * @param {string} sequenceData.name - Nombre de la secuencia
 * @param {string} sequenceData.description - Descripción (opcional)
 * @param {boolean} sequenceData.active - Si está activa (default: true)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSequence(sequenceData) {
  try {
    const { account_id, name, description, active = true } = sequenceData;

    if (!account_id || !name) {
      return { 
        data: null, 
        error: { message: 'account_id y name son requeridos' } 
      };
    }

    const { data, error } = await supabase
      .from(SEQUENCES_TABLE)
      .insert({
        account_id,
        name,
        description: description || null,
        active,
        total_messages: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[createSequence] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createSequence] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar secuencia
 * @param {string} sequenceId - ID de la secuencia
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSequence(sequenceId, updates) {
  try {
    const { data, error } = await supabase
      .from(SEQUENCES_TABLE)
      .update(updates)
      .eq('id', sequenceId)
      .select()
      .single();

    if (error) {
      console.error('[updateSequence] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[updateSequence] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar secuencia
 * @param {string} sequenceId - ID de la secuencia
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSequence(sequenceId) {
  try {
    const { error } = await supabase
      .from(SEQUENCES_TABLE)
      .delete()
      .eq('id', sequenceId);

    if (error) {
      console.error('[deleteSequence] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener mensajes de una secuencia
 * @param {string} sequenceId - ID de la secuencia
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getSequenceMessages(sequenceId) {
  try {
    const { data, error } = await supabase
      .from(SEQUENCE_MESSAGES_TABLE)
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('order_position', { ascending: true });

    if (error) {
      console.error('[getSequenceMessages] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getSequenceMessages] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Agregar mensaje a una secuencia
 * @param {string} sequenceId - ID de la secuencia
 * @param {Object} messageData - Datos del mensaje
 * @param {string} messageData.message_type - Tipo (text, image, video, audio, document)
 * @param {string} messageData.content_text - Contenido de texto (si aplica)
 * @param {string} messageData.media_url - URL del media (si aplica)
 * @param {string} messageData.media_filename - Nombre del archivo (si aplica)
 * @param {number} messageData.media_size_kb - Tamaño en KB (si aplica)
 * @param {string} messageData.caption - Caption (si aplica)
 * @param {number} messageData.delay_hours_from_previous - Horas desde mensaje anterior
 * @param {number} messageData.order_position - Posición en orden
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function addSequenceMessage(sequenceId, messageData) {
  try {
    const {
      step_type = 'message', // FASE 3: Tipo de paso (message, pause, stage_change)
      message_type,
      content_text,
      media_url,
      media_filename,
      media_size_kb,
      caption,
      delay_hours_from_previous = 0,
      order_position,
      pause_type, // FASE 3: Tipo de pausa
      days_without_response, // FASE 3: Días sin respuesta
      pause_interrupt_keywords, // FASE 2: Palabras clave para interrumpir pausa
      pause_delay_after_interrupt, // FASE 2: Delay después de interrupción
      target_stage_name, // FASE 4: Nombre de etapa destino
      condition_type = 'none', // FASE 3: Tipo de condición
      next_message_if_true, // FASE 4: Ramificación si condición es verdadera
      next_message_if_false, // FASE 4: Ramificación si condición es falsa
      condition_keywords, // FASE 1: SUBFASE 2.2 - Palabras clave para condiciones
      template_id // FASE 3: SUBFASE 3.1 - ID del template de WhatsApp
    } = messageData;

    // Validar step_type
    const validStepTypes = ['message', 'pause', 'stage_change', 'condition'];
    if (!validStepTypes.includes(step_type)) {
      return {
        data: null,
        error: { message: `step_type debe ser uno de: ${validStepTypes.join(', ')}` }
      };
    }

    // FASE 3: Validaciones según tipo de paso
    if (step_type === 'message') {
      // FASE 3: SUBFASE 3.1 - Validar template_id si está presente
      if (template_id) {
        // Verificar que el template existe y está aprobado
        const { data: template, error: templateError } = await supabase
          .from('whatsapp_templates')
          .select('id, wa_status')
          .eq('id', template_id)
          .single();

        if (templateError || !template) {
          return {
            data: null,
            error: { message: 'Template no encontrado' }
          };
        }

        // Validar que el template esté aprobado
        if (template.wa_status !== 'approved') {
          return {
            data: null,
            error: { message: 'El template debe estar aprobado para poder usarse en una secuencia' }
          };
        }

        // Si se usa template, no se requiere message_type ni content_text
        // (el template ya tiene todo el contenido definido)
      } else {
        // Si no hay template_id, validar campos normales de mensaje
        const validTypes = ['text', 'image', 'video', 'audio', 'document'];
        if (!message_type || !validTypes.includes(message_type)) {
          return {
            data: null,
            error: { message: `message_type debe ser uno de: ${validTypes.join(', ')}` }
          };
        }

        // Validar contenido según tipo
        if (message_type === 'text' && (!content_text || content_text.trim() === '')) {
          return {
            data: null,
            error: { message: 'Los mensajes de texto requieren content_text' }
          };
        }

        if (['image', 'video', 'audio', 'document'].includes(message_type) && !media_url) {
          return {
            data: null,
            error: { message: `Los mensajes de tipo ${message_type} requieren media_url` }
          };
        }
      }
    } else if (step_type === 'pause') {
      // FASE 3: Para pausas, message_type debe ser NULL
      // Validar que pause_type esté configurado
      if (!pause_type) {
        return {
          data: null,
          error: { message: 'Las pausas requieren un pause_type' }
        };
      }

      // FASE 2: Validar pause_interrupt_keywords (solo para fixed_delay)
      if (pause_interrupt_keywords !== undefined && pause_interrupt_keywords !== null) {
        if (pause_type !== 'fixed_delay') {
          return {
            data: null,
            error: { message: 'pause_interrupt_keywords solo es válido para pausas tipo fixed_delay' }
          };
        }

        // Validar estructura de pause_interrupt_keywords
        if (typeof pause_interrupt_keywords !== 'object' || !pause_interrupt_keywords.keywords) {
          return {
            data: null,
            error: { message: 'pause_interrupt_keywords debe tener la estructura {keywords: Array, match_type?: string, interrupt_type?: string}' }
          };
        }

        if (!Array.isArray(pause_interrupt_keywords.keywords)) {
          return {
            data: null,
            error: { message: 'pause_interrupt_keywords.keywords debe ser un array' }
          };
        }

        // Si interrupt_type es 'keywords', debe tener al menos una keyword
        const interruptType = pause_interrupt_keywords.interrupt_type || 
          (pause_interrupt_keywords.keywords.length > 0 ? 'keywords' : 'any_message');
        
        if (interruptType === 'keywords' && pause_interrupt_keywords.keywords.length === 0) {
          return {
            data: null,
            error: { message: 'Si el tipo de interrupción es "keywords", debe haber al menos una palabra clave' }
          };
        }
      }

      // FASE 2: Validar pause_delay_after_interrupt (solo válido si hay pause_interrupt_keywords)
      if (pause_delay_after_interrupt !== undefined && pause_delay_after_interrupt !== null) {
        if (!pause_interrupt_keywords) {
          return {
            data: null,
            error: { message: 'pause_delay_after_interrupt solo es válido si pause_interrupt_keywords está configurado' }
          };
        }

        if (pause_delay_after_interrupt < 0) {
          return {
            data: null,
            error: { message: 'pause_delay_after_interrupt debe ser mayor o igual a 0' }
          };
        }
      }
    } else if (step_type === 'stage_change') {
      // Para cambios de etapa, validar target_stage_name
      if (!target_stage_name || target_stage_name.trim() === '') {
        return {
          data: null,
          error: { message: 'Los cambios de etapa requieren target_stage_name' }
        };
      }
    } else if (step_type === 'condition') {
      // Para condiciones, validar que tenga condition_type y al menos una ramificación
      if (!condition_type || condition_type === 'none') {
        return {
          data: null,
          error: { message: 'Los pasos de condición requieren un condition_type' }
        };
      }
      
      if (condition_type === 'if_message_contains') {
        if (!condition_keywords || !condition_keywords.keywords || condition_keywords.keywords.length === 0) {
          return {
            data: null,
            error: { message: 'Las condiciones de tipo "if_message_contains" requieren al menos una palabra clave' }
          };
        }
      }

      // Validar que tenga al menos una ramificación configurada
      if (!next_message_if_true && !next_message_if_false) {
        return {
          data: null,
          error: { message: 'Los pasos de condición requieren al menos una ramificación (next_message_if_true o next_message_if_false)' }
        };
      }
    }

    // Obtener el siguiente message_number
    const { data: existingMessages } = await getSequenceMessages(sequenceId);
    const maxMessageNumber = existingMessages.length > 0
      ? Math.max(...existingMessages.map(m => m.message_number || 0))
      : 0;
    const nextMessageNumber = maxMessageNumber + 1;

    // Si no se especifica order_position, usar el siguiente
    const finalOrderPosition = order_position !== undefined
      ? order_position
      : (existingMessages.length > 0
          ? Math.max(...existingMessages.map(m => m.order_position || 0)) + 1
          : 1);

    // FASE 3: Preparar datos según tipo de paso
    const insertData = {
      sequence_id: sequenceId,
      message_number: nextMessageNumber,
      step_type: step_type, // FASE 3: Tipo de paso
      message_type: step_type === 'message' ? message_type : null, // Solo para mensajes
      content_text: step_type === 'message' ? (content_text || null) : null,
      media_url: step_type === 'message' ? (media_url || null) : null,
      media_filename: step_type === 'message' ? (media_filename || null) : null,
      media_size_kb: step_type === 'message' ? (media_size_kb || null) : null,
      caption: step_type === 'message' ? (caption || null) : null,
      delay_hours_from_previous: delay_hours_from_previous || 0,
      order_position: finalOrderPosition,
      active: true,
      // FASE 3: SUBFASE 3.1 - Template ID (solo para mensajes)
      template_id: step_type === 'message' ? (template_id || null) : null,
      // Campos de pausa (ya existen de migración 016)
      pause_type: step_type === 'pause' ? (pause_type || null) : null,
      days_without_response: step_type === 'pause' ? (days_without_response || null) : null,
      // FASE 2: Campos de interrupción de pausas (solo para fixed_delay)
      pause_interrupt_keywords: step_type === 'pause' && pause_type === 'fixed_delay' && pause_interrupt_keywords
        ? pause_interrupt_keywords
        : null,
      pause_delay_after_interrupt: step_type === 'pause' && pause_type === 'fixed_delay' && pause_interrupt_keywords && pause_delay_after_interrupt !== undefined
        ? pause_delay_after_interrupt
        : null,
      // Campo de cambio de etapa
      target_stage_name: step_type === 'stage_change' ? (target_stage_name || null) : null,
      // Campos de condiciones y ramificaciones
      condition_type: step_type === 'condition' ? (condition_type || 'none') : (step_type === 'message' ? (condition_type || 'none') : 'none'),
      next_message_if_true: step_type === 'condition' ? (next_message_if_true || null) : (step_type === 'message' && condition_type !== 'none' ? (next_message_if_true || null) : null),
      next_message_if_false: step_type === 'condition' ? (next_message_if_false || null) : (step_type === 'message' && condition_type !== 'none' ? (next_message_if_false || null) : null),
      // Palabras clave para condiciones
      condition_keywords: step_type === 'condition' && condition_type === 'if_message_contains' && condition_keywords 
        ? condition_keywords 
        : (step_type === 'message' && condition_type === 'if_message_contains' && condition_keywords 
          ? condition_keywords 
          : null)
    };

    const { data, error } = await supabase
      .from(SEQUENCE_MESSAGES_TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[addSequenceMessage] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[addSequenceMessage] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar mensaje de secuencia
 * FASE 8: Validaciones mejoradas para tipos de pasos
 * @param {string} messageId - ID del mensaje
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSequenceMessage(messageId, updates) {
  try {
    // Validar step_type si se está actualizando
    if (updates.step_type !== undefined) {
      const validStepTypes = ['message', 'pause', 'stage_change', 'condition'];
      if (!validStepTypes.includes(updates.step_type)) {
        return {
          data: null,
          error: { message: `step_type debe ser uno de: ${validStepTypes.join(', ')}` }
        };
      }
    }

    // FASE 8: Obtener el mensaje actual para validaciones contextuales
    // FASE 3: SUBFASE 3.1 - Incluir template_id en la consulta
    // FASE 2: Incluir pause_interrupt_keywords y pause_delay_after_interrupt
    const { data: currentMessage, error: fetchError } = await supabase
      .from(SEQUENCE_MESSAGES_TABLE)
      .select('step_type, message_type, pause_type, pause_interrupt_keywords, pause_delay_after_interrupt, target_stage_name, condition_type, condition_keywords, template_id')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('[updateSequenceMessage] Error obteniendo mensaje actual:', fetchError);
      return { data: null, error: fetchError };
    }

    if (!currentMessage) {
      return { data: null, error: { message: 'Paso no encontrado' } };
    }

    // Determinar el step_type actualizado (o usar el actual)
    const updatedStepType = updates.step_type !== undefined ? updates.step_type : currentMessage.step_type || 'message';

    // FASE 8: Validaciones según tipo de paso
    if (updatedStepType === 'message') {
      // FASE 3: SUBFASE 3.1 - Validar template_id si se está actualizando
      const templateId = updates.template_id !== undefined ? updates.template_id : currentMessage.template_id;
      
      if (templateId) {
        // Verificar que el template existe y está aprobado
        const { data: template, error: templateError } = await supabase
          .from('whatsapp_templates')
          .select('id, wa_status')
          .eq('id', templateId)
          .single();

        if (templateError || !template) {
          return {
            data: null,
            error: { message: 'Template no encontrado' }
          };
        }

        // Validar que el template esté aprobado
        if (template.wa_status !== 'approved') {
          return {
            data: null,
            error: { message: 'El template debe estar aprobado para poder usarse en una secuencia' }
          };
        }

        // Si se usa template, no se requiere message_type ni content_text
      } else {
        // Si no hay template_id, validar campos normales de mensaje
        if (updates.message_type !== undefined) {
          const validTypes = ['text', 'image', 'video', 'audio', 'document'];
          if (!validTypes.includes(updates.message_type)) {
            return {
              data: null,
              error: { message: `message_type debe ser uno de: ${validTypes.join(', ')}` }
            };
          }
        }

        // Validar contenido según tipo de mensaje
        const messageType = updates.message_type || currentMessage.message_type;
        if (messageType === 'text' && updates.content_text !== undefined && (!updates.content_text || updates.content_text.trim() === '')) {
          return {
            data: null,
            error: { message: 'Los mensajes de texto requieren content_text' }
          };
        }

        if (['image', 'video', 'audio', 'document'].includes(messageType) && updates.media_url !== undefined) {
          // Si se está actualizando media_url, debe tener valor válido
          const mediaUrl = updates.media_url;
          if (!mediaUrl || (typeof mediaUrl === 'string' && mediaUrl.trim() === '')) {
            return {
              data: null,
              error: { message: `Los mensajes de tipo ${messageType} requieren media_url` }
            };
          }
        }
      }

      // Asegurar que campos de pausa/cambio de etapa se limpien
      if (updates.step_type === 'message' || (updates.step_type === undefined && currentMessage.step_type === 'message')) {
        // Mantener solo campos de mensaje
        updates.message_type = updates.message_type || currentMessage.message_type;
        // Limpiar campos que no corresponden a mensajes
        if (updates.step_type === 'message') {
          updates.pause_type = null;
          updates.days_without_response = null;
          updates.target_stage_name = null;
        }
      }
    } else if (updatedStepType === 'pause') {
      // Validar pause_type - debe existir en updates o en currentMessage
      const pauseType = updates.pause_type !== undefined ? updates.pause_type : currentMessage.pause_type;
      if (!pauseType) {
        return {
          data: null,
          error: { message: 'Las pausas requieren un pause_type' }
        };
      }

      // Asegurar que campos de mensaje se limpien
      if (updates.step_type === 'pause' || (updates.step_type === undefined && currentMessage.step_type === 'pause')) {
        updates.message_type = null;
        updates.content_text = null;
        updates.media_url = null;
        updates.media_filename = null;
        updates.media_size_kb = null;
        updates.caption = null;
        updates.target_stage_name = null;
      }

      // FASE 2: Validar pause_interrupt_keywords (solo para fixed_delay)
      const currentPauseType = updates.pause_type !== undefined ? updates.pause_type : currentMessage.pause_type;
      if (updates.pause_interrupt_keywords !== undefined) {
        if (currentPauseType !== 'fixed_delay') {
          return {
            data: null,
            error: { message: 'pause_interrupt_keywords solo es válido para pausas tipo fixed_delay' }
          };
        }

        if (updates.pause_interrupt_keywords !== null) {
          // Validar estructura
          if (typeof updates.pause_interrupt_keywords !== 'object' || !updates.pause_interrupt_keywords.keywords) {
            return {
              data: null,
              error: { message: 'pause_interrupt_keywords debe tener la estructura {keywords: Array, match_type?: string, interrupt_type?: string}' }
            };
          }

          if (!Array.isArray(updates.pause_interrupt_keywords.keywords)) {
            return {
              data: null,
              error: { message: 'pause_interrupt_keywords.keywords debe ser un array' }
            };
          }

          // Si interrupt_type es 'keywords', debe tener al menos una keyword
          const interruptType = updates.pause_interrupt_keywords.interrupt_type || 
            (updates.pause_interrupt_keywords.keywords.length > 0 ? 'keywords' : 'any_message');
          
          if (interruptType === 'keywords' && updates.pause_interrupt_keywords.keywords.length === 0) {
            return {
              data: null,
              error: { message: 'Si el tipo de interrupción es "keywords", debe haber al menos una palabra clave' }
            };
          }
        } else {
          // Si se está limpiando pause_interrupt_keywords, también limpiar pause_delay_after_interrupt
          updates.pause_delay_after_interrupt = null;
        }
      }

      // FASE 2: Validar pause_delay_after_interrupt
      if (updates.pause_delay_after_interrupt !== undefined) {
        const currentInterruptKeywords = updates.pause_interrupt_keywords !== undefined 
          ? updates.pause_interrupt_keywords 
          : currentMessage.pause_interrupt_keywords;

        if (updates.pause_delay_after_interrupt !== null && !currentInterruptKeywords) {
          return {
            data: null,
            error: { message: 'pause_delay_after_interrupt solo es válido si pause_interrupt_keywords está configurado' }
          };
        }

        if (updates.pause_delay_after_interrupt !== null && updates.pause_delay_after_interrupt < 0) {
          return {
            data: null,
            error: { message: 'pause_delay_after_interrupt debe ser mayor o igual a 0' }
          };
        }
      }
    } else if (updatedStepType === 'stage_change') {
      // Validar target_stage_name - debe existir en updates o en currentMessage
      const targetStage = updates.target_stage_name !== undefined ? updates.target_stage_name : currentMessage.target_stage_name;
      if (!targetStage || targetStage.trim() === '') {
        return {
          data: null,
          error: { message: 'Los cambios de etapa requieren target_stage_name' }
        };
      }

      // Asegurar que campos de mensaje/pausa se limpien
      if (updates.step_type === 'stage_change' || (updates.step_type === undefined && currentMessage.step_type === 'stage_change')) {
        updates.message_type = null;
        updates.content_text = null;
        updates.media_url = null;
        updates.media_filename = null;
        updates.media_size_kb = null;
        updates.caption = null;
        updates.pause_type = null;
        updates.days_without_response = null;
        updates.pause_interrupt_keywords = null;
        updates.pause_delay_after_interrupt = null;
        updates.condition_type = null;
        updates.condition_keywords = null;
        updates.next_message_if_true = null;
        updates.next_message_if_false = null;
      }
    } else if (updatedStepType === 'condition') {
      // Validar condition_type - debe existir en updates o en currentMessage
      const conditionType = updates.condition_type !== undefined ? updates.condition_type : currentMessage.condition_type;
      if (!conditionType || conditionType === 'none') {
        return {
          data: null,
          error: { message: 'Los pasos de condición requieren un condition_type' }
        };
      }

      // Validar keywords si es if_message_contains
      if (conditionType === 'if_message_contains') {
        const keywordsConfig = updates.condition_keywords !== undefined 
          ? updates.condition_keywords 
          : currentMessage.condition_keywords;
        if (!keywordsConfig || !keywordsConfig.keywords || keywordsConfig.keywords.length === 0) {
          return {
            data: null,
            error: { message: 'Las condiciones de tipo "if_message_contains" requieren al menos una palabra clave' }
          };
        }
      }

      // Validar que tenga al menos una ramificación
      const nextIfTrue = updates.next_message_if_true !== undefined ? updates.next_message_if_true : currentMessage.next_message_if_true;
      const nextIfFalse = updates.next_message_if_false !== undefined ? updates.next_message_if_false : currentMessage.next_message_if_false;
      if (!nextIfTrue && !nextIfFalse) {
        return {
          data: null,
          error: { message: 'Los pasos de condición requieren al menos una ramificación (next_message_if_true o next_message_if_false)' }
        };
      }

      // Asegurar que campos de mensaje/pausa/cambio de etapa se limpien
      if (updates.step_type === 'condition' || (updates.step_type === undefined && currentMessage.step_type === 'condition')) {
        updates.message_type = null;
        updates.content_text = null;
        updates.media_url = null;
        updates.media_filename = null;
        updates.media_size_kb = null;
        updates.caption = null;
        updates.pause_type = null;
        updates.days_without_response = null;
        updates.pause_interrupt_keywords = null;
        updates.pause_delay_after_interrupt = null;
        updates.target_stage_name = null;
      }
    }

    // FASE 1: SUBFASE 2.2 - Validar condition_type y condition_keywords
    if (updates.condition_type !== undefined) {
      const validConditionTypes = ['none', 'if_responded', 'if_not_responded', 'if_message_contains'];
      if (!validConditionTypes.includes(updates.condition_type)) {
        return {
          data: null,
          error: { message: `condition_type debe ser uno de: ${validConditionTypes.join(', ')}` }
        };
      }

      // Si se cambia condition_type a algo diferente de 'if_message_contains', limpiar keywords
      if (updates.condition_type !== 'if_message_contains') {
        updates.condition_keywords = null;
      }

      // Si condition_type es 'none', limpiar ramificaciones
      if (updates.condition_type === 'none') {
        updates.next_message_if_true = null;
        updates.next_message_if_false = null;
        updates.condition_keywords = null;
      }
    }

    // Validar condition_keywords si condition_type es 'if_message_contains'
    const finalConditionType = updates.condition_type !== undefined 
      ? updates.condition_type 
      : (currentMessage.condition_type || 'none');

    if (finalConditionType === 'if_message_contains') {
      const keywordsConfig = updates.condition_keywords !== undefined 
        ? updates.condition_keywords 
        : currentMessage.condition_keywords;

      if (!keywordsConfig || !keywordsConfig.keywords || !Array.isArray(keywordsConfig.keywords) || keywordsConfig.keywords.length === 0) {
        return {
          data: null,
          error: { message: 'Las condiciones de tipo "if_message_contains" requieren al menos una palabra clave en condition_keywords.keywords' }
        };
      }

      // Validar que keywords sea un array de strings no vacíos
      const validKeywords = keywordsConfig.keywords.filter(kw => 
        typeof kw === 'string' && kw.trim().length > 0
      );

      if (validKeywords.length === 0) {
        return {
          data: null,
          error: { message: 'Las palabras clave deben ser strings no vacíos' }
        };
      }

      // Normalizar y asegurar estructura correcta
      updates.condition_keywords = {
        keywords: validKeywords.map(kw => kw.trim()),
        match_type: keywordsConfig.match_type || 'any',
        case_sensitive: keywordsConfig.case_sensitive || false
      };
    } else if (finalConditionType !== 'if_message_contains' && updates.condition_keywords !== undefined) {
      // Si no es 'if_message_contains', limpiar keywords
      updates.condition_keywords = null;
    }

    // Actualizar el mensaje
    const { data, error } = await supabase
      .from(SEQUENCE_MESSAGES_TABLE)
      .update(updates)
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('[updateSequenceMessage] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[updateSequenceMessage] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar mensaje de secuencia
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSequenceMessage(messageId) {
  try {
    const { error } = await supabase
      .from(SEQUENCE_MESSAGES_TABLE)
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('[deleteSequenceMessage] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteSequenceMessage] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Reordenar mensajes de una secuencia
 * @param {string} sequenceId - ID de la secuencia
 * @param {Array<{id: string, order_position: number}>} newOrder - Nuevo orden con IDs y posiciones
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function reorderSequenceMessages(sequenceId, newOrder) {
  try {
    // Actualizar cada mensaje con su nueva posición
    const updates = newOrder.map(({ id, order_position }) =>
      supabase
        .from(SEQUENCE_MESSAGES_TABLE)
        .update({ order_position })
        .eq('id', id)
        .eq('sequence_id', sequenceId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('[reorderSequenceMessages] Errores:', errors);
      return { success: false, error: errors[0].error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[reorderSequenceMessages] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener secuencia completa con sus mensajes
 * @param {string} sequenceId - ID de la secuencia
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getSequenceWithMessages(sequenceId) {
  try {
    const { data: sequence, error: seqError } = await getSequenceById(sequenceId);
    if (seqError || !sequence) {
      return { data: null, error: seqError || { message: 'Flujo no encontrado' } };
    }

    const { data: messages, error: msgError } = await getSequenceMessages(sequenceId);
    if (msgError) {
      return { data: null, error: msgError };
    }

    return {
      data: {
        ...sequence,
        messages: messages || []
      },
      error: null
    };
  } catch (err) {
    console.error('[getSequenceWithMessages] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}


