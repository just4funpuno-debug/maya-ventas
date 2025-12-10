/**
 * Procesamiento de mensajes de secuencia con decisión híbrida
 * FASE 4: SUBFASE 4.2 - Integración con Decisión Híbrida
 * 
 * Procesa mensajes de secuencia usando Cloud API o Puppeteer según corresponda
 */

import { supabase } from '../../supabaseClient';
import { decideSendMethod, addToPuppeteerQueue } from './send-decision';
import { 
  sendTextMessage, 
  sendImageMessage, 
  sendVideoMessage, 
  sendAudioMessage, 
  sendDocumentMessage 
} from './cloud-api-sender';
import { sendTemplateMessage } from './template-sender';

/**
 * Procesar mensaje de secuencia (enviar o agregar a cola)
 * FASE 4: SUBFASE 4.2 - Integración con templates
 * 
 * @param {string} contactId - ID del contacto
 * @param {Object} messageData - Datos del mensaje de secuencia
 * @param {string} messageData.message_type - Tipo de mensaje
 * @param {string} messageData.content_text - Texto (si aplica)
 * @param {string} messageData.media_url - URL del media (si aplica)
 * @param {string} messageData.media_filename - Nombre del archivo (si aplica)
 * @param {string} messageData.caption - Caption (si aplica)
 * @param {string} messageData.template_id - ID del template (opcional, FASE 3.1)
 * @param {number} messageData.order_position - Posición en la secuencia
 * @returns {Promise<{success: boolean, method: string, messageId: string|null, queueId: string|null, error: Object|null}>}
 */
export async function processSequenceMessage(contactId, messageData) {
  try {
    // Obtener información del contacto y cuenta
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*, account_id, whatsapp_accounts(*)')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        success: false,
        method: null,
        messageId: null,
        queueId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const accountId = contact.account_id;
    if (!accountId) {
      return {
        success: false,
        method: null,
        messageId: null,
        queueId: null,
        error: { message: 'Contacto sin cuenta asociada' }
      };
    }

    // FASE 4.2: Si el mensaje tiene template_id, intentar usar template
    if (messageData.template_id) {
      // Verificar ventana 24h
      const { data: windowData, error: windowError } = await supabase.rpc('calculate_window_24h', {
        p_contact_id: contactId
      });
      
      const windowResult = Array.isArray(windowData) ? windowData[0] : windowData;
      const windowActive = windowResult?.window_active || false;
      
      // Verificar ventana 72h
      const createdAt = new Date(contact.created_at);
      const now = new Date();
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
      const isWithin72h = hoursSinceCreation < 72;
      
      // Si la ventana está cerrada, usar template (templates pueden enviarse fuera de ventana)
      if (!windowActive && !isWithin72h) {
        console.log('[processSequenceMessage] Ventana cerrada, usando template:', messageData.template_id);
        const result = await sendTemplateMessage(accountId, contactId, messageData.template_id);
        
        if (result.success) {
          // Actualizar contadores y posición
          await updateContactAfterSend(contactId, 'template', messageData.order_position);
          
          return {
            success: true,
            method: 'template',
            messageId: result.messageId,
            queueId: null,
            whatsappMessageId: result.whatsappMessageId,
            error: null
          };
        } else {
          console.warn('[processSequenceMessage] Error enviando template, continuando con flujo normal:', result.error);
          // Continuar con flujo normal si falla el template
        }
      }
      // Si la ventana está abierta, continuar con el flujo normal
      // (aunque tenga template, puede preferirse enviar mensaje normal dentro de ventana)
    }

    // Decidir método de envío
    const { method, reason, error: decisionError } = await decideSendMethod(contactId);

    if (decisionError) {
      console.error('[processSequenceMessage] Error al decidir método:', decisionError);
      // Por defecto, usar Puppeteer si hay error
      return await sendViaPuppeteer(contactId, messageData);
    }

    // Enviar según método decidido
    if (method === 'cloud_api') {
      return await sendViaCloudAPI(accountId, contactId, messageData);
    } else {
      return await sendViaPuppeteer(contactId, messageData);
    }
  } catch (err) {
    console.error('[processSequenceMessage] Error fatal:', err);
    return {
      success: false,
      method: null,
      messageId: null,
      queueId: null,
      error: { message: `Error al procesar mensaje: ${err.message}` }
    };
  }
}

/**
 * Enviar mensaje via Cloud API
 * @private
 */
