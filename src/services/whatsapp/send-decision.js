/**
 * Servicio para decidir método de envío (Cloud API vs Puppeteer)
 * FASE 2: Lógica de Decisión Inteligente
 * FASE 4: SUBFASE 4.2 - Lógica automática (ventana cerrada → template)
 * 
 * Decide automáticamente si usar Cloud API (gratis) o Puppeteer (gratis)
 * basado en ventana 72h y ventana 24h
 */

import { supabase } from '../../supabaseClient';
import { sendTextMessage, sendImageMessage, sendVideoMessage, sendAudioMessage, sendDocumentMessage } from './cloud-api-sender';
import { sendTemplateMessage } from './template-sender';

/**
 * Verificar si la ventana 24h está activa para un contacto
 * Helper para FASE 4.2
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isActive: boolean, expiresAt: string|null, error: Object|null}>}
 */
async function checkWindow24h(contactId) {
  try {
    const { data, error } = await supabase.rpc('calculate_window_24h', {
      p_contact_id: contactId
    });
    
    if (error) {
      console.error('[checkWindow24h] Error:', error);
      return { isActive: false, expiresAt: null, error };
    }
    
    const result = Array.isArray(data) ? data[0] : data;
    
    return {
      isActive: result?.window_active || false,
      expiresAt: result?.window_expires_at || null,
      error: null
    };
  } catch (err) {
    console.error('[checkWindow24h] Error fatal:', err);
    return { isActive: false, expiresAt: null, error: err };
  }
}

/**
 * Verificar si el contacto tiene menos de 72 horas desde creación
 * Helper para FASE 4.2
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isWithin72h: boolean, hoursSinceCreation: number, error: Object|null}>}
 */
async function check72hWindow(contactId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('created_at')
      .eq('id', contactId)
      .single();
    
    if (error) {
      console.error('[check72hWindow] Error:', error);
      return { isWithin72h: false, hoursSinceCreation: null, error };
    }
    
    if (!data || !data.created_at) {
      return { isWithin72h: false, hoursSinceCreation: null, error: { message: 'Contacto no encontrado' } };
    }
    
    const createdAt = new Date(data.created_at);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    const isWithin72h = hoursSinceCreation < 72;
    
    return { isWithin72h, hoursSinceCreation, error: null };
  } catch (err) {
    console.error('[check72hWindow] Error fatal:', err);
    return { isWithin72h: false, hoursSinceCreation: null, error: err };
  }
}

/**
 * Decidir método de envío para un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{method: 'cloud_api'|'puppeteer', reason: string, cost: number, error: Object|null}>}
 */
export async function decideSendMethod(contactId) {
  try {
    if (!contactId) {
      return {
        method: null,
        reason: 'missing_contact_id',
        cost: 0,
        error: { message: 'contactId es requerido' }
      };
    }

    // Llamar a la función SQL que decide el método
    const { data, error } = await supabase.rpc('decide_send_method', {
      p_contact_id: contactId
    });

    if (error) {
      console.error('[decideSendMethod] Error:', error);
      return {
        method: null,
        reason: 'database_error',
        cost: 0,
        error
      };
    }

    // La función retorna: method, reason, cost
    const result = Array.isArray(data) ? data[0] : data;

    return {
      method: result?.method || 'puppeteer',
      reason: result?.reason || 'unknown',
      cost: result?.cost || 0,
      error: null
    };
  } catch (err) {
    console.error('[decideSendMethod] Error fatal:', err);
    return {
      method: null,
      reason: 'fatal_error',
      cost: 0,
      error: { message: `Error al decidir método: ${err.message}` }
    };
  }
}

/**
 * Agregar mensaje a la cola de Puppeteer
 * @param {string} contactId - ID del contacto
 * @param {string} messageType - Tipo de mensaje: 'text', 'image', 'video', 'audio', 'document'
 * @param {Object} messageData - Datos del mensaje
 * @returns {Promise<{success: boolean, queueId: string|null, error: Object|null}>}
 */
