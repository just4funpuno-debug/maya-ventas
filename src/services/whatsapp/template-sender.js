/**
 * Servicio para enviar templates de WhatsApp via Cloud API
 * FASE 4 - SUBFASE 4.1: Envío de templates
 * 
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
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
 * Obtener contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function getContact(contactId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('id, phone, name')
      .eq('id', contactId)
      .single();
    
    if (error) {
      console.error('[getContact] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getContact] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Guardar mensaje en BD
 * @param {Object} messageData - Datos del mensaje
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function saveMessage(messageData) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert([messageData])
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
 */
async function updateContactInteraction(contactId) {
  try {
    await supabase
      .from('whatsapp_contacts')
      .update({
        last_interaction_at: new Date().toISOString(),
        last_interaction_source: 'crm'
      })
      .eq('id', contactId);
  } catch (err) {
    console.error('[updateContactInteraction] Error:', err);
  }
}

/**
 * Construir componentes para el payload de WhatsApp
 * @param {Object} template - Template con variables reemplazadas
 * @param {Object} variableMap - Mapa de variables {{1}}, {{2}}, etc. → valores
 * @returns {Array} Array de componentes
 */
function buildTemplateComponents(template, variableMap = {}) {
  const components = [];
  
  // HEADER component
  if (template.header_type && template.header_type !== 'NONE') {
    const headerParams = [];
    
    // Buscar variables en el header_text original
    // Necesitamos el template original, pero por ahora asumimos que si hay header_text procesado
    // y hay variables en variableMap, entonces hay variables en el header
    
    // Para header tipo TEXT con variables
    if (template.header_type === 'TEXT' && template.header_text) {
      // Buscar variables {{1}}, {{2}}, etc. en el texto original del template
      // Como ya las reemplazamos, necesitamos obtenerlas de variableMap
      // Asumimos que si hay valores en variableMap, hay variables en el template
      
      // Por ahora, simplificación: si el template tiene header_text y variableMap tiene valores,
      // asumimos que hay variables (esto no es perfecto pero funciona para FASE 4.1)
      // En producción, deberíamos mantener el template original para saber dónde están las variables
    }
    
    // Para header tipo MEDIA (IMAGE, VIDEO, DOCUMENT)
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header_type) && template.header_media_url) {
      // WhatsApp requiere enviar el media como parámetro
      const mediaType = template.header_type.toLowerCase();
      headerParams.push({
        type: mediaType,
        [mediaType]: {
          link: template.header_media_url
        }
      });
    }
    
    if (headerParams.length > 0) {
      components.push({
        type: 'header',
        parameters: headerParams
      });
    }
  }
  
  // BODY component
  // WhatsApp requiere parámetros en el orden de aparición de las variables
  // Extraer valores de variables del variableMap en orden ({{1}}, {{2}}, etc.)
  const bodyParams = [];
  
  // Ordenar las claves numéricas del variableMap
  const sortedKeys = Object.keys(variableMap)
    .map(k => parseInt(k))
    .filter(k => !isNaN(k))
    .sort((a, b) => a - b);
  
  // Construir parámetros en orden
  for (const key of sortedKeys) {
    const value = variableMap[key];
    if (value) {
      bodyParams.push({
        type: 'text',
        text: String(value)
      });
    }
  }
  
  // Solo agregar componente body con parámetros si hay variables
  // Si no hay variables, WhatsApp usará el template tal cual
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams
    });
  }
  
  // FOOTER no tiene parámetros en WhatsApp (solo texto estático)
  // Los botones tampoco requieren parámetros (ya están definidos en el template)
  
  return components;
}

/**
 * Enviar template de WhatsApp via Cloud API
 * FASE 4 - SUBFASE 4.1
 * 
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {string} templateId - ID del template (UUID de nuestra BD)
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, messageId: string|null, whatsappMessageId: string|null, error: Object|null}>}
 */
export async function sendTemplateMessage(accountId, contactId, templateId, options = {}) {
  try {
    // Validaciones básicas
    if (!accountId || !contactId || !templateId) {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: { message: 'accountId, contactId y templateId son requeridos' }
      };
    }

    // Obtener cuenta
    const { data: account, error: accountError } = await getAccount(accountId);
    if (accountError || !account) {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: accountError || { message: 'Cuenta no encontrada o inactiva' }
      };
    }

    // Obtener contacto
    const { data: contact, error: contactError } = await getContact(contactId);
    if (contactError || !contact) {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Mapear variables del template
    const { data: mappedTemplate, error: mapError } = await mapTemplateVariables(
      templateId,
      contactId,
      accountId
    );

    if (mapError || !mappedTemplate) {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: mapError || { message: 'Error al mapear variables del template' }
      };
    }

    const template = mappedTemplate.template;

    // Validar que el template tenga wa_template_name y wa_status approved
    if (!template.wa_template_name) {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: { message: 'El template no tiene un nombre de template de WhatsApp asignado. Debe ser enviado a WhatsApp primero.' }
      };
    }

    if (template.wa_status !== 'approved') {
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: { message: `El template no está aprobado. Estado actual: ${template.wa_status}` }
      };
    }

    // Formatear número de teléfono (debe incluir código de país sin +)
    const phoneNumber = contact.phone.replace(/\D/g, ''); // Solo dígitos

    // Construir URL de la API
    const url = `${GRAPH_API_BASE}/${account.phone_number_id}/messages`;

    // Construir componentes para el payload de WhatsApp
    // Usamos el variableMap retornado por mapTemplateVariables para construir los parámetros
    const variableMap = mappedTemplate.variables || {};
    const components = buildTemplateComponents(template, variableMap);

    // Construir payload para WhatsApp Cloud API
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: template.wa_template_name,
        language: {
          code: template.language || 'es'
        }
      }
    };

    // Agregar componentes si existen
    if (components.length > 0) {
      payload.template.components = components;
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
      console.error('[sendTemplateMessage] Error de API:', responseData);
      return {
        success: false,
        messageId: null,
        whatsappMessageId: null,
        error: {
          message: responseData.error?.message || 'Error al enviar template',
          code: responseData.error?.code || 'API_ERROR',
          details: responseData.error
        }
      };
    }

    // Extraer ID del mensaje de WhatsApp
    const whatsappMessageId = responseData.messages?.[0]?.id || null;

    // Guardar mensaje en BD
    // Para templates, guardamos el contenido procesado como text_content
    const messageContent = template.body_text || '';
    const { data: savedMessage, error: saveError } = await saveMessage({
      contact_id: contactId,
      account_id: accountId,
      message_type: 'text', // Templates se guardan como text
      text_content: messageContent,
      status: 'sent',
      wa_message_id: whatsappMessageId,
      sent_via: 'cloud_api'
    });

    if (saveError) {
      console.warn('[sendTemplateMessage] Error guardando mensaje en BD:', saveError);
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
    console.error('[sendTemplateMessage] Error fatal:', err);
    return {
      success: false,
      messageId: null,
      whatsappMessageId: null,
      error: {
        message: `Error al enviar template: ${err.message}`,
        code: 'FATAL_ERROR'
      }
    };
  }
}

