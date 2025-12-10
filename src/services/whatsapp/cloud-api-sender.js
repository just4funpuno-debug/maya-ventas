/**
 * Servicio para enviar mensajes via WhatsApp Cloud API
 * FASE 2: API para enviar mensajes via Cloud API
 * FASE 4: SUBFASE 4.1 - Envío de templates
 * 
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { supabase } from '../../supabaseClient';
import { mapTemplateVariables } from './templates';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Obtener cuenta WhatsApp activa
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function getAccount(accountId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error('[getAccount] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAccount] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Verificar si la ventana 24h está activa para un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isActive: boolean, expiresAt: string|null, error: Object|null}>}
 */
async function checkWindow24h(contactId) {
  try {
    // Llamar a la función SQL que calcula la ventana
    const { data, error } = await supabase.rpc('calculate_window_24h', {
      p_contact_id: contactId
    });
    
    if (error) {
      console.error('[checkWindow24h] Error:', error);
      return { isActive: false, expiresAt: null, error };
    }
    
    // La función retorna window_expires_at y window_active
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
 * Guardar mensaje en la base de datos
 * @param {Object} messageData - Datos del mensaje
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function saveMessage(messageData) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        contact_id: messageData.contactId,
        account_id: messageData.accountId,
        message_type: messageData.messageType || 'text',
        content_text: messageData.contentText || null,
        media_url: messageData.mediaUrl || null,
        media_filename: messageData.mediaFilename || null,
        caption: messageData.caption || null,
        sent_via: 'cloud_api',
        status: messageData.status || 'sent',
        whatsapp_message_id: messageData.whatsappMessageId || null,
        reply_to_message_id: messageData.replyToMessageId || null, // ID del mensaje al que se responde (UUID de nuestra BD)
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[saveMessage] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[saveMessage] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Actualizar última interacción del contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
async function updateContactInteraction(contactId) {
  try {
    const { error } = await supabase.rpc('update_contact_interaction', {
      p_contact_id: contactId,
      p_source: 'cloud_api',
      p_interaction_time: new Date().toISOString()
    });
    
    if (error) {
      console.error('[updateContactInteraction] Error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[updateContactInteraction] Error fatal:', err);
    return { success: false, error: err };
  }
}

/**
 * Enviar mensaje de texto via WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {string} messageText - Texto del mensaje
 * @param {Object} options - Opciones adicionales
 * @param {string} options.replyToMessageId - WhatsApp message ID del mensaje al que se responde (para Reply)
 * @param {Object} options.forwardContext - Contexto para reenvío {from: string, id: string} (para Forward)
 * @param {boolean} options.skipValidation - Saltar validación de ventana
 * @returns {Promise<{success: boolean, messageId: string|null, error: Object|null}>}
 */
export async function sendTextMessage(accountId, contactId, messageText, options = {}) {
  try {
    // Validaciones básicas
    if (!accountId || !contactId || !messageText) {
      return {
        success: false,
        messageId: null,
        error: { message: 'accountId, contactId y messageText son requeridos' }
      };
    }

    // Obtener cuenta
    const { data: account, error: accountError } = await getAccount(accountId);
    if (accountError || !account) {
      return {
        success: false,
        messageId: null,
        error: accountError || { message: 'Cuenta no encontrada o inactiva' }
      };
    }

    // Validar ventana 24h (a menos que se especifique skipValidation)
    if (!options.skipValidation) {
      const { isActive: windowActive, error: windowError } = await checkWindow24h(contactId);
      
      if (windowError) {
        console.warn('[sendTextMessage] Error verificando ventana 24h:', windowError);
      }
      
      // Verificar también ventana 72h
      const { isWithin72h, error: hours72Error } = await check72hWindow(contactId);
      
      if (hours72Error) {
        console.warn('[sendTextMessage] Error verificando ventana 72h:', hours72Error);
      }
      
      // Si no está en ninguna ventana gratuita, no permitir envío
      if (!windowActive && !isWithin72h) {
        return {
          success: false,
          messageId: null,
          error: {
            message: 'Ventana 24h cerrada y contacto fuera de ventana 72h. Usa Puppeteer o espera respuesta del cliente.',
            code: 'WINDOW_CLOSED'
          }
        };
      }
    }

    // Obtener número de teléfono del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Formatear número de teléfono (debe incluir código de país sin +)
    const phoneNumber = contact.phone.replace(/\D/g, ''); // Solo dígitos

    // Construir URL de la API
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    // Payload para WhatsApp Cloud API
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: false, // Cambiar a true si quieres que URLs se conviertan en previews
        body: messageText
      }
    };

    // Agregar contexto para Reply o Forward
    const context = buildMessageContext(options);
    if (context) {
      payload.context = context;
    }

    // Enviar mensaje
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[sendTextMessage] Error de API:', responseData);
      return {
        success: false,
        messageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar mensaje',
          code: responseData.error?.code || 'API_ERROR',
          details: responseData.error
        }
      };
    }

    // Extraer ID del mensaje de WhatsApp
    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    // Guardar mensaje en BD
    // replyToMessageId debe ser el UUID de nuestra BD, no el WhatsApp ID
    const { data: savedMessage, error: saveError } = await saveMessage({
      contactId,
      accountId,
      messageType: 'text',
      contentText: messageText,
      status: 'sent',
      whatsappMessageId,
      replyToMessageId: options.replyToMessageUuid || null // UUID de nuestra BD
    });

    if (saveError) {
      console.warn('[sendTextMessage] Error guardando mensaje en BD:', saveError);
      // No fallar el envío si solo falla el guardado en BD
    }

    // Actualizar última interacción del contacto
    await updateContactInteraction(contactId);

    return {
      success: true,
      messageId: savedMessage?.id || null,
      whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendTextMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      error: {
        message: `Error al enviar mensaje: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Construir contexto para Reply o Forward
 * @param {Object} options - Opciones
 * @param {string} options.replyToMessageId - WhatsApp message ID para Reply
 * @param {Object} options.forwardContext - Contexto para Forward {from: string, id: string}
 * @returns {Object|null} Contexto para agregar al payload
 */
function buildMessageContext(options = {}) {
  if (options.replyToMessageId) {
    return {
      message_id: options.replyToMessageId
    };
  }
  
  if (options.forwardContext && options.forwardContext.from && options.forwardContext.id) {
    return {
      from: options.forwardContext.from,
      id: options.forwardContext.id
    };
  }
  
  return null;
}

/**
 * Subir media a WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {File|Blob|string} mediaFile - Archivo de media o URL
 * @param {string} mediaType - Tipo de media: 'image', 'video', 'audio', 'document'
 * @returns {Promise<{mediaId: string|null, error: Object|null}>}
 */
async function uploadMediaToWhatsApp(accountId, mediaFile, mediaType) {
  try {
    // Obtener cuenta
    const { data: account, error: accountError } = await getAccount(accountId);
    if (accountError || !account) {
      return {
        mediaId: null,
        error: accountError || { message: 'Cuenta no encontrada o inactiva' }
      };
    }

    // Si mediaFile es una URL, primero necesitamos descargarla
    let fileToUpload = mediaFile;
    if (typeof mediaFile === 'string' && mediaFile.startsWith('http')) {
      // Descargar el archivo desde la URL
      const response = await fetch(mediaFile);
      const blob = await response.blob();
      fileToUpload = blob;
    }

    // Validar tamaño según tipo
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 16 * 1024 * 1024, // 16MB
      audio: 16 * 1024 * 1024, // 16MB
      document: 100 * 1024 * 1024 // 100MB
    };

    const maxSize = maxSizes[mediaType] || 5 * 1024 * 1024;
    
    if (fileToUpload instanceof File || fileToUpload instanceof Blob) {
      if (fileToUpload.size > maxSize) {
        return {
          mediaId: null,
          error: {
            message: `El archivo excede el tamaño máximo permitido (${maxSize / 1024 / 1024}MB)`,
            code: 'FILE_TOO_LARGE'
          }
        };
      }
    }

    // Construir URL para subir media
    const uploadUrl = `${GRAPH_API_BASE}/${account.phone_number_id}/media`;

    // Crear FormData
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mediaType);
    formData.append('file', fileToUpload);

    // Subir media
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`
        // No incluir Content-Type, el navegador lo hace automáticamente con FormData
      },
      body: formData
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[uploadMediaToWhatsApp] Error de API:', responseData);
      return {
        mediaId: null,
        error: {
          message: responseData.error?.message || 'Error al subir media',
          code: responseData.error?.code || 'UPLOAD_ERROR',
          details: responseData.error
        }
      };
    }

    // Extraer media ID
    const mediaId = responseData.id || null;

    return {
      mediaId,
      error: null
    };
  } catch (err) {
    console.error('[uploadMediaToWhatsApp] Error fatal:', err);
    return {
      mediaId: null,
      error: {
        message: `Error al subir media: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Enviar mensaje con imagen via WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {File|Blob|string} imageFile - Archivo de imagen o URL
 * @param {string} caption - Caption opcional
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, messageId: string|null, error: Object|null}>}
 */
export async function sendImageMessage(accountId, contactId, imageFile, caption = '', options = {}) {
  try {
    // Validaciones básicas
    if (!accountId || !contactId || !imageFile) {
      return {
        success: false,
        messageId: null,
        error: { message: 'accountId, contactId e imageFile son requeridos' }
      };
    }

    // Validar ventana (a menos que se especifique skipValidation)
    if (!options.skipValidation) {
      const { isActive: windowActive } = await checkWindow24h(contactId);
      const { isWithin72h } = await check72hWindow(contactId);
      
      if (!windowActive && !isWithin72h) {
        return {
          success: false,
          messageId: null,
          error: {
            message: 'Ventana 24h cerrada y contacto fuera de ventana 72h. Usa Puppeteer o espera respuesta del cliente.',
            code: 'WINDOW_CLOSED'
          }
        };
      }
    }

    // Obtener número de teléfono del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const phoneNumber = contact.phone.replace(/\D/g, '');

    // Subir imagen
    const { mediaId, error: uploadError } = await uploadMediaToWhatsApp(accountId, imageFile, 'image');
    
    if (uploadError || !mediaId) {
      return {
        success: false,
        messageId: null,
        error: uploadError || { message: 'Error al subir imagen' }
      };
    }

    // Obtener cuenta
    const { data: account } = await getAccount(accountId);

    // Construir URL de la API
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    // Payload para WhatsApp Cloud API
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'image',
      image: {
        id: mediaId,
        caption: caption || undefined
      }
    };

    // Agregar contexto para Reply o Forward
    const context = buildMessageContext(options);
    if (context) {
      payload.context = context;
    }

    // Enviar mensaje
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[sendImageMessage] Error de API:', responseData);
      return {
        success: false,
        messageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar imagen',
          code: responseData.error?.code || 'API_ERROR',
          details: responseData.error
        }
      };
    }

    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    // Obtener URL del archivo para guardar en BD
    let imageUrl = null;
    if (typeof imageFile === 'string') {
      imageUrl = imageFile;
    } else if (imageFile instanceof File) {
      imageUrl = imageFile.name;
    }

    // Guardar mensaje en BD
    const { data: savedMessage, error: saveError } = await saveMessage({
      contactId,
      accountId,
      messageType: 'image',
      mediaUrl: imageUrl,
      mediaFilename: imageFile instanceof File ? imageFile.name : null,
      caption: caption || null,
      status: 'sent',
      whatsappMessageId,
      replyToMessageId: options.replyToMessageUuid || null // UUID de nuestra BD
    });

    if (saveError) {
      console.warn('[sendImageMessage] Error guardando mensaje en BD:', saveError);
    }

    // Actualizar última interacción
    await updateContactInteraction(contactId);

    return {
      success: true,
      messageId: savedMessage?.id || null,
      whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendImageMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      error: {
        message: `Error al enviar imagen: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Enviar mensaje con video via WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {File|Blob|string} videoFile - Archivo de video o URL
 * @param {string} caption - Caption opcional
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, messageId: string|null, error: Object|null}>}
 */
export async function sendVideoMessage(accountId, contactId, videoFile, caption = '', options = {}) {
  try {
    if (!accountId || !contactId || !videoFile) {
      return {
        success: false,
        messageId: null,
        error: { message: 'accountId, contactId y videoFile son requeridos' }
      };
    }

    if (!options.skipValidation) {
      const { isActive: windowActive } = await checkWindow24h(contactId);
      const { isWithin72h } = await check72hWindow(contactId);
      
      if (!windowActive && !isWithin72h) {
        return {
          success: false,
          messageId: null,
          error: {
            message: 'Ventana 24h cerrada y contacto fuera de ventana 72h.',
            code: 'WINDOW_CLOSED'
          }
        };
      }
    }

    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const phoneNumber = contact.phone.replace(/\D/g, '');

    // Subir video
    const { mediaId, error: uploadError } = await uploadMediaToWhatsApp(accountId, videoFile, 'video');
    
    if (uploadError || !mediaId) {
      return {
        success: false,
        messageId: null,
        error: uploadError || { message: 'Error al subir video' }
      };
    }

    const { data: account } = await getAccount(accountId);
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'video',
      video: {
        id: mediaId,
        caption: caption || undefined
      }
    };

    // Agregar contexto para Reply o Forward
    const context = buildMessageContext(options);
    if (context) {
      payload.context = context;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar video',
          code: responseData.error?.code || 'API_ERROR'
        }
      };
    }

    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    let videoUrl = null;
    if (typeof videoFile === 'string') {
      videoUrl = videoFile;
    } else if (videoFile instanceof File) {
      videoUrl = videoFile.name;
    }

    const { data: savedMessage } = await saveMessage({
      contactId,
      accountId,
      messageType: 'video',
      mediaUrl: videoUrl,
      mediaFilename: videoFile instanceof File ? videoFile.name : null,
      caption: caption || null,
      status: 'sent',
      whatsappMessageId,
      replyToMessageId: options.replyToMessageUuid || null // UUID de nuestra BD
    });

    await updateContactInteraction(contactId);

    return {
      success: true,
      messageId: savedMessage?.id || null,
      whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendVideoMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      error: {
        message: `Error al enviar video: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Enviar mensaje con audio via WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {File|Blob|string} audioFile - Archivo de audio o URL
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, messageId: string|null, error: Object|null}>}
 */
export async function sendAudioMessage(accountId, contactId, audioFile, options = {}) {
  try {
    if (!accountId || !contactId || !audioFile) {
      return {
        success: false,
        messageId: null,
        error: { message: 'accountId, contactId y audioFile son requeridos' }
      };
    }

    if (!options.skipValidation) {
      const { isActive: windowActive } = await checkWindow24h(contactId);
      const { isWithin72h } = await check72hWindow(contactId);
      
      if (!windowActive && !isWithin72h) {
        return {
          success: false,
          messageId: null,
          error: {
            message: 'Ventana 24h cerrada y contacto fuera de ventana 72h.',
            code: 'WINDOW_CLOSED'
          }
        };
      }
    }

    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const phoneNumber = contact.phone.replace(/\D/g, '');

    // Subir audio
    const { mediaId, error: uploadError } = await uploadMediaToWhatsApp(accountId, audioFile, 'audio');
    
    if (uploadError || !mediaId) {
      return {
        success: false,
        messageId: null,
        error: uploadError || { message: 'Error al subir audio' }
      };
    }

    const { data: account } = await getAccount(accountId);
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'audio',
      audio: {
        id: mediaId
      }
    };

    // Agregar contexto para Reply o Forward
    const context = buildMessageContext(options);
    if (context) {
      payload.context = context;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar audio',
          code: responseData.error?.code || 'API_ERROR'
        }
      };
    }

    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    let audioUrl = null;
    if (typeof audioFile === 'string') {
      audioUrl = audioFile;
    } else if (audioFile instanceof File) {
      audioUrl = audioFile.name;
    }

    const { data: savedMessage } = await saveMessage({
      contactId,
      accountId,
      messageType: 'audio',
      mediaUrl: audioUrl,
      mediaFilename: audioFile instanceof File ? audioFile.name : null,
      status: 'sent',
      whatsappMessageId,
      replyToMessageId: options.replyToMessageUuid || null // UUID de nuestra BD
    });

    await updateContactInteraction(contactId);

    return {
      success: true,
      messageId: savedMessage?.id || null,
      whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendAudioMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      error: {
        message: `Error al enviar audio: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

/**
 * Enviar mensaje con documento via WhatsApp Cloud API
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {File|Blob|string} documentFile - Archivo de documento o URL
 * @param {string} filename - Nombre del archivo
 * @param {string} caption - Caption opcional
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, messageId: string|null, error: Object|null}>}
 */
export async function sendDocumentMessage(accountId, contactId, documentFile, filename, caption = '', options = {}) {
  try {
    if (!accountId || !contactId || !documentFile) {
      return {
        success: false,
        messageId: null,
        error: { message: 'accountId, contactId y documentFile son requeridos' }
      };
    }

    if (!options.skipValidation) {
      const { isActive: windowActive } = await checkWindow24h(contactId);
      const { isWithin72h } = await check72hWindow(contactId);
      
      if (!windowActive && !isWithin72h) {
        return {
          success: false,
          messageId: null,
          error: {
            message: 'Ventana 24h cerrada y contacto fuera de ventana 72h.',
            code: 'WINDOW_CLOSED'
          }
        };
      }
    }

    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    const phoneNumber = contact.phone.replace(/\D/g, '');

    // Subir documento
    const { mediaId, error: uploadError } = await uploadMediaToWhatsApp(accountId, documentFile, 'document');
    
    if (uploadError || !mediaId) {
      return {
        success: false,
        messageId: null,
        error: uploadError || { message: 'Error al subir documento' }
      };
    }

    const { data: account } = await getAccount(accountId);
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'document',
      document: {
        id: mediaId,
        filename: filename || (documentFile instanceof File ? documentFile.name : 'documento.pdf'),
        caption: caption || undefined
      }
    };

    // Agregar contexto para Reply o Forward
    const context = buildMessageContext(options);
    if (context) {
      payload.context = context;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar documento',
          code: responseData.error?.code || 'API_ERROR'
        }
      };
    }

    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    let documentUrl = null;
    if (typeof documentFile === 'string') {
      documentUrl = documentFile;
    } else if (documentFile instanceof File) {
      documentUrl = documentFile.name;
    }

    const { data: savedMessage } = await saveMessage({
      contactId,
      accountId,
      messageType: 'document',
      mediaUrl: documentUrl,
      mediaFilename: filename || (documentFile instanceof File ? documentFile.name : null),
      caption: caption || null,
      status: 'sent',
      whatsappMessageId,
      replyToMessageId: options.replyToMessageUuid || null // UUID de nuestra BD
    });

    await updateContactInteraction(contactId);

    return {
      success: true,
      messageId: savedMessage?.id || null,
      whatsappMessageId,
      error: null
    };
  } catch (err) {
    console.error('[sendDocumentMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      error: {
        message: `Error al enviar documento: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