export async function addToPuppeteerQueue(contactId, messageType, messageData) {
  try {
    if (!contactId || !messageType) {
      return {
        success: false,
        queueId: null,
        error: { message: 'contactId y messageType son requeridos' }
      };
    }

    // Llamar a la función SQL que agrega a la cola
    const { data, error } = await supabase.rpc('add_to_puppeteer_queue', {
      p_contact_id: contactId,
      p_message_type: messageType,
      p_content_text: messageData.contentText || null,
      p_media_url: messageData.mediaUrl || null,
      p_media_filename: messageData.mediaFilename || null,
      p_caption: messageData.caption || null,
      p_priority: messageData.priority || 5
    });

    if (error) {
      console.error('[addToPuppeteerQueue] Error:', error);
      return {
        success: false,
        queueId: null,
        error
      };
    }

    // La función retorna el ID del mensaje en la cola
    const queueId = Array.isArray(data) ? data[0]?.id || data[0] : data?.id || data;

    return {
      success: true,
      queueId,
      error: null
    };
  } catch (err) {
    console.error('[addToPuppeteerQueue] Error fatal:', err);
    return {
      success: false,
      queueId: null,
      error: { message: `Error al agregar a cola: ${err.message}` }
    };
  }
}

/**
 * Enviar mensaje inteligente (decide automáticamente Cloud API vs Puppeteer)
 * FASE 4: SUBFASE 4.2 - Lógica automática (ventana cerrada → template)
 * 
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {string} messageType - Tipo de mensaje: 'text', 'image', 'video', 'audio', 'document', 'template'
 * @param {Object} messageData - Datos del mensaje
 * @param {string} messageData.template_id - ID del template (opcional, para usar templates)
 * @param {Object} options - Opciones adicionales (forceMethod, skipValidation, etc.)
 * @returns {Promise<{success: boolean, method: string, messageId: string|null, queueId: string|null, error: Object|null}>}
 */
