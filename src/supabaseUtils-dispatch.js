/**
 * Utilidades de Despachos para Supabase
 * Funciones específicas para manejo de despachos
 */

import { supabase } from './supabaseClient.js';
import { restoreCityStock } from './supabaseUtils.js';
import { normalizeCity } from './utils/cityUtils';

/**
 * Confirmar despacho
 * Mueve el despacho de pendiente a confirmado, actualiza cityStock y crea registro en historial
 * 
 * @param {object} dispatch - Datos del despacho
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function confirmDispatch(dispatch) {
  try {
    const ciudadNormalizada = normalizeCity(dispatch.ciudad);
    
    // 1. Verificar que el despacho existe y está pendiente
    const { data: existingDispatch, error: fetchError } = await supabase
      .from('dispatches')
      .select('*')
      .eq('id', dispatch.id)
      .eq('status', 'pendiente')
      .maybeSingle();
    
    if (fetchError) {
      throw new Error(`Error al buscar despacho: ${fetchError.message}`);
    }
    
    if (!existingDispatch) {
      throw new Error('Despacho no encontrado o ya confirmado');
    }
    
    // 2. Actualizar cityStock para cada item
    for (const item of (dispatch.items || [])) {
      if (item.sku && item.cantidad > 0) {
        await restoreCityStock(ciudadNormalizada, item.sku, Number(item.cantidad));
      }
    }
    
    // 3. Actualizar despacho a confirmado
    const { error: updateError } = await supabase
      .from('dispatches')
      .update({
        status: 'confirmado',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', dispatch.id);
    
    if (updateError) throw updateError;
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[confirmDispatch] ERROR:', err, { dispatch });
    return { success: false, error: err };
  }
}

/**
 * Crear despacho pendiente
 * 
 * @param {object} dispatchData - Datos del despacho
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createDispatch(dispatchData) {
  try {
    const ciudadNormalizada = normalizeCity(dispatchData.ciudad);
    
    const { data, error } = await supabase
      .from('dispatches')
      .insert({
        fecha: dispatchData.fecha,
        ciudad: ciudadNormalizada,
        items: dispatchData.items || [],
        status: 'pendiente'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (err) {
    console.error('[createDispatch] ERROR:', err, { dispatchData });
    return { data: null, error: err };
  }
}

/**
 * Actualizar despacho
 * 
 * @param {string} id - ID del despacho
 * @param {object} updates - Campos a actualizar
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function updateDispatch(id, updates) {
  try {
    if (updates.ciudad) {
      updates.ciudad = normalizeCity(updates.ciudad);
    }
    
    const { error } = await supabase
      .from('dispatches')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[updateDispatch] ERROR:', err, { id, updates });
    return { success: false, error: err };
  }
}

/**
 * Eliminar despacho
 * 
 * @param {string} id - ID del despacho
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteDispatch(id) {
  try {
    const { error } = await supabase
      .from('dispatches')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteDispatch] ERROR:', err, { id });
    return { success: false, error: err };
  }
}


