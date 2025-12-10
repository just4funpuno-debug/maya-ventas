/**
 * Servicio para gestionar Templates de WhatsApp Business API
 * FASE 1 - SUBFASE 1.2: CRUD Básico
 * 
 * Permite crear, listar, obtener, actualizar y eliminar templates
 */

import { supabase } from '../../supabaseClient';

const TEMPLATES_TABLE = 'whatsapp_templates';
const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Validar estructura de botones
 * @param {Array} buttons - Array de botones
 * @returns {{valid: boolean, error: string|null}}
 */
function validateButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return { valid: false, error: 'buttons debe ser un array' };
  }

  if (buttons.length > 3) {
    return { valid: false, error: 'Máximo 3 botones permitidos' };
  }

  let hasCTA = false;
  for (const button of buttons) {
    if (!button.type || !button.text) {
      return { valid: false, error: 'Cada botón debe tener type y text' };
    }

    if (!['QUICK_REPLY', 'CALL_TO_ACTION'].includes(button.type)) {
      return { valid: false, error: 'Tipo de botón inválido. Debe ser QUICK_REPLY o CALL_TO_ACTION' };
    }

    if (button.type === 'CALL_TO_ACTION') {
      if (hasCTA) {
        return { valid: false, error: 'Solo se permite un botón CALL_TO_ACTION' };
      }
      if (!button.url || typeof button.url !== 'string') {
        return { valid: false, error: 'Botón CALL_TO_ACTION requiere url' };
      }
      hasCTA = true;
    }

    if (button.text.length > 20) {
      return { valid: false, error: 'El texto del botón no puede exceder 20 caracteres' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Generar nombre único de template para WhatsApp
 * Formato: nombre_lowercase_timestamp (sin espacios, sin caracteres especiales)
 * @param {string} name - Nombre del template
 * @returns {string}
 */
function generateWaTemplateName(name) {
  const timestamp = Date.now();
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${cleanName}_${timestamp}`;
}

/**
 * Listar templates
 * @param {string} accountId - ID de la cuenta WhatsApp (opcional, para filtrar)
 * @param {string} productId - ID del producto (opcional, para filtrar)
 * @param {string} category - Categoría (opcional: MARKETING, UTILITY, AUTHENTICATION)
 * @param {string} status - Estado (opcional: draft, pending, approved, rejected)
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getTemplates(accountId = null, productId = null, category = null, status = null) {
  try {
    let query = supabase
      .from(TEMPLATES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('wa_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getTemplates] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getTemplates] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener un template por ID
 * @param {string} templateId - ID del template
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getTemplate(templateId) {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('[getTemplate] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[getTemplate] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear un nuevo template
 * @param {Object} templateData - Datos del template
 * @param {string} templateData.account_id - ID de la cuenta WhatsApp
 * @param {string} templateData.product_id - ID del producto (opcional)
 * @param {string} templateData.name - Nombre del template
 * @param {string} templateData.category - Categoría (MARKETING, UTILITY, AUTHENTICATION)
 * @param {string} templateData.language - Idioma (default: 'es')
 * @param {string} templateData.header_type - Tipo de encabezado (TEXT, IMAGE, VIDEO, DOCUMENT, NONE)
 * @param {string} templateData.header_text - Texto del encabezado (si header_type = TEXT)
 * @param {string} templateData.header_media_url - URL del media (si header_type = IMAGE/VIDEO/DOCUMENT)
 * @param {string} templateData.body_text - Cuerpo del mensaje (con variables {{1}}, {{2}}, etc.)
 * @param {string} templateData.footer_text - Pie de página (opcional, máx 60 caracteres)
 * @param {Array} templateData.buttons - Array de botones (opcional)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createTemplate(templateData) {
  try {
    const {
      account_id,
      product_id = null,
      name,
      category,
      language = 'es',
      header_type = 'NONE',
      header_text = null,
      header_media_url = null,
      body_text,
      footer_text = null,
      buttons = []
    } = templateData;

    // Validaciones
    if (!account_id) {
      return {
        data: null,
        error: { message: 'account_id es requerido' }
      };
    }

    if (!name || name.trim() === '') {
      return {
        data: null,
        error: { message: 'name es requerido' }
      };
    }

    if (!category || !['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
      return {
        data: null,
        error: { message: 'category debe ser MARKETING, UTILITY o AUTHENTICATION' }
      };
    }

    if (!body_text || body_text.trim() === '') {
      return {
        data: null,
        error: { message: 'body_text es requerido' }
      };
    }

    // Validar longitud del cuerpo
    if (body_text.length > 1024) {
      return {
        data: null,
        error: { message: 'body_text no puede exceder 1024 caracteres' }
      };
    }

    // Validar encabezado
    if (header_type === 'TEXT' && (!header_text || header_text.trim() === '')) {
      return {
        data: null,
        error: { message: 'header_text es requerido cuando header_type = TEXT' }
      };
    }

    if (header_type === 'TEXT' && header_text.length > 60) {
      return {
        data: null,
        error: { message: 'header_text no puede exceder 60 caracteres' }
      };
    }

    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type) && !header_media_url) {
      return {
        data: null,
        error: { message: 'header_media_url es requerido cuando header_type = IMAGE/VIDEO/DOCUMENT' }
      };
    }

    // Validar pie de página
    if (footer_text && footer_text.length > 60) {
      return {
        data: null,
        error: { message: 'footer_text no puede exceder 60 caracteres' }
      };
    }

    // Validar botones
    if (buttons && buttons.length > 0) {
      const buttonsValidation = validateButtons(buttons);
      if (!buttonsValidation.valid) {
        return {
          data: null,
          error: { message: buttonsValidation.error }
        };
      }
    }

    // Generar nombre único para WhatsApp
    const waTemplateName = generateWaTemplateName(name);

    // Verificar que no exista otro template con el mismo wa_template_name
    const { data: existing } = await supabase
      .from(TEMPLATES_TABLE)
      .select('id')
      .eq('account_id', account_id)
      .eq('wa_template_name', waTemplateName)
      .maybeSingle();

    if (existing) {
      // Si existe, agregar número aleatorio al final
      const uniqueName = `${waTemplateName}_${Math.floor(Math.random() * 1000)}`;
      // Re-intentar si aún existe (muy improbable)
      // Por ahora, simplemente usar el único generado
    }

    // Preparar datos para insertar
    const insertData = {
      account_id,
      product_id,
      name: name.trim(),
      category,
      language,
      header_type,
      header_text: header_type === 'TEXT' ? header_text.trim() : null,
      header_media_url: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type) ? header_media_url : null,
      body_text: body_text.trim(),
      footer_text: footer_text ? footer_text.trim() : null,
      buttons: buttons.length > 0 ? buttons : [],
      wa_template_name: waTemplateName,
      wa_status: 'draft' // Por defecto, en borrador
    };

    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createTemplate] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createTemplate] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar un template
 * @param {string} templateId - ID del template
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateTemplate(templateId, updates) {
  try {
    // Obtener template actual
    const { data: currentTemplate, error: fetchError } = await supabase
      .from(TEMPLATES_TABLE)
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !currentTemplate) {
      return {
        data: null,
        error: fetchError || { message: 'Template no encontrado' }
      };
    }

    // Validar que no se esté editando si ya está aprobado (solo se puede editar drafts)
    if (currentTemplate.wa_status === 'approved' && updates.name) {
      return {
        data: null,
        error: { message: 'No se puede modificar un template aprobado. Crea uno nuevo.' }
      };
    }

    // Validaciones si se actualizan campos específicos
    if (updates.body_text !== undefined) {
      if (!updates.body_text || updates.body_text.trim() === '') {
        return {
          data: null,
          error: { message: 'body_text es requerido' }
        };
      }
      if (updates.body_text.length > 1024) {
        return {
          data: null,
          error: { message: 'body_text no puede exceder 1024 caracteres' }
        };
      }
    }

    if (updates.header_text !== undefined && updates.header_text && updates.header_text.length > 60) {
      return {
        data: null,
        error: { message: 'header_text no puede exceder 60 caracteres' }
      };
    }

    if (updates.footer_text !== undefined && updates.footer_text && updates.footer_text.length > 60) {
      return {
        data: null,
        error: { message: 'footer_text no puede exceder 60 caracteres' }
      };
    }

    if (updates.buttons !== undefined && updates.buttons.length > 0) {
      const buttonsValidation = validateButtons(updates.buttons);
      if (!buttonsValidation.valid) {
        return {
          data: null,
          error: { message: buttonsValidation.error }
        };
      }
    }

    // Actualizar el template
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('[updateTemplate] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[updateTemplate] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar un template
 * @param {string} templateId - ID del template
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function deleteTemplate(templateId) {
  try {
    // Verificar que existe
    const { data: currentTemplate } = await supabase
      .from(TEMPLATES_TABLE)
      .select('wa_status')
      .eq('id', templateId)
      .single();

    if (!currentTemplate) {
      return {
        data: null,
        error: { message: 'Template no encontrado' }
      };
    }

    // Si está aprobado, solo marcar como eliminado (soft delete)
    // Por ahora, eliminamos físicamente
    // TODO: En el futuro, podríamos hacer soft delete

    const { error } = await supabase
      .from(TEMPLATES_TABLE)
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('[deleteTemplate] Error:', error);
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('[deleteTemplate] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener cuenta WhatsApp y su Business Account ID
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function getAccountForTemplate(accountId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('active', true)
      .single();

    if (error || !data) {
      return { data: null, error: error || { message: 'Cuenta WhatsApp no encontrada' } };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[getAccountForTemplate] Error:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear template en WhatsApp Business API
 * FASE 2 - SUBFASE 2.1: Integración con WhatsApp API
 * 
 * @param {string} templateId - ID del template en nuestra BD
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createTemplateInWhatsApp(templateId) {
  try {
    // Obtener template de nuestra BD
    const { data: template, error: templateError } = await getTemplate(templateId);
    if (templateError || !template) {
      return {
        data: null,
        error: templateError || { message: 'Template no encontrado' }
      };
    }

    // Verificar que tiene account_id
    if (!template.account_id) {
      return {
        data: null,
        error: { message: 'Template no tiene account_id asociado' }
      };
    }

    // Obtener cuenta WhatsApp
    const { data: account, error: accountError } = await getAccountForTemplate(template.account_id);
    if (accountError || !account) {
      return {
        data: null,
        error: accountError || { message: 'Cuenta WhatsApp no encontrada' }
      };
    }

    // Verificar que tiene business_account_id
    if (!account.business_account_id) {
      return {
        data: null,
        error: { message: 'Cuenta WhatsApp no tiene business_account_id configurado' }
      };
    }

    // Construir componentes del template según WhatsApp API
    const components = [];

    // HEADER component
    if (template.header_type && template.header_type !== 'NONE') {
      const headerComponent = {
        type: 'HEADER',
        format: template.header_type.toUpperCase() // TEXT, IMAGE, VIDEO, DOCUMENT
      };

      if (template.header_type === 'TEXT' && template.header_text) {
        headerComponent.text = template.header_text;
      }

      // Para IMAGE, VIDEO, DOCUMENT necesitamos el ejemplo de media
      // Por ahora, si hay header_media_url, lo usamos como ejemplo
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header_type) && template.header_media_url) {
        // WhatsApp requiere un ejemplo de media (opcional para TEXT)
        // En producción, deberías subir el media primero y obtener el handle
        headerComponent.example = {
          header_handle: [template.header_media_url] // Simplificado, en producción usar handle de WhatsApp
        };
      }

      components.push(headerComponent);
    }

    // BODY component (requerido)
    if (!template.body_text) {
      return {
        data: null,
        error: { message: 'El cuerpo del mensaje es requerido' }
      };
    }

    components.push({
      type: 'BODY',
      text: template.body_text
    });

    // FOOTER component (opcional)
    if (template.footer_text) {
      components.push({
        type: 'FOOTER',
        text: template.footer_text
      });
    }

    // BUTTONS component (opcional)
    if (template.buttons && template.buttons.length > 0) {
      const buttonComponents = template.buttons.map(button => {
        if (button.type === 'QUICK_REPLY') {
          return {
            type: 'QUICK_REPLY',
            text: button.text
          };
        } else if (button.type === 'CALL_TO_ACTION') {
          return {
            type: 'URL',
            text: button.text,
            url: button.url
          };
        }
        return null;
      }).filter(Boolean);

      if (buttonComponents.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttonComponents
        });
      }
    }

    // Construir payload para WhatsApp API
    const payload = {
      name: template.wa_template_name || template.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      language: template.language || 'es',
      category: template.category,
      components: components
    };

    // Llamar a WhatsApp API
    // Usar business_account_id como WABA ID
    const wabaId = account.business_account_id;
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      return {
        data: null,
        error: {
          message: 'Error al parsear respuesta de WhatsApp API',
          details: text.substring(0, 200)
        }
      };
    }

    if (!response.ok) {
      console.error('[createTemplateInWhatsApp] Error de WhatsApp API:', responseData);
      return {
        data: null,
        error: {
          message: responseData.error?.message || 'Error al crear template en WhatsApp',
          code: responseData.error?.code,
          details: responseData.error
        }
      };
    }

    // Actualizar template en BD con el ID de WhatsApp y estado
    const { error: updateError } = await updateTemplate(templateId, {
      wa_template_id: responseData.id || responseData.data?.[0]?.id,
      wa_status: 'pending',
      last_synced_at: new Date().toISOString()
    });

    if (updateError) {
      console.warn('[createTemplateInWhatsApp] Template creado en WhatsApp pero error actualizando BD:', updateError);
    }

    return {
      data: {
        wa_template_id: responseData.id || responseData.data?.[0]?.id,
        wa_status: 'pending'
      },
      error: null
    };
  } catch (err) {
    console.error('[createTemplateInWhatsApp] Error fatal:', err);
    return {
      data: null,
      error: { message: err.message || 'Error desconocido al crear template en WhatsApp' }
    };
  }
}

/**
 * Listar templates desde WhatsApp Business API
 * FASE 2 - SUBFASE 2.2: Sincronizar con WhatsApp
 * 
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function listTemplatesFromWhatsApp(accountId) {
  try {
    // Obtener cuenta WhatsApp
    const { data: account, error: accountError } = await getAccountForTemplate(accountId);
    if (accountError || !account) {
      return {
        data: null,
        error: accountError || { message: 'Cuenta WhatsApp no encontrada' }
      };
    }

    if (!account.business_account_id) {
      return {
        data: null,
        error: { message: 'Cuenta WhatsApp no tiene business_account_id configurado' }
      };
    }

    // Llamar a WhatsApp API para listar templates
    const wabaId = account.business_account_id;
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      return {
        data: null,
        error: {
          message: 'Error al parsear respuesta de WhatsApp API',
          details: text.substring(0, 200)
        }
      };
    }

    if (!response.ok) {
      console.error('[listTemplatesFromWhatsApp] Error de WhatsApp API:', responseData);
      return {
        data: null,
        error: {
          message: responseData.error?.message || 'Error al listar templates de WhatsApp',
          code: responseData.error?.code,
          details: responseData.error
        }
      };
    }

    // WhatsApp retorna { data: [...] } o directamente un array
    const templates = responseData.data || responseData;

    return {
      data: Array.isArray(templates) ? templates : [],
      error: null
    };
  } catch (err) {
    console.error('[listTemplatesFromWhatsApp] Error fatal:', err);
    return {
      data: null,
      error: { message: err.message || 'Error desconocido al listar templates de WhatsApp' }
    };
  }
}

/**
 * Sincronizar estado de un template con WhatsApp
 * FASE 2 - SUBFASE 2.2: Actualizar estado desde WhatsApp
 * 
 * @param {string} templateId - ID del template en nuestra BD
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function syncTemplateStatusFromWhatsApp(templateId) {
  try {
    // Obtener template de nuestra BD
    const { data: template, error: templateError } = await getTemplate(templateId);
    if (templateError || !template) {
      return {
        data: null,
        error: templateError || { message: 'Template no encontrado' }
      };
    }

    // Si no tiene wa_template_id, no podemos sincronizar
    if (!template.wa_template_id) {
      return {
        data: null,
        error: { message: 'Template no tiene wa_template_id. Debe enviarse a WhatsApp primero.' }
      };
    }

    // Obtener cuenta WhatsApp
    const { data: account, error: accountError } = await getAccountForTemplate(template.account_id);
    if (accountError || !account) {
      return {
        data: null,
        error: accountError || { message: 'Cuenta WhatsApp no encontrada' }
      };
    }

    if (!account.business_account_id) {
      return {
        data: null,
        error: { message: 'Cuenta WhatsApp no tiene business_account_id configurado' }
      };
    }

    // Llamar a WhatsApp API para obtener el template específico
    const wabaId = account.business_account_id;
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(template.wa_template_name || '')}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      return {
        data: null,
        error: {
          message: 'Error al parsear respuesta de WhatsApp API',
          details: text.substring(0, 200)
        }
      };
    }

    if (!response.ok) {
      console.error('[syncTemplateStatusFromWhatsApp] Error de WhatsApp API:', responseData);
      return {
        data: null,
        error: {
          message: responseData.error?.message || 'Error al sincronizar estado del template',
          code: responseData.error?.code
        }
      };
    }

    // Buscar el template específico en la respuesta
    const templates = responseData.data || [];
    const waTemplate = templates.find(t => 
      t.id === template.wa_template_id || 
      t.name === template.wa_template_name
    );

    if (!waTemplate) {
      return {
        data: null,
        error: { message: 'Template no encontrado en WhatsApp. Puede haber sido eliminado.' }
      };
    }

    // Mapear estado de WhatsApp a nuestro estado
    const statusMap = {
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'PENDING': 'pending',
      'PAUSED': 'paused'
    };

    const newStatus = statusMap[waTemplate.status] || 'pending';
    const rejectionReason = waTemplate.reason || null;

    // Actualizar en BD
    const { error: updateError } = await updateTemplate(templateId, {
      wa_status: newStatus,
      wa_rejection_reason: rejectionReason,
      last_synced_at: new Date().toISOString()
    });

    if (updateError) {
      console.warn('[syncTemplateStatusFromWhatsApp] Error actualizando BD:', updateError);
    }

    return {
      data: {
        wa_status: newStatus,
        wa_rejection_reason: rejectionReason,
        last_synced_at: new Date().toISOString()
      },
      error: null
    };
  } catch (err) {
    console.error('[syncTemplateStatusFromWhatsApp] Error fatal:', err);
    return {
      data: null,
      error: { message: err.message || 'Error desconocido al sincronizar estado' }
    };
  }
}

/**
 * Sincronizar todos los templates de una cuenta con WhatsApp
 * FASE 2 - SUBFASE 2.2: Sincronización masiva
 * 
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function syncAllTemplatesFromWhatsApp(accountId) {
  try {
    // Listar templates desde WhatsApp
    const { data: waTemplates, error: listError } = await listTemplatesFromWhatsApp(accountId);
    if (listError) {
      return {
        data: null,
        error: listError
      };
    }

    // Obtener templates de nuestra BD para este account
    const { data: localTemplates, error: localError } = await getTemplates(accountId);
    if (localError) {
      return {
        data: null,
        error: localError
      };
    }

    // Mapear por wa_template_name o wa_template_id
    const templateMap = new Map();
    localTemplates.forEach(t => {
      if (t.wa_template_name) {
        templateMap.set(t.wa_template_name, t);
      }
      if (t.wa_template_id) {
        templateMap.set(t.wa_template_id, t);
      }
    });

    // Sincronizar cada template
    const statusMap = {
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'PENDING': 'pending',
      'PAUSED': 'paused'
    };

    const results = {
      synced: 0,
      failed: 0,
      notFound: 0
    };

    for (const waTemplate of waTemplates) {
      const localTemplate = templateMap.get(waTemplate.name) || templateMap.get(waTemplate.id);
      
      if (localTemplate) {
        const newStatus = statusMap[waTemplate.status] || 'pending';
        const rejectionReason = waTemplate.reason || null;

        const { error: updateError } = await updateTemplate(localTemplate.id, {
          wa_status: newStatus,
          wa_rejection_reason: rejectionReason,
          wa_template_id: waTemplate.id,
          last_synced_at: new Date().toISOString()
        });

        if (updateError) {
          console.warn(`[syncAllTemplatesFromWhatsApp] Error sincronizando template ${localTemplate.id}:`, updateError);
          results.failed++;
        } else {
          results.synced++;
        }
      } else {
        results.notFound++;
      }
    }

    return {
      data: {
        total: waTemplates.length,
        synced: results.synced,
        failed: results.failed,
        notFound: results.notFound
      },
      error: null
    };
  } catch (err) {
    console.error('[syncAllTemplatesFromWhatsApp] Error fatal:', err);
    return {
      data: null,
      error: { message: err.message || 'Error desconocido al sincronizar templates' }
    };
  }
}

/**
 * Obtener datos del contacto y lead para mapeo de variables
 * FASE 3: SUBFASE 3.3 - Helper para obtener datos de contexto
 * @param {string} contactId - ID del contacto
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function getContactAndLeadData(contactId, accountId) {
  try {
    // Obtener contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('id, name, phone, account_id, created_at')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return { data: null, error: contactError || { message: 'Contacto no encontrado' } };
    }

    // Obtener cuenta para obtener product_id
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('id, product_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return { data: { contact, lead: null, product: null }, error: null };
    }

    // Obtener lead si existe
    let lead = null;
    if (account.product_id) {
      const { data: leadData, error: leadError } = await supabase.rpc('get_lead_by_contact', {
        p_contact_id: contactId,
        p_product_id: account.product_id,
        p_status: 'active'
      });

      if (!leadError && leadData && leadData.length > 0) {
        lead = leadData[0];
      }
    }

    // Obtener información del producto si existe
    let product = null;
    if (account.product_id) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('id', account.product_id)
        .single();

      if (!productError && productData) {
        product = productData;
      }
    }

    return {
      data: {
        contact,
        lead,
        product
      },
      error: null
    };
  } catch (err) {
    console.error('[getContactAndLeadData] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Mapear variables de template con datos del contacto/lead
 * FASE 3: SUBFASE 3.3 - Mapeo de variables
 * 
 * @param {string} templateId - ID del template
 * @param {string} contactId - ID del contacto
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function mapTemplateVariables(templateId, contactId, accountId) {
  try {
    // Obtener template
    const { data: template, error: templateError } = await getTemplate(templateId);
    if (templateError || !template) {
      return {
        data: null,
        error: templateError || { message: 'Template no encontrado' }
      };
    }

    // Obtener datos del contacto y lead
    const { data: contextData, error: contextError } = await getContactAndLeadData(contactId, accountId);
    if (contextError) {
      return {
        data: null,
        error: contextError
      };
    }

    const { contact, lead, product } = contextData || {};

    // Mapeo de variables estándar
    // {{1}} = Nombre del contacto
    // {{2}} = Nombre del producto
    // {{3}} = Etapa del lead
    // {{4}} = Valor estimado del lead
    // {{5}} = Fecha actual (formato corto)
    // {{6}} = Fecha actual (formato largo)
    // {{7}} = Teléfono del contacto
    // {{8}} = Nombre de la cuenta/producto

    const now = new Date();
    const dateShort = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateLong = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const variableMap = {
      1: contact?.name || 'Cliente', // Nombre del contacto
      2: product?.name || 'Producto', // Nombre del producto
      3: lead?.pipeline_stage || 'Sin etapa', // Etapa del lead
      4: lead?.estimated_value ? `$${parseFloat(lead.estimated_value).toFixed(2)}` : '$0.00', // Valor estimado
      5: dateShort, // Fecha corta (DD/MM/YYYY)
      6: dateLong, // Fecha larga
      7: contact?.phone || '', // Teléfono
      8: product?.name || 'Nuestro producto' // Nombre del producto (alias)
    };

    // Reemplazar variables en header_text (si existe)
    let headerText = template.header_text || '';
    if (headerText) {
      Object.keys(variableMap).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        headerText = headerText.replace(regex, variableMap[key]);
      });
    }

    // Reemplazar variables en body_text
    let bodyText = template.body_text || '';
    if (bodyText) {
      Object.keys(variableMap).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        bodyText = bodyText.replace(regex, variableMap[key]);
      });
    }

    // Reemplazar variables en footer_text (si existe)
    let footerText = template.footer_text || '';
    if (footerText) {
      Object.keys(variableMap).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        footerText = footerText.replace(regex, variableMap[key]);
      });
    }

    // Reemplazar variables en buttons (si existen)
    let buttons = template.buttons ? JSON.parse(JSON.stringify(template.buttons)) : null;
    if (buttons && Array.isArray(buttons)) {
      buttons = buttons.map(button => {
        if (button.text) {
          let buttonText = button.text;
          Object.keys(variableMap).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            buttonText = buttonText.replace(regex, variableMap[key]);
          });
          return { ...button, text: buttonText };
        }
        return button;
      });
    }

    return {
      data: {
        template: {
          ...template,
          header_text: headerText,
          body_text: bodyText,
          footer_text: footerText,
          buttons: buttons
        },
        variables: variableMap,
        context: {
          contact: contact ? { name: contact.name, phone: contact.phone } : null,
          lead: lead ? { 
            pipeline_stage: lead.pipeline_stage, 
            estimated_value: lead.estimated_value 
          } : null,
          product: product ? { name: product.name } : null
        }
      },
      error: null
    };
  } catch (err) {
    console.error('[mapTemplateVariables] Error fatal:', err);
    return {
      data: null,
      error: { message: err.message || 'Error desconocido al mapear variables' }
    };
  }
}

/**
 * Contar templates por estado
 * @param {string} accountId - ID de la cuenta WhatsApp (opcional)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getTemplateStats(accountId = null) {
  try {
    let query = supabase
      .from(TEMPLATES_TABLE)
      .select('wa_status', { count: 'exact', head: true });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { count, error } = await query;

    // Obtener conteos por estado
    const { data: statsData } = await supabase
      .from(TEMPLATES_TABLE)
      .select('wa_status');

    if (accountId) {
      statsData?.filter(t => t.account_id === accountId);
    }

    const stats = {
      total: count || 0,
      draft: statsData?.filter(t => t.wa_status === 'draft').length || 0,
      pending: statsData?.filter(t => t.wa_status === 'pending').length || 0,
      approved: statsData?.filter(t => t.wa_status === 'approved').length || 0,
      rejected: statsData?.filter(t => t.wa_status === 'rejected').length || 0,
      paused: statsData?.filter(t => t.wa_status === 'paused').length || 0
    };

    return { data: stats, error: null };
  } catch (err) {
    console.error('[getTemplateStats] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

