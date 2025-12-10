/**
 * Utilidades de Depósitos para Supabase
 * Funciones específicas para manejo de depósitos
 */

import { supabase } from './supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import { normalizeCity } from './utils/cityUtils';

/**
 * Crear depósito desde ventas por cobrar
 * Agrupa ventas por ciudad y fecha, crea depósitos consolidados
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @param {Array} ventaIds - IDs de las ventas a incluir en el depósito
 * @returns {Promise<{success: boolean, depositId: string|null, error: Error|null}>}
 */
export async function createDepositFromSales(ciudad, ventaIds) {
  try {
    const ciudadNormalizada = normalizeCity(ciudad);
    
    // 1. Obtener todas las ventas por sus IDs
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('*')
      .in('id', ventaIds)
      .eq('deleted_from_pending_at', null) // Solo ventas activas
      .eq('estado_pago', 'pendiente');
    
    if (ventasError) throw ventasError;
    if (!ventas || ventas.length === 0) {
      throw new Error('No se encontraron ventas para crear el depósito');
    }
    
    // 2. Calcular monto total
    const montoTotal = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);
    
    // 3. Obtener fecha (usar la más reciente de las ventas o hoy)
    const fecha = ventas[0]?.fecha || new Date().toISOString().split('T')[0];
    
    // 4. Crear depósito consolidado
    const depositId = uuidv4();
    const { data: deposit, error: depositError } = await supabase
      .from('generar_deposito')
      .insert({
        id: depositId,
        ciudad: ciudadNormalizada,
        fecha: fecha,
        monto_total: montoTotal,
        estado: 'pendiente'
      })
      .select()
      .single();
    
    if (depositError) throw depositError;
    
    // 5. Actualizar ventas para asociarlas al depósito
    const { error: updateError } = await supabase
      .from('ventas')
      .update({
        deposit_id: depositId,
        settled_at: new Date().toISOString()
      })
      .in('id', ventaIds);
    
    if (updateError) {
      // Si falla la actualización, eliminar el depósito creado
      await supabase.from('generar_deposito').delete().eq('id', depositId);
      throw updateError;
    }
    
    return { success: true, depositId, error: null };
  } catch (err) {
    console.error('[createDepositFromSales] ERROR:', err, { ciudad, ventaIds });
    return { success: false, depositId: null, error: err };
  }
}

/**
 * Obtener ventas por cobrar de una ciudad
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getSalesPendingPayment(ciudad) {
  try {
    const ciudadVariants = [
      ciudad,
      ciudad?.toUpperCase?.(),
      ciudad?.toLowerCase?.(),
      normalizeCity(ciudad)
    ].filter(Boolean);
    
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .in('ciudad', ciudadVariants)
      .eq('deleted_from_pending_at', null)
      .eq('estado_pago', 'pendiente')
      .in('estado_entrega', ['confirmado', 'entregada', 'cancelado']);
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getSalesPendingPayment] ERROR:', err, { ciudad });
    return { data: [], error: err };
  }
}

/**
 * Obtener venta por ID
 * 
 * @param {string} id - ID de la venta
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getSaleById(id) {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (err) {
    console.error('[getSaleById] ERROR:', err, { id });
    return { data: null, error: err };
  }
}