export async function sendMessageIntelligent(accountId, contactId, messageType, messageData, options = {}) {
  try {
    // FASE 4.2: Si el mensaje tiene template_id, intentar usar template primero
    if (messageData?.template_id) {
      // Verificar ventana 24h para decidir si usar template
      const { isActive: windowActive } = await checkWindow24h(contactId);
      const { isWithin72h } = await check72hWindow(contactId);
      
      // Si la ventana está cerrada, usar template (los templates pueden enviarse fuera de ventana 24h)
      if (!windowActive && !isWithin72h) {
        console.log('[sendMessageIntelligent] Ventana cerrada, usando template:', messageData.template_id);
        const result = await sendTemplateMessage(accountId, contactId, messageData.template_id, options);
        
        if (result.success) {
          return {
            success: true,
            method: 'template',
            messageId: result.messageId,
            queueId: null,
            whatsappMessageId: result.whatsappMessageId,
            error: null
          };
        } else {
          // Si falla el template, continuar con el flujo normal
          console.warn('[sendMessageIntelligent] Error enviando template, continuando con flujo normal:', result.error);
        }
      }
      // Si la ventana está abierta, continuar con el flujo normal
      // (el usuario puede preferir enviar mensaje normal aunque tenga template configurado)
    }

    // Si se fuerza un método, usarlo directamente
    if (options.forceMethod === 'cloud_api') {
      return await sendViaCloudAPI(accountId, contactId, messageType, messageData, options);
    }
    
    if (options.forceMethod === 'puppeteer') {
      return await sendViaPuppeteer(contactId, messageType, messageData, options);
    }

    // Decidir método automáticamente
    const { method, reason, error: decisionError } = await decideSendMethod(contactId);

    if (decisionError) {
      console.warn('[sendMessageIntelligent] Error al decidir método, usando Puppeteer por defecto:', decisionError);
      return await sendViaPuppeteer(contactId, messageType, messageData, options);
    }

    if (method === 'cloud_api') {
      return await sendViaCloudAPI(accountId, contactId, messageType, messageData, options);
    } else {
      return await sendViaPuppeteer(contactId, messageType, messageData, options);
    }
  } catch (err) {
    console.error('[sendMessageIntelligent] Error fatal:', err);
    return {
      success: false,
      method: null,
      messageId: null,
      queueId: null,
      error: {
        message: `Error al enviar mensaje: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Enviar mensaje via Cloud API
 * @private
 */
async function sendViaCloudAPI(accountId, contactId, messageType, messageData, options) {
  try {
    let result;

    switch (messageType) {
      case 'text':
        result = await sendTextMessage(accountId, contactId, messageData.contentText, options);
        break;
      case 'image':
        result = await sendImageMessage(accountId, contactId, messageData.mediaFile, messageData.caption || '', options);
        break;
      case 'video':
        result = await sendVideoMessage(accountId, contactId, messageData.mediaFile, messageData.caption || '', options);
        break;
      case 'audio':
        result = await sendAudioMessage(accountId, contactId, messageData.mediaFile, options);
        break;
      case 'document':
        result = await sendDocumentMessage(accountId, contactId, messageData.mediaFile, messageData.filename || '', messageData.caption || '', options);
        break;
      default:
        return {
          success: false,
          method: 'cloud_api',
          messageId: null,
          queueId: null,
          error: { message: `Tipo de mensaje no soportado: ${messageType}` }
        };
    }

    return {
      success: result.success,
      method: 'cloud_api',
      messageId: result.messageId,
      queueId: null,
      whatsappMessageId: result.whatsappMessageId,
      error: result.error
    };
  } catch (err) {
    console.error('[sendViaCloudAPI] Error:', err);
    return {
      success: false,
      method: 'cloud_api',
      messageId: null,
      queueId: null,
      error: { message: `Error al enviar via Cloud API: ${err.message}` }
    };
  }
}

/**
 * Enviar mensaje via Puppeteer (agregar a cola)
 * @private
 */
async function sendViaPuppeteer(contactId, messageType, messageData, options) {
  try {
    const { success, queueId, error } = await addToPuppeteerQueue(contactId, messageType, messageData);

    if (!success) {
      return {
        success: false,
        method: 'puppeteer',
        messageId: null,
        queueId: null,
        error: error || { message: 'Error al agregar a cola Puppeteer' }
      };
    }

    return {
      success: true,
      method: 'puppeteer',
      messageId: null,
      queueId,
      error: null
    };
  } catch (err) {
    console.error('[sendViaPuppeteer] Error:', err);
    return {
      success: false,
      method: 'puppeteer',
      messageId: null,
      queueId: null,
      error: { message: `Error al agregar a cola Puppeteer: ${err.message}` }
    };
  }
}

/**
 * Obtener información de ventana 24h de un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isActive: boolean, expiresAt: string|null, hoursRemaining: number|null, error: Object|null}>}
 */
export async function getWindow24hInfo(contactId) {
  try {
    const { data, error } = await supabase.rpc('calculate_window_24h', {
      p_contact_id: contactId
    });

    if (error) {
      return {
        isActive: false,
        expiresAt: null,
        hoursRemaining: null,
        error
      };
    }

    const result = Array.isArray(data) ? data[0] : data;
    const expiresAt = result?.window_expires_at;
    const isActive = result?.window_active || false;

    // Calcular horas restantes
    let hoursRemaining = null;
    if (expiresAt && isActive) {
      const expires = new Date(expiresAt);
      const now = new Date();
      hoursRemaining = Math.max(0, (expires - now) / (1000 * 60 * 60));
    }

    return {
      isActive,
      expiresAt,
      hoursRemaining,
      error: null
    };
  } catch (err) {
    console.error('[getWindow24hInfo] Error fatal:', err);
    return {
      isActive: false,
      expiresAt: null,
      hoursRemaining: null,
      error: { message: `Error al obtener info de ventana: ${err.message}` }
    };
  }
}


