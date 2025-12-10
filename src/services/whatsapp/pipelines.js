/**
 * Servicio para gestionar pipelines del CRM
 * FASE 2 - SUBFASE 2.2: Servicio de Pipelines
 * 
 * Proporciona funciones para gestionar pipelines personalizables
 * Compatible con sistema multi-producto
 */

import { supabase } from '../../supabaseClient';

const PIPELINES_TABLE = 'whatsapp_pipelines';

// FASE 2: Constantes para etapa protegida "Leads Entrantes"
export const PROTECTED_STAGE_NAME = 'Leads Entrantes';
export const PROTECTED_STAGE_KEY = 'entrantes'; // Para pipeline_stage en leads

/**
 * Obtener pipeline por producto
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getPipelineByProduct(productId) {
  try {
    // Buscar pipeline por defecto del producto
    const { data, error } = await supabase
      .from(PIPELINES_TABLE)
      .select('*')
      .eq('product_id', productId)
      .eq('is_default', true)
      .maybeSingle();
    
    if (error) {
      console.error('[getPipelineByProduct] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getPipelineByProduct] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener pipeline por ID
 * @param {string} pipelineId - ID del pipeline
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getPipelineById(pipelineId) {
  try {
    const { data, error } = await supabase
      .from(PIPELINES_TABLE)
      .select('*')
      .eq('id', pipelineId)
      .maybeSingle();
    
    if (error) {
      console.error('[getPipelineById] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getPipelineById] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener todas las etapas de un pipeline
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getPipelineStages(productId) {
  try {
    const { data: pipeline, error } = await getPipelineByProduct(productId);
    
    if (error) {
      return { data: null, error };
    }
    
    if (!pipeline || !pipeline.stages) {
      return { data: [], error: null };
    }
    
    // Ordenar etapas por order
    const stages = Array.isArray(pipeline.stages) 
      ? pipeline.stages.sort((a, b) => (a.order || 0) - (b.order || 0))
      : [];
    
    return { data: stages, error: null };
  } catch (err) {
    console.error('[getPipelineStages] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear pipeline personalizado
 * @param {Object} pipelineData - Datos del pipeline
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createPipeline(pipelineData) {
  try {
    const {
      account_id = null,
      product_id,
      name,
      stages,
      is_default = false
    } = pipelineData;
    
    if (!product_id || !name || !stages) {
      return {
        data: null,
        error: { message: 'product_id, name y stages son requeridos' }
      };
    }
    
    // Validar que stages sea un array válido
    if (!Array.isArray(stages) || stages.length === 0) {
      return {
        data: null,
        error: { message: 'stages debe ser un array con al menos una etapa' }
      };
    }
    
    // Validar estructura de cada etapa
    for (const stage of stages) {
      if (!stage.name || stage.order === undefined) {
        return {
          data: null,
          error: { message: 'Cada etapa debe tener name y order' }
        };
      }
    }
    
    // FASE 2: Validar y normalizar "Leads Entrantes"
    const hasProtectedStage = stages.some(stage => 
      stage.name === PROTECTED_STAGE_NAME || stage.name.toLowerCase().includes('entrantes')
    );
    
    // Normalizar nombre de "Leads Entrantes" si existe
    const normalizedStages = stages.map(stage => {
      if (stage.name.toLowerCase().includes('entrantes') && stage.name !== PROTECTED_STAGE_NAME) {
        return {
          ...stage,
          name: PROTECTED_STAGE_NAME
        };
      }
      return stage;
    });
    
    // Si no tiene "Leads Entrantes", agregarlo automáticamente en primera posición
    if (!hasProtectedStage) {
      const minOrder = normalizedStages.length > 0 
        ? Math.min(...normalizedStages.map(s => s.order || 0)) 
        : 0;
      normalizedStages.unshift({
        name: PROTECTED_STAGE_NAME,
        order: minOrder - 1,
        color: '#3b82f6',
        sequence_id: null
      });
    }
    
    // Usar etapas normalizadas
    const finalStages = normalizedStages;
    
    // Si es default, desactivar otros defaults del mismo producto
    if (is_default) {
      await supabase
        .from(PIPELINES_TABLE)
        .update({ is_default: false })
        .eq('product_id', product_id)
        .eq('is_default', true);
    }
    
    // Crear pipeline
    const { data, error } = await supabase
      .from(PIPELINES_TABLE)
      .insert({
        account_id,
        product_id,
        name,
        stages,
        is_default
      })
      .select()
      .single();
    
    if (error) {
      console.error('[createPipeline] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[createPipeline] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar pipeline
 * @param {string} pipelineId - ID del pipeline
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updatePipeline(pipelineId, updates) {
  try {
    // Verificar que el pipeline no sea el default antes de permitir eliminación de etapas
    const { data: currentPipeline } = await getPipelineById(pipelineId);
    
    if (!currentPipeline) {
      return { data: null, error: { message: 'Pipeline no encontrado' } };
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Solo incluir campos que se proporcionaron
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.stages !== undefined) {
      // Validar estructura de etapas
      if (!Array.isArray(updates.stages) || updates.stages.length === 0) {
        return {
          data: null,
          error: { message: 'stages debe ser un array con al menos una etapa' }
        };
      }
      
      // Validar estructura de cada etapa
      for (const stage of updates.stages) {
        if (!stage.name || stage.order === undefined) {
          return {
            data: null,
            error: { message: 'Cada etapa debe tener name y order' }
          };
        }
      }
      
      // FASE 2: Validar que siempre exista "Leads Entrantes"
      const hasProtectedStage = updates.stages.some(stage => 
        stage.name === PROTECTED_STAGE_NAME || stage.name.toLowerCase().includes('entrantes')
      );
      
      if (!hasProtectedStage) {
        return {
          data: null,
          error: { 
            message: `La etapa "${PROTECTED_STAGE_NAME}" es obligatoria y no puede ser eliminada` 
          }
        };
      }
      
      // FASE 2: Normalizar nombre de "Leads Entrantes" si existe
      const normalizedStages = updates.stages.map(stage => {
        if (stage.name.toLowerCase().includes('entrantes') && stage.name !== PROTECTED_STAGE_NAME) {
          return {
            ...stage,
            name: PROTECTED_STAGE_NAME
          };
        }
        return stage;
      });
      
      updateData.stages = normalizedStages;
    }
    if (updates.is_default !== undefined) {
      updateData.is_default = updates.is_default;
      
      // Si se marca como default, desactivar otros defaults del mismo producto
      if (updates.is_default && currentPipeline.product_id) {
        await supabase
          .from(PIPELINES_TABLE)
          .update({ is_default: false })
          .eq('product_id', currentPipeline.product_id)
          .eq('is_default', true)
          .neq('id', pipelineId);
      }
    }
    
    const { data, error } = await supabase
      .from(PIPELINES_TABLE)
      .update(updateData)
      .eq('id', pipelineId)
      .select()
      .single();
    
    if (error) {
      console.error('[updatePipeline] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[updatePipeline] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Eliminar pipeline
 * @param {string} pipelineId - ID del pipeline
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deletePipeline(pipelineId) {
  try {
    // Verificar que no sea el pipeline por defecto
    const { data: pipeline } = await getPipelineById(pipelineId);
    
    if (!pipeline) {
      return { success: false, error: { message: 'Pipeline no encontrado' } };
    }
    
    if (pipeline.is_default) {
      return {
        success: false,
        error: { message: 'No se puede eliminar el pipeline por defecto' }
      };
    }
    
    // Verificar que no haya leads usando este pipeline
    // (Nota: Los leads usan pipeline_stage como texto, no pipeline_id,
    // pero podemos verificar si hay leads con etapas de este pipeline)
    const stages = pipeline.stages || [];
    const stageNames = stages.map(s => s.name);
    
    // Esta verificación es opcional, ya que los leads no tienen FK directa al pipeline
    // Pero podemos verificar si hay leads con estas etapas
    
    const { error } = await supabase
      .from(PIPELINES_TABLE)
      .delete()
      .eq('id', pipelineId);
    
    if (error) {
      console.error('[deletePipeline] Error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[deletePipeline] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Actualizar secuencia asignada a una etapa específica
 * FASE 1: SUBFASE 1.1 - Actualización rápida de flujo por etapa
 * @param {string} productId - ID del producto
 * @param {string} stageName - Nombre de la etapa
 * @param {string|null} sequenceId - ID de la secuencia a asignar (null para quitar)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateStageSequence(productId, stageName, sequenceId) {
  try {
    // Obtener pipeline actual
    const { data: pipeline, error: pipelineError } = await getPipelineByProduct(productId);
    
    if (pipelineError || !pipeline) {
      return {
        data: null,
        error: pipelineError || { message: 'Pipeline no encontrado' }
      };
    }
    
    // Verificar que stages existe y es un array
    if (!Array.isArray(pipeline.stages)) {
      return {
        data: null,
        error: { message: 'Pipeline no tiene etapas válidas' }
      };
    }
    
    // Buscar y actualizar la etapa específica
    const updatedStages = pipeline.stages.map(stage => {
      if (stage.name === stageName) {
        return {
          ...stage,
          sequence_id: sequenceId || null
        };
      }
      return stage;
    });
    
    // Verificar que se encontró la etapa
    const stageExists = updatedStages.some(s => s.name === stageName);
    if (!stageExists) {
      return {
        data: null,
        error: { message: `Etapa "${stageName}" no encontrada` }
      };
    }
    
    // Actualizar pipeline con las etapas modificadas
    return await updatePipeline(pipeline.id, {
      stages: updatedStages
    });
  } catch (err) {
    console.error('[updateStageSequence] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Restaurar pipeline por defecto
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function restoreDefaultPipeline(productId) {
  try {
    const defaultStages = [
      { name: 'Leads Entrantes', order: 1, color: '#3b82f6' },
      { name: 'Seguimiento', order: 2, color: '#f59e0b' },
      { name: 'Venta', order: 3, color: '#10b981' },
      { name: 'Cliente', order: 4, color: '#8b5cf6' }
    ];
    
    // Buscar pipeline por defecto existente
    const { data: existing } = await getPipelineByProduct(productId);
    
    if (existing) {
      // Actualizar pipeline existente
      return updatePipeline(existing.id, {
        name: 'Pipeline por Defecto',
        stages: defaultStages
      });
    } else {
      // Crear nuevo pipeline por defecto
      return createPipeline({
        product_id: productId,
        name: 'Pipeline por Defecto',
        stages: defaultStages,
        is_default: true
      });
    }
  } catch (err) {
    console.error('[restoreDefaultPipeline] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

