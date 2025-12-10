/**
 * Servicio para gestionar leads del CRM
 * FASE 2 - SUBFASE 2.1: Servicio de Leads
 * 
 * Proporciona funciones CRUD para leads y sus actividades
 * Compatible con sistema multi-producto
 */

import { supabase } from '../../supabaseClient';

const LEADS_TABLE = 'whatsapp_leads';
const ACTIVITIES_TABLE = 'whatsapp_lead_activities';

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
 * Obtener leads por producto
 * @param {string} productId - ID del producto
 * @param {Array<string>|null} userSkus - SKUs del usuario para filtrar (null = admin)
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getLeadsByProduct(productId, userSkus = null, options = {}) {
  try {
    const { status = 'active', limit = 100 } = options;
    
    // Si hay filtro de productos, verificar permisos
    let allowedAccountIds = null;
    if (userSkus && userSkus.length > 0) {
      allowedAccountIds = await getAccountIdsForUser(userSkus);
      
      // Si no hay cuentas permitidas, retornar vacío
      if (!allowedAccountIds || allowedAccountIds.length === 0) {
        return { data: [], error: null };
      }
    }
    
    // Usar función SQL helper
    const { data, error } = await supabase.rpc('get_leads_by_product_id', {
      p_product_id: productId,
      p_status: status,
      p_user_skus: userSkus || null
    });
    
    if (error) {
      console.error('[getLeadsByProduct] Error:', error);
      return { data: null, error };
    }
    
    // Filtrar por account_ids si es necesario
    let leads = data || [];
    if (allowedAccountIds && allowedAccountIds.length > 0) {
      leads = leads.filter(lead => allowedAccountIds.includes(lead.account_id));
    }
    
    // Aplicar límite
    if (limit && leads.length > limit) {
      leads = leads.slice(0, limit);
    }
    
    return { data: leads, error: null };
  } catch (err) {
    console.error('[getLeadsByProduct] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener lead por ID
 * @param {string} leadId - ID del lead
 * @param {Array<string>|null} userSkus - SKUs del usuario para verificar permisos
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLeadById(leadId, userSkus = null) {
  try {
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select('*')
      .eq('id', leadId)
      .maybeSingle();
    
    if (error) {
      console.error('[getLeadById] Error:', error);
      return { data: null, error };
    }
    
    if (!data) {
      return { data: null, error: null };
    }
    
    // Verificar permisos si hay filtro de productos
    if (userSkus && userSkus.length > 0) {
      const allowedAccountIds = await getAccountIdsForUser(userSkus);
      
      if (!allowedAccountIds || allowedAccountIds.length === 0 || !allowedAccountIds.includes(data.account_id)) {
        return {
          data: null,
          error: {
            message: 'No tienes permisos para acceder a este lead',
            code: 'PERMISSION_DENIED'
          }
        };
      }
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getLeadById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear lead manualmente
 * @param {Object} leadData - Datos del lead
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createLead(leadData) {
  try {
    const {
      contact_id,
      account_id,
      product_id,
      pipeline_stage = 'entrantes',
      source = 'manual',
      assigned_to = null,
      estimated_value = 0,
      notes = null
    } = leadData;
    
    if (!contact_id || !account_id) {
      return {
        data: null,
        error: { message: 'contact_id y account_id son requeridos' }
      };
    }
    
    // FASE 4: SUBFASE 4.1 - Validar que product_id sea requerido
    if (!product_id) {
      return {
        data: null,
        error: { message: 'product_id es requerido. No se pueden crear leads sin producto.' }
      };
    }
    
    // FASE 1: SUBFASE 1.3 - Validar que account_id pertenece al product_id (si la cuenta tiene product_id)
    if (account_id && product_id) {
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .select('product_id')
        .eq('id', account_id)
        .maybeSingle();
      
      if (accountError && accountError.code !== 'PGRST116') {
        console.error('[createLead] Error verificando cuenta:', accountError);
        return {
          data: null,
          error: {
            message: 'Error al verificar la cuenta WhatsApp',
            details: accountError
          }
        };
      }
      
      // Solo validar si la cuenta tiene un product_id asignado
      // Si la cuenta no tiene product_id (null), permite crear el lead con cualquier producto
      if (account && account.product_id !== null && account.product_id !== product_id) {
        return {
          data: null,
          error: {
            message: `La cuenta WhatsApp pertenece al producto con ID "${account.product_id}" pero el lead es para "${product_id}". Los productos son completamente independientes y no se pueden mezclar.`,
            code: 'PRODUCT_ACCOUNT_MISMATCH',
            account_product_id: account.product_id,
            lead_product_id: product_id
          }
        };
      }
    }
    
    // Verificar si ya existe un lead activo para este contacto y producto
    if (product_id) {
      const { data: existing } = await supabase
        .from(LEADS_TABLE)
        .select('id')
        .eq('contact_id', contact_id)
        .eq('product_id', product_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (existing) {
        return {
          data: null,
          error: {
            message: 'Ya existe un lead activo para este contacto y producto',
            code: 'DUPLICATE_LEAD',
            existing_lead_id: existing.id
          }
        };
      }
    }
    
    // Crear lead (product_id ya está validado arriba)
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .insert({
        contact_id,
        account_id,
        product_id, // FASE 4: SUBFASE 4.1 - Ya validado, no puede ser null
        pipeline_stage,
        source,
        assigned_to,
        estimated_value,
        notes,
        status: 'active',
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[createLead] Error:', error);
      return { data: null, error };
    }
    
    // Crear actividad inicial
    if (data) {
      await addLeadActivity(data.id, {
        type: 'note',
        content: 'Lead creado manualmente',
        user_id: null
      });
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[createLead] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar lead
 * @param {string} leadId - ID del lead
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateLead(leadId, updates) {
  try {
    // FASE 1: SUBFASE 1.3 - Validar que no se intente cambiar product_id
    if (updates.product_id !== undefined) {
      // Obtener lead actual para comparar
      const { data: currentLead } = await supabase
        .from(LEADS_TABLE)
        .select('product_id')
        .eq('id', leadId)
        .maybeSingle();
      
      if (currentLead && currentLead.product_id !== updates.product_id) {
        return {
          data: null,
          error: {
            message: 'No se puede cambiar el producto de un lead. Los productos son completamente independientes. Si necesitas mover el lead a otro producto, deberás crear un nuevo lead.',
            code: 'PRODUCT_CHANGE_NOT_ALLOWED',
            current_product_id: currentLead.product_id,
            attempted_product_id: updates.product_id
          }
        };
      }
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Solo incluir campos que se proporcionaron (EXCEPTO product_id - no se puede cambiar)
    if (updates.pipeline_stage !== undefined) {
      updateData.pipeline_stage = updates.pipeline_stage;
    }
    if (updates.assigned_to !== undefined) {
      updateData.assigned_to = updates.assigned_to || null;
    }
    if (updates.estimated_value !== undefined) {
      updateData.estimated_value = updates.estimated_value;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }
    if (updates.lead_score !== undefined) {
      updateData.lead_score = updates.lead_score;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    // NOTA: product_id NO se incluye en updateData - no se puede cambiar
    
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) {
      console.error('[updateLead] Error:', error);
      return { data: null, error };
    }
    
    // Si cambió la etapa, crear actividad
    if (updates.pipeline_stage && data) {
      await addLeadActivity(leadId, {
        type: 'stage_change',
        content: `Etapa cambiada a: ${updates.pipeline_stage}`,
        user_id: null,
        metadata: {
          old_stage: data.pipeline_stage,
          new_stage: updates.pipeline_stage
        }
      });
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[updateLead] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Mover lead a otra etapa
 * FASE 1: SUBFASE 1.3 - Validación de independencia de productos
 * FASE 3: SUBFASE 3.2 - Auto-asignación de secuencias estilo Kommo
 * 
 * @param {string} leadId - ID del lead
 * @param {string} newStage - Nueva etapa
 * @param {string|null} userId - ID del usuario que realiza el cambio (opcional)
 * @param {string|null} productId - ID del producto (opcional, para validación)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function moveLeadToStage(leadId, newStage, userId = null, productId = null) {
  try {
    // FASE 1: SUBFASE 1.3 - Obtener lead completo para validar producto
    const { data: currentLead, error: fetchError } = await supabase
      .from(LEADS_TABLE)
      .select('pipeline_stage, product_id')
      .eq('id', leadId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[moveLeadToStage] Error obteniendo lead:', fetchError);
      return { data: null, error: fetchError };
    }
    
    if (!currentLead) {
      return { data: null, error: { message: 'Lead no encontrado' } };
    }
    
    // FASE 1: SUBFASE 1.3 - Validar que el lead pertenece al producto esperado
    const leadProductId = productId || currentLead.product_id;
    if (leadProductId && currentLead.product_id !== leadProductId) {
      return {
        data: null,
        error: {
          message: 'No se puede mover este lead. El lead pertenece a un producto diferente. Los productos son completamente independientes.',
          code: 'PRODUCT_MISMATCH',
          lead_product_id: currentLead.product_id,
          expected_product_id: leadProductId
        }
      };
    }
    
    // FASE 3: SUBFASE 3.2 - Obtener pipeline y buscar secuencia de la etapa
    let stageSequenceId = null;
    if (currentLead.product_id) {
      try {
        const { getPipelineByProduct } = await import('./pipelines');
        const { data: pipeline, error: pipelineError } = await getPipelineByProduct(currentLead.product_id);
        
        if (!pipelineError && pipeline && pipeline.stages) {
          const stage = pipeline.stages.find(s => s.name === newStage);
          if (stage && stage.sequence_id) {
            stageSequenceId = stage.sequence_id;
            console.log('[moveLeadToStage] Etapa tiene secuencia asignada:', stageSequenceId);
          }
        }
      } catch (pipelineErr) {
        console.warn('[moveLeadToStage] Error obteniendo pipeline (continuando):', pipelineErr);
        // Continuar aunque falle (puede que no haya pipeline configurado)
      }
    }
    
    // Actualizar etapa
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .update({
        pipeline_stage: newStage,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) {
      console.error('[moveLeadToStage] Error:', error);
      return { data: null, error };
    }
    
    // FASE 3: SUBFASE 3.2 - Auto-asignar secuencia si la etapa tiene una
    if (stageSequenceId) {
      try {
        const { success: assignSuccess, error: assignError } = await assignSequenceToLead(
          leadId,
          stageSequenceId,
          userId
        );
        
        if (assignSuccess) {
          console.log('[moveLeadToStage] ✅ Secuencia asignada automáticamente:', stageSequenceId);
        } else {
          console.warn('[moveLeadToStage] ⚠️ Error asignando secuencia (continuando):', assignError);
          // Continuar aunque falle la asignación de secuencia
        }
      } catch (assignErr) {
        console.warn('[moveLeadToStage] ⚠️ Error asignando secuencia (continuando):', assignErr);
        // Continuar aunque falle
      }
    } else {
      // FASE 3: SUBFASE 3.2 - Si no tiene secuencia, detener la actual si existe
      try {
        const { stopLeadSequence } = await import('./leads');
        await stopLeadSequence(leadId, userId);
        console.log('[moveLeadToStage] ✅ Secuencia actual detenida (etapa sin secuencia)');
      } catch (stopErr) {
        console.warn('[moveLeadToStage] ⚠️ Error deteniendo secuencia (continuando):', stopErr);
        // Continuar aunque falle
      }
    }
    
    // Crear actividad de cambio de etapa
    await addLeadActivity(leadId, {
      type: 'stage_change',
      content: `Movido de "${currentLead.pipeline_stage}" a "${newStage}"${stageSequenceId ? ' (Flujo iniciado automáticamente)' : ''}`,
      user_id: userId,
      metadata: {
        old_stage: currentLead.pipeline_stage,
        new_stage: newStage,
        sequence_id: stageSequenceId || null
      }
    });
    
    return { data, error: null };
  } catch (err) {
    console.error('[moveLeadToStage] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar lead (soft delete - cambiar status a archived)
 * @param {string} leadId - ID del lead
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteLead(leadId) {
  try {
    const { error } = await supabase
      .from(LEADS_TABLE)
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);
    
    if (error) {
      console.error('[deleteLead] Error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteLead] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener actividades de un lead
 * @param {string} leadId - ID del lead
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getLeadActivities(leadId) {
  try {
    const { data, error } = await supabase
      .from(ACTIVITIES_TABLE)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[getLeadActivities] Error:', error);
      return { data: null, error };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getLeadActivities] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Agregar actividad a un lead
 * @param {string} leadId - ID del lead
 * @param {Object} activityData - Datos de la actividad
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function addLeadActivity(leadId, activityData) {
  try {
    const {
      type,
      content,
      user_id = null,
      metadata = {}
    } = activityData;
    
    if (!type) {
      return {
        data: null,
        error: { message: 'type es requerido' }
      };
    }
    
    // Crear actividad
    const { data, error } = await supabase
      .from(ACTIVITIES_TABLE)
      .insert({
        lead_id: leadId,
        type,
        content: content || null,
        user_id,
        metadata
      })
      .select()
      .single();
    
    if (error) {
      console.error('[addLeadActivity] Error:', error);
      return { data: null, error };
    }
    
    // Actualizar última actividad del lead
    await supabase.rpc('update_lead_activity', {
      p_lead_id: leadId
    });
    
    return { data, error: null };
  } catch (err) {
    console.error('[addLeadActivity] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener contadores de leads por etapa
 * @param {string} productId - ID del producto
 * @param {Array<string>|null} userSkus - SKUs del usuario
 * @param {string} status - Estado de los leads (default: 'active')
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getLeadCountsByStage(productId, userSkus = null, status = 'active') {
  try {
    const { data, error } = await supabase.rpc('count_leads_by_stage', {
      p_product_id: productId,
      p_status: status,
      p_user_skus: userSkus || null
    });
    
    if (error) {
      console.error('[getLeadCountsByStage] Error:', error);
      return { data: null, error };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getLeadCountsByStage] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Buscar leads
 * @param {string} productId - ID del producto
 * @param {Array<string>|null} userSkus - SKUs del usuario
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function searchLeads(productId, userSkus = null, searchTerm) {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      // Si no hay término de búsqueda, retornar todos los leads del producto
      return getLeadsByProduct(productId, userSkus);
    }
    
    // Obtener leads del producto
    const { data: allLeads, error } = await getLeadsByProduct(productId, userSkus);
    
    if (error) {
      return { data: null, error };
    }
    
    // Filtrar por término de búsqueda
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = (allLeads || []).filter(lead => {
      const name = (lead.contact_name || '').toLowerCase();
      const phone = (lead.contact_phone || '').toLowerCase();
      const notes = (lead.notes || '').toLowerCase();
      
      return name.includes(searchLower) || 
             phone.includes(searchLower) || 
             notes.includes(searchLower);
    });
    
    return { data: filtered, error: null };
  } catch (err) {
    console.error('[searchLeads] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Verificar si un contacto tiene lead en un producto
 * @param {string} contactId - ID del contacto
 * @param {string} productId - ID del producto
 * @returns {Promise<{hasLead: boolean, leadId: string|null, error: Object|null}>}
 */
export async function contactHasLead(contactId, productId) {
  try {
    const { data, error } = await supabase.rpc('contact_has_lead', {
      p_contact_id: contactId,
      p_product_id: productId,
      p_status: 'active'
    });
    
    if (error) {
      console.error('[contactHasLead] Error:', error);
      return { hasLead: false, leadId: null, error };
    }
    
    // Si tiene lead, obtener el ID
    if (data) {
      const { data: leadData } = await supabase.rpc('get_lead_by_contact', {
        p_contact_id: contactId,
        p_product_id: productId,
        p_status: 'active'
      });
      
      return {
        hasLead: true,
        leadId: leadData && leadData.length > 0 ? leadData[0].id : null,
        error: null
      };
    }
    
    return { hasLead: false, leadId: null, error: null };
  } catch (err) {
    console.error('[contactHasLead] Error fatal:', err);
    return { hasLead: false, leadId: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener lead de un contacto
 * @param {string} contactId - ID del contacto
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLeadByContact(contactId, productId) {
  try {
    const { data, error } = await supabase.rpc('get_lead_by_contact', {
      p_contact_id: contactId,
      p_product_id: productId,
      p_status: 'active'
    });
    
    if (error) {
      console.error('[getLeadByContact] Error:', error);
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      return { data: null, error: null };
    }
    
    return { data: data[0], error: null };
  } catch (err) {
    console.error('[getLeadByContact] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear lead desde contacto
 * @param {string} contactId - ID del contacto
 * @param {string} productId - ID del producto
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createLeadFromContact(contactId, productId, accountId) {
  try {
    // Verificar si ya existe lead
    const { hasLead, leadId } = await contactHasLead(contactId, productId);
    
    if (hasLead && leadId) {
      // Retornar lead existente
      return getLeadById(leadId);
    }
    
    // Crear nuevo lead
    return createLead({
      contact_id: contactId,
      account_id: accountId,
      product_id: productId,
      pipeline_stage: 'entrantes',
      source: 'manual'
    });
  } catch (err) {
    console.error('[createLeadFromContact] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener estadísticas de leads por producto
 * @param {string} productId - ID del producto
 * @param {Array<string>|null} userSkus - SKUs del usuario
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLeadStatsByProduct(productId, userSkus = null) {
  try {
    const { data, error } = await supabase.rpc('get_lead_stats_by_product', {
      p_product_id: productId,
      p_user_skus: userSkus || null
    });
    
    if (error) {
      console.error('[getLeadStatsByProduct] Error:', error);
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      return {
        data: {
          total_leads: 0,
          active_leads: 0,
          won_leads: 0,
          lost_leads: 0,
          total_value: 0,
          avg_lead_score: 0
        },
        error: null
      };
    }
    
    return { data: data[0], error: null };
  } catch (err) {
    console.error('[getLeadStatsByProduct] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Asignar secuencia a un lead
 * FASE 1: SUBFASE 1.1 - Asignación de secuencias a leads
 * Esto asigna la secuencia al contacto asociado al lead
 * 
 * @param {string} leadId - ID del lead
 * @param {string} sequenceId - ID de la secuencia a asignar
 * @param {string|null} userId - ID del usuario que hace la asignación
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function assignSequenceToLead(leadId, sequenceId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from(LEADS_TABLE)
      .select('id, contact_id, account_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    if (!lead.contact_id) {
      return { success: false, error: { message: 'Lead sin contacto asociado' } };
    }

    // 2. Verificar que la secuencia existe y pertenece a la misma cuenta
    const { data: sequence, error: seqError } = await supabase
      .from('whatsapp_sequences')
      .select('id, account_id, active, name')
      .eq('id', sequenceId)
      .single();

    if (seqError || !sequence) {
      return { success: false, error: seqError || { message: 'Flujo no encontrado' } };
    }

    if (sequence.account_id !== lead.account_id) {
      return { success: false, error: { message: 'La secuencia no pertenece a la misma cuenta del lead' } };
    }

    if (!sequence.active) {
      return { success: false, error: { message: 'La secuencia no está activa' } };
    }

    // 3. Asignar secuencia al contacto
    const { error: assignError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_id: sequenceId,
        sequence_active: true,
        sequence_position: 0, // Empezar desde el principio
        sequence_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.contact_id);

    if (assignError) {
      console.error('[assignSequenceToLead] Error asignando secuencia:', assignError);
      return { success: false, error: assignError };
    }

    // 4. Registrar actividad en el lead
    await addLeadActivity(leadId, {
      type: 'stage_change',
      content: `Flujo "${sequence.name || 'Sin nombre'}" asignado automáticamente`,
      user_id: userId,
      metadata: { 
        sequence_id: sequenceId, 
        sequence_name: sequence.name,
        action: 'sequence_assigned' 
      }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[assignSequenceToLead] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener información de secuencia de un lead
 * FASE 1: SUBFASE 1.2 - Obtener información de secuencia asignada
 * 
 * @param {string} leadId - ID del lead
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLeadSequence(leadId) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from(LEADS_TABLE)
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { data: null, error: leadError || { message: 'Lead no encontrado' } };
    }

    if (!lead.contact_id) {
      return { data: null, error: { message: 'Lead sin contacto asociado' } };
    }

    // 2. Obtener información del contacto y su secuencia
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select(`
        id,
        sequence_active,
        sequence_id,
        sequence_position,
        sequence_started_at,
        whatsapp_sequences (
          id,
          name,
          active,
          total_messages
        )
      `)
      .eq('id', lead.contact_id)
      .single();

    if (contactError || !contact) {
      return { data: null, error: contactError || { message: 'Contacto no encontrado' } };
    }

    // Si no hay secuencia asignada, retornar null (sin error)
    if (!contact.sequence_active || !contact.sequence_id) {
      return { data: null, error: null };
    }

    // Retornar información completa de la secuencia
    return {
      data: {
        active: contact.sequence_active,
        sequence_id: contact.sequence_id,
        position: contact.sequence_position || 0,
        started_at: contact.sequence_started_at,
        sequence: contact.whatsapp_sequences || null
      },
      error: null
    };
  } catch (err) {
    console.error('[getLeadSequence] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Pausar secuencia de un lead
 * FASE 1: SUBFASE 1.3 - Control de secuencias
 * 
 * @param {string} leadId - ID del lead
 * @param {string|null} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function pauseLeadSequence(leadId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from(LEADS_TABLE)
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // 2. Pausar secuencia en el contacto
    const { error: pauseError } = await supabase
      .from('whatsapp_contacts')
      .update({ 
        sequence_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.contact_id);

    if (pauseError) {
      return { success: false, error: pauseError };
    }

    // 3. Registrar actividad
    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Flujo pausado',
      user_id: userId,
      metadata: { action: 'sequence_paused' }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[pauseLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Retomar secuencia de un lead
 * FASE 1: SUBFASE 1.3 - Control de secuencias
 * 
 * @param {string} leadId - ID del lead
 * @param {string|null} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function resumeLeadSequence(leadId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from(LEADS_TABLE)
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // 2. Verificar que tenga sequence_id
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_id')
      .eq('id', lead.contact_id)
      .single();

    if (contactError || !contact || !contact.sequence_id) {
      return { success: false, error: { message: 'El contacto no tiene secuencia asignada' } };
    }

    // 3. Retomar secuencia
    const { error: resumeError } = await supabase
      .from('whatsapp_contacts')
      .update({ 
        sequence_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.contact_id);

    if (resumeError) {
      return { success: false, error: resumeError };
    }

    // 4. Registrar actividad
    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Flujo retomado',
      user_id: userId,
      metadata: { action: 'sequence_resumed' }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[resumeLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Detener secuencia de un lead
 * FASE 1: SUBFASE 1.3 - Control de secuencias
 * 
 * @param {string} leadId - ID del lead
 * @param {string|null} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function stopLeadSequence(leadId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from(LEADS_TABLE)
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // 2. Obtener sequence_id antes de eliminarlo (para el metadata)
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_id')
      .eq('id', lead.contact_id)
      .single();

    const sequenceId = contact?.sequence_id;

    // 3. Detener y limpiar secuencia
    const { error: stopError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_active: false,
        sequence_id: null,
        sequence_position: 0,
        sequence_started_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.contact_id);

    if (stopError) {
      return { success: false, error: stopError };
    }

    // 4. Registrar actividad
    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Flujo detenido',
      user_id: userId,
      metadata: { action: 'sequence_stopped', sequence_id: sequenceId || null }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[stopLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