async function sendViaCloudAPI(accountId, contactId, messageData) {
  try {
    const { message_type, content_text, media_url, media_filename, caption, order_position } = messageData;
    
    let result;

    switch (message_type) {
      case 'text':
        result = await sendTextMessage(accountId, contactId, content_text || '');
        break;
      
      case 'image':
        // Para Cloud API, necesitamos el archivo, no solo la URL
        // Por ahora, intentar descargar desde la URL
        try {
          const response = await fetch(media_url);
          const blob = await response.blob();
          const file = new File([blob], media_filename || 'image.jpg', { type: blob.type });
          result = await sendImageMessage(accountId, contactId, file, caption || '');
        } catch (fetchError) {
          console.error('[sendViaCloudAPI] Error descargando imagen:', fetchError);
          // Si falla, agregar a Puppeteer como fallback
          return await sendViaPuppeteer(contactId, messageData);
        }
        break;
      
      case 'video':
        try {
          const response = await fetch(media_url);
          const blob = await response.blob();
          const file = new File([blob], media_filename || 'video.mp4', { type: blob.type });
          result = await sendVideoMessage(accountId, contactId, file, caption || '');
        } catch (fetchError) {
          console.error('[sendViaCloudAPI] Error descargando video:', fetchError);
          return await sendViaPuppeteer(contactId, messageData);
        }
        break;
      
      case 'audio':
        try {
          const response = await fetch(media_url);
          const blob = await response.blob();
          const file = new File([blob], media_filename || 'audio.mp3', { type: blob.type });
          result = await sendAudioMessage(accountId, contactId, file);
        } catch (fetchError) {
          console.error('[sendViaCloudAPI] Error descargando audio:', fetchError);
          return await sendViaPuppeteer(contactId, messageData);
        }
        break;
      
      case 'document':
        try {
          const response = await fetch(media_url);
          const blob = await response.blob();
          const file = new File([blob], media_filename || 'document.pdf', { type: blob.type });
          result = await sendDocumentMessage(accountId, contactId, file, media_filename || '', caption || '');
        } catch (fetchError) {
          console.error('[sendViaCloudAPI] Error descargando documento:', fetchError);
          return await sendViaPuppeteer(contactId, messageData);
        }
        break;
      
      default:
        return {
          success: false,
          method: 'cloud_api',
          messageId: null,
          queueId: null,
          error: { message: `Tipo de mensaje no soportado: ${message_type}` }
        };
    }

    if (!result.success) {
      // Si falla Cloud API, intentar con Puppeteer como fallback
      console.warn('[processSequenceMessage] Cloud API falló, intentando Puppeteer:', result.error);
      return await sendViaPuppeteer(contactId, messageData);
    }

    // Actualizar contadores y posición
    await updateContactAfterSend(contactId, 'cloud_api', order_position);

    return {
      success: true,
      method: 'cloud_api',
      messageId: result.messageId,
      queueId: null,
      whatsappMessageId: result.whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendViaCloudAPI] Error:', err);
    // Fallback a Puppeteer
    return await sendViaPuppeteer(contactId, messageData);
  }
}

/**
 * Enviar mensaje via Puppeteer (agregar a cola)
 * @private
 */
async function sendViaPuppeteer(contactId, messageData) {
  try {
    const { message_type, content_text, media_url, media_filename, caption, order_position } = messageData;

    // Agregar a cola Puppeteer
    const { success, queueId, error } = await addToPuppeteerQueue(contactId, message_type, {
      contentText: content_text || null,
      mediaUrl: media_url || null,
      mediaFilename: media_filename || null,
      caption: caption || null,
      priority: 5 // Prioridad media para mensajes de secuencia
    });

    if (!success) {
      return {
        success: false,
        method: 'puppeteer',
        messageId: null,
        queueId: null,
        error: error || { message: 'Error al agregar a cola Puppeteer' }
      };
    }

    // Actualizar contadores y posición
    await updateContactAfterSend(contactId, 'puppeteer', order_position);

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
 * Actualizar contacto después de enviar mensaje
 * @private
 */
async function updateContactAfterSend(contactId, method, orderPosition) {
  try {
    // Obtener contadores actuales y account_id
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('messages_sent_via_cloud_api, messages_sent_via_puppeteer, sequence_position, account_id')
      .eq('id', contactId)
      .single();

    if (!contact) return;

    // Actualizar contadores según método
    const updates = {
      sequence_position: orderPosition || (contact.sequence_position || 0) + 1
    };

    if (method === 'cloud_api') {
      updates.messages_sent_via_cloud_api = (contact.messages_sent_via_cloud_api || 0) + 1;
    } else if (method === 'puppeteer') {
      updates.messages_sent_via_puppeteer = (contact.messages_sent_via_puppeteer || 0) + 1;
    }

    // Actualizar contacto
    await supabase
      .from('whatsapp_contacts')
      .update(updates)
      .eq('id', contactId);

    // Guardar mensaje en whatsapp_messages (si tenemos messageId)
    // Esto se hace en cloud-api-sender.js, pero para Puppeteer lo hacemos aquí
    if (method === 'puppeteer') {
      await supabase
        .from('whatsapp_messages')
        .insert({
          contact_id: contactId,
          account_id: contact.account_id,
          message_type: 'text', // Se actualizará cuando Puppeteer envíe
          text_content: null, // Se actualizará cuando Puppeteer envíe
          is_from_me: true,
          sent_via: 'puppeteer',
          sequence_message_id: orderPosition,
          status: 'pending',
          timestamp: new Date().toISOString()
        });
    }
  } catch (err) {
    console.error('[updateContactAfterSend] Error:', err);
    // No lanzar error, solo loguear
  }
}

