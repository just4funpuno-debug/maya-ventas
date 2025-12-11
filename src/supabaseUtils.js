/**
 * Utilidades de Datos para Supabase
 * Fase 7.3: Reemplazo completo de firestoreUtils.js
 * 
 * Funciones para manejo de datos usando Supabase
 */

import { supabase } from './supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import { normalizeCity } from './utils/cityUtils';

// ============================================================================
// FUNCIONES DE STOCK (Paso 1 - Críticas)
// ============================================================================

/**
 * Descuenta cantidad de un SKU en el stock de una ciudad
 * Reemplaza: firestoreUtils.discountCityStock()
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @param {string} sku - SKU del producto
 * @param {number} cantidad - Cantidad a descontar
 */
export async function discountCityStock(ciudad, sku, cantidad) {
  try {
    if (!ciudad || !sku || !cantidad) {
      console.warn('[discountCityStock] Parámetros faltantes:', { ciudad, sku, cantidad });
      return;
    }

    // Usar función SQL atómica para evitar race conditions
    const { data: nuevoStock, error } = await supabase.rpc('descontar_stock_ciudad_atomico', {
      p_ciudad: ciudad,
      p_sku: sku,
      p_cantidad: cantidad
    });

    if (error) {
      console.error('[discountCityStock] Error en función SQL:', error);
      throw error;
    }

    console.log(`[discountCityStock] ${normalizeCity(ciudad)} - ${sku}: descontado ${cantidad}, nuevo stock: ${nuevoStock}`);
    return nuevoStock;
  } catch (err) {
    console.error('[discountCityStock] ERROR:', err, { ciudad, sku, cantidad });
    throw err;
  }
}

/**
 * Suma cantidad de un SKU en el stock de una ciudad
 * Reemplaza: firestoreUtils.restoreCityStock()
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @param {string} sku - SKU del producto
 * @param {number} cantidad - Cantidad a sumar
 */
export async function restoreCityStock(ciudad, sku, cantidad) {
  if (!ciudad || !sku || !cantidad) return;

  try {
    // Usar función SQL atómica para evitar race conditions
    const { data: nuevoStock, error } = await supabase.rpc('restaurar_stock_ciudad_atomico', {
      p_ciudad: ciudad,
      p_sku: sku,
      p_cantidad: cantidad
    });

    if (error) {
      console.error('[restoreCityStock] Error en función SQL:', error);
      throw error;
    }

    console.log(`[restoreCityStock] ${normalizeCity(ciudad)} - ${sku}: restaurado ${cantidad}, nuevo stock: ${nuevoStock}`);
    return nuevoStock;
  } catch (err) {
    console.error('[restoreCityStock] ERROR:', err, { ciudad, sku, cantidad });
    throw err;
  }
}

/**
 * Ajusta el stock de varios SKUs en una ciudad (objeto {sku: cantidad})
 * Si la cantidad es positiva suma, si es negativa descuenta
 * Reemplaza: firestoreUtils.adjustCityStock()
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @param {object} items - Objeto { sku: cantidad, ... }
 */
export async function adjustCityStock(ciudad, items) {
  if (!ciudad || !items || typeof items !== 'object') return;

  try {
    const ciudadNormalizada = normalizeCity(ciudad);

    // Procesar cada SKU
    for (const sku in items) {
      const cantidad = items[sku];
      
      if (cantidad > 0) {
        await restoreCityStock(ciudadNormalizada, sku, cantidad);
      } else if (cantidad < 0) {
        await discountCityStock(ciudadNormalizada, sku, Math.abs(cantidad));
      }
    }
  } catch (err) {
    console.error('[adjustCityStock] ERROR:', err, { ciudad, items });
    throw err;
  }
}

/**
 * Suscribe en tiempo real al stock de una ciudad
 * Reemplaza: firestoreUtils.subscribeCityStock()
 * 
 * @param {string} ciudad - Nombre de la ciudad
 * @param {function} callback - Función que recibe el objeto { sku: cantidad, ... }
 * @returns {function} - Función para desuscribirse
 */
export function subscribeCityStock(ciudad, callback) {
  if (!ciudad || typeof callback !== 'function') return () => {};

  const ciudadNormalizada = normalizeCity(ciudad);

  // Obtener stock inicial
  supabase
    .from('city_stock')
    .select('sku, cantidad')
    .eq('ciudad', ciudadNormalizada)
    .then(({ data, error }) => {
      if (error) {
        console.error('[subscribeCityStock] Error obteniendo stock inicial:', error);
        callback({});
        return;
      }

      // Convertir array a objeto { sku: cantidad }
      const stockObj = {};
      data?.forEach(item => {
        stockObj[item.sku] = item.cantidad || 0;
      });
      callback(stockObj);
    });

  // Suscripción en tiempo real
  const channel = supabase
    .channel(`city_stock_${ciudadNormalizada}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'city_stock',
        filter: `ciudad=eq.${ciudadNormalizada}`
      }, 
      async (payload) => {
        // Obtener stock actualizado después del cambio
        const { data } = await supabase
          .from('city_stock')
          .select('sku, cantidad')
          .eq('ciudad', ciudadNormalizada);

        const stockObj = {};
        data?.forEach(item => {
          stockObj[item.sku] = item.cantidad || 0;
        });
        callback(stockObj);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// ============================================================================
// FUNCIONES DE VENTAS (Paso 2 - Básicas)
// ============================================================================

/**
 * Registrar venta pendiente
 * Reemplaza: firestoreUtils.registrarVentaPendiente()
 * 
 * @param {object} venta - Objeto con datos de la venta
 */
export async function registrarVentaPendiente(venta) {
  try {
    console.log('[registrarVentaPendiente] venta:', venta);

    // Preparar parámetros para la función SQL transaccional
    const params = {
      p_fecha: venta.fecha || new Date().toISOString().split('T')[0],
      p_ciudad: venta.ciudad,
      p_sku: venta.sku || null,
      p_cantidad: parseInt(venta.cantidad || 1, 10),
      p_precio: parseFloat(venta.precio || 0),
      p_sku_extra: venta.skuExtra || null,
      p_cantidad_extra: venta.cantidadExtra ? parseInt(venta.cantidadExtra, 10) : null,
      p_total: venta.total !== undefined ? parseFloat(venta.total) : null,
      p_vendedora: venta.vendedora || null,
      p_vendedora_id: venta.vendedoraId || venta.vendedora_id || null,
      p_celular: venta.celular || null,
      p_metodo: venta.metodo || null,
      p_cliente: venta.cliente || null,
      p_notas: venta.notas || null,
      p_gasto: parseFloat(venta.gasto || 0),
      p_gasto_cancelacion: parseFloat(venta.gastoCancelacion || venta.gasto_cancelacion || 0),
      p_codigo_unico: venta.codigoUnico || venta.codigo_unico || null,
      p_hora_entrega: venta.horaEntrega || venta.hora_entrega || null,
      p_comprobante: venta.comprobante || null,
      p_destino_encomienda: venta.destinoEncomienda || venta.destino_encomienda || null,
      p_motivo: venta.motivo || null
    };

    // Limpiar valores undefined (convertir a null)
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        params[key] = null;
      }
    });

    // Llamar a la función SQL transaccional
    // Esta función garantiza que el stock se descuente y la venta se registre
    // de forma atómica (todo o nada)
    const { data, error } = await supabase.rpc('registrar_venta_pendiente_atomica', params);

    if (error) {
      console.error('[registrarVentaPendiente] Error en función SQL:', error);
      throw error;
    }

    console.log('[registrarVentaPendiente] Venta registrada y stock descontado de forma atómica. ID:', data);
    
    // Retornar objeto con id (la función SQL retorna el UUID directamente)
    return { id: data };
  } catch (err) {
    console.error('[registrarVentaPendiente] ERROR:', err, venta);
    throw err;
  }
}

/**
 * Confirmar entrega de venta
 * Reemplaza: firestoreUtils.confirmarEntregaVenta()
 * 
 * @param {string} id - ID de la venta pendiente
 * @param {object} venta - Datos de la venta
 */
export async function confirmarEntregaVenta(id, venta) {
  try {
    // NOTA: NO se descuenta stock aquí porque el stock ya fue descontado
    // cuando se creó la venta pendiente con registrarVentaPendiente().
    // Esta función solo cambia el estado de la venta de 'pendiente' a 'entregada'.

    const precioNum = Number(venta.precio || 0);
    const gastoNum = Number(venta.gasto || 0);
    const totalBase = precioNum - gastoNum;

    // Determinar estado de entrega
    let estadoEntrega = 'entregada';
    if (Number(venta.gastoCancelacion || 0) > 0) {
      estadoEntrega = 'cancelado';
    }

    // Actualizar venta
    const updates = {
      estado_entrega: estadoEntrega,
      estado_pago: 'pendiente',
      total: totalBase,
      gasto: gastoNum, // Actualizar gasto al confirmar
      confirmado_at: new Date().toISOString(),
      entregada_at: new Date().toISOString(),
      deleted_from_pending_at: null // Activar en lista por cobrar
    };
    
    // Preservar hora_entrega si existe en la venta y no está guardada
    if (venta.horaEntrega || venta.hora_entrega) {
      updates.hora_entrega = venta.horaEntrega || venta.hora_entrega;
    }

    const { error } = await supabase
      .from('ventas')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('[confirmarEntregaVenta] Venta confirmada:', id);
  } catch (err) {
    console.error('[confirmarEntregaVenta] ERROR:', err, { id, venta });
    throw err;
  }
}

/**
 * Editar venta pendiente
 * Reemplaza: firestoreUtils.editarVentaPendiente()
 * 
 * @param {string} id - ID de la venta
 * @param {object} ventaAnterior - Datos anteriores
 * @param {object} ventaNueva - Datos nuevos
 */
export async function editarVentaPendiente(id, ventaAnterior, ventaNueva) {
  try {
    console.log('[editarVentaPendiente] Editando venta:', id, { ventaAnterior, ventaNueva });

    // Preparar parámetros para la función SQL transaccional
    const params = {
      p_venta_id: id,
      // Datos anteriores (requeridos)
      p_ciudad_anterior: ventaAnterior.ciudad,
      p_sku_anterior: ventaAnterior.sku || null,
      p_cantidad_anterior: parseInt(ventaAnterior.cantidad || 0, 10),
      // Datos nuevos (requeridos)
      p_fecha: ventaNueva.fecha || ventaAnterior.fecha || new Date().toISOString().split('T')[0],
      p_ciudad_nueva: ventaNueva.ciudad || ventaAnterior.ciudad,
      p_sku_nueva: ventaNueva.sku || ventaAnterior.sku || null,
      p_cantidad_nueva: parseInt(ventaNueva.cantidad || ventaAnterior.cantidad || 0, 10),
      // Datos anteriores opcionales
      p_sku_extra_anterior: ventaAnterior.skuExtra || ventaAnterior.sku_extra || null,
      p_cantidad_extra_anterior: ventaAnterior.cantidadExtra || ventaAnterior.cantidad_extra ? parseInt(ventaAnterior.cantidadExtra || ventaAnterior.cantidad_extra || 0, 10) : null,
      // Datos nuevos opcionales
      p_precio: ventaNueva.precio !== undefined ? parseFloat(ventaNueva.precio || 0) : (ventaAnterior.precio !== undefined ? parseFloat(ventaAnterior.precio || 0) : null),
      p_sku_extra_nueva: ventaNueva.skuExtra || ventaNueva.sku_extra || ventaAnterior.skuExtra || ventaAnterior.sku_extra || null,
      p_cantidad_extra_nueva: (ventaNueva.cantidadExtra || ventaNueva.cantidad_extra) ? parseInt(ventaNueva.cantidadExtra || ventaNueva.cantidad_extra || 0, 10) : ((ventaAnterior.cantidadExtra || ventaAnterior.cantidad_extra) ? parseInt(ventaAnterior.cantidadExtra || ventaAnterior.cantidad_extra || 0, 10) : null),
      p_total: ventaNueva.total !== undefined ? parseFloat(ventaNueva.total) : (ventaAnterior.total !== undefined ? parseFloat(ventaAnterior.total) : null),
      p_vendedora: ventaNueva.vendedora || ventaAnterior.vendedora || null,
      p_vendedora_id: ventaNueva.vendedoraId || ventaNueva.vendedora_id || ventaAnterior.vendedoraId || ventaAnterior.vendedora_id || null,
      p_celular: ventaNueva.celular || ventaAnterior.celular || null,
      p_metodo: ventaNueva.metodo || ventaAnterior.metodo || null,
      p_cliente: ventaNueva.cliente || ventaAnterior.cliente || null,
      p_notas: ventaNueva.notas || ventaAnterior.notas || null,
      p_gasto: parseFloat(ventaNueva.gasto || ventaAnterior.gasto || 0),
      p_gasto_cancelacion: parseFloat(ventaNueva.gastoCancelacion || ventaNueva.gasto_cancelacion || ventaAnterior.gastoCancelacion || ventaAnterior.gasto_cancelacion || 0),
      p_hora_entrega: ventaNueva.horaEntrega || ventaNueva.hora_entrega || ventaAnterior.horaEntrega || ventaAnterior.hora_entrega || null,
      p_comprobante: ventaNueva.comprobante || ventaAnterior.comprobante || null,
      p_destino_encomienda: ventaNueva.destinoEncomienda || ventaNueva.destino_encomienda || ventaAnterior.destinoEncomienda || ventaAnterior.destino_encomienda || null,
      p_motivo: ventaNueva.motivo || ventaAnterior.motivo || null
    };

    // Limpiar valores undefined (convertir a null)
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        params[key] = null;
      }
    });

    // Llamar a la función SQL transaccional
    // Esta función garantiza que el stock se ajuste y la venta se actualice
    // de forma atómica (todo o nada)
    const { data, error } = await supabase.rpc('editar_venta_pendiente_atomica', params);

    if (error) {
      console.error('[editarVentaPendiente] Error en función SQL:', error);
      throw error;
    }

    console.log('[editarVentaPendiente] Venta editada y stock ajustado de forma atómica. ID:', data);
    
    // Retornar objeto con id (la función SQL retorna el UUID directamente)
    return { id: data };
  } catch (err) {
    console.error('[editarVentaPendiente] ERROR:', err, { id, ventaAnterior, ventaNueva });
    throw err;
  }
}

/**
 * Eliminar venta pendiente
 * Reemplaza: firestoreUtils.eliminarVentaPendiente()
 * 
 * @param {string} id - ID de la venta
 * @param {object} venta - Datos de la venta (para restaurar stock)
 */
export async function eliminarVentaPendiente(id, venta) {
  try {
    // Restaurar stock
    await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
    if (venta.skuExtra && venta.cantidadExtra) {
      await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    }

    // Eliminar venta (solo si es pendiente)
    const { error } = await supabase
      .from('ventas')
      .delete()
      .eq('id', id)
      .eq('estado_entrega', 'pendiente');

    if (error) {
      throw error;
    }

    console.log('[eliminarVentaPendiente] Venta eliminada:', id);
  } catch (err) {
    console.error('[eliminarVentaPendiente] ERROR:', err, { id, venta });
    throw err;
  }
}

// ============================================================================
// FUNCIONES DE VENTAS AVANZADAS (Paso 3)
// ============================================================================

// Guard simple para evitar ediciones duplicadas concurrentes
const _editInFlight = new Set();

/**
 * Editar venta confirmada
 * Reemplaza: firestoreUtils.editarVentaConfirmada()
 * 
 * @param {string} idPorCobrar - ID en ventasporcobrar (opcional, se busca por codigo_unico)
 * @param {string} idHistorico - ID en ventashistorico (opcional, se busca por codigo_unico)
 * @param {object} ventaAnterior - Datos anteriores
 * @param {object} ventaNueva - Datos nuevos
 */
export async function editarVentaConfirmada(idPorCobrar, idHistorico, ventaAnterior, ventaNueva) {
  try {
    const codigoUnico = ventaAnterior?.codigoUnico || ventaNueva?.codigoUnico || ventaAnterior?.codigo_unico || ventaNueva?.codigo_unico;
    const lockKey = codigoUnico || idHistorico || idPorCobrar;
    
    if (lockKey) {
      if (_editInFlight.has(lockKey)) {
        console.warn('[editarVentaConfirmada] edición ignorada: operación ya en curso para', lockKey);
        return;
      }
      _editInFlight.add(lockKey);
    }

    // Resolver IDs por codigo_unico si faltan
    if (codigoUnico && (!idPorCobrar || !idHistorico)) {
      try {
        if (!idPorCobrar) {
          const { data, error: errorPorCobrar } = await supabase
            .from('ventas')
            .select('id')
            .eq('codigo_unico', codigoUnico)
            .is('deleted_from_pending_at', null)
            .eq('estado_pago', 'pendiente')
            .limit(1)
            .maybeSingle();
          if (errorPorCobrar) {
            console.warn('[editarVentaConfirmada] Error buscando venta por cobrar:', errorPorCobrar);
          } else if (data) {
            idPorCobrar = data.id;
          }
        }
        if (!idHistorico) {
          const { data, error: errorHistorico } = await supabase
            .from('ventas')
            .select('id')
            .eq('codigo_unico', codigoUnico)
            .in('estado_entrega', ['confirmado', 'entregada', 'cancelado'])
            .limit(1)
            .maybeSingle();
          if (errorHistorico) {
            console.warn('[editarVentaConfirmada] Error buscando venta histórico:', errorHistorico);
          } else if (data) {
            idHistorico = data.id;
          }
        }
      } catch (resErr) {
        console.warn('[editarVentaConfirmada] Fallback codigo_unico error', resErr);
      }
    }

    // Restaurar stock anterior
    await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
    if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
      await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
    }

    // Descontar stock nuevo
    await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
    if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
      await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
    }

    // Calcular total actualizado
    const total = (Number(ventaNueva.precio) || 0) - (Number(ventaNueva.gasto) || 0);

    // Preparar actualización
    const updates = {
      fecha: ventaNueva.fecha || ventaAnterior.fecha,
      ciudad: normalizeCity(ventaNueva.ciudad || ventaAnterior.ciudad),
      sku: ventaNueva.sku || ventaAnterior.sku,
      cantidad: parseInt(ventaNueva.cantidad || ventaAnterior.cantidad, 10),
      precio: parseFloat(ventaNueva.precio || ventaAnterior.precio || 0),
      sku_extra: ventaNueva.skuExtra || ventaAnterior.skuExtra || null,
      cantidad_extra: parseInt(ventaNueva.cantidadExtra || ventaAnterior.cantidadExtra || 0, 10),
      total,
      vendedora: ventaNueva.vendedora || ventaAnterior.vendedora || null,
      metodo: ventaNueva.metodo || ventaAnterior.metodo || null,
      cliente: ventaNueva.cliente || ventaAnterior.cliente || null,
      notas: ventaNueva.notas || ventaAnterior.notas || null,
      gasto: parseFloat(ventaNueva.gasto || ventaAnterior.gasto || 0),
      gasto_cancelacion: parseFloat(ventaNueva.gastoCancelacion || ventaAnterior.gastoCancelacion || 0)
    };

    if (codigoUnico) {
      updates.codigo_unico = codigoUnico;
    }

    // Actualizar venta (usar idHistorico si existe, sino idPorCobrar)
    const saleId = idHistorico || idPorCobrar;
    if (saleId) {
      const { error } = await supabase
        .from('ventas')
        .update(updates)
        .eq('id', saleId);

      if (error) throw error;
    } else {
      console.warn('[editarVentaConfirmada] No se encontró ID para actualizar');
    }

    if (lockKey) _editInFlight.delete(lockKey);
  } catch (err) {
    console.error('[editarVentaConfirmada] ERROR', err, { idPorCobrar, idHistorico, ventaAnterior, ventaNueva });
    if (ventaAnterior?.codigoUnico) {
      _editInFlight.delete(ventaAnterior.codigoUnico);
    }
    throw err;
  }
}

/**
 * Cancelar venta confirmada
 * Reemplaza: firestoreUtils.cancelarVentaConfirmada()
 * 
 * @param {string} idPorCobrar - ID en ventasporcobrar
 * @param {string} idHistorico - ID en ventashistorico
 * @param {object} venta - Datos de la venta
 */
export async function cancelarVentaConfirmada(idPorCobrar, idHistorico, venta) {
  try {
    // Restaurar stock
    await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
    if (venta.skuExtra && venta.cantidadExtra) {
      await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    }

    // Eliminar venta (usar idHistorico si existe, sino idPorCobrar)
    const saleId = idHistorico || idPorCobrar;
    if (saleId) {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
    }
  } catch (err) {
    console.error('[cancelarVentaConfirmada] ERROR', err, { idPorCobrar, idHistorico, venta });
    throw err;
  }
}

/**
 * Cancelar entrega confirmada con costo
 * Reemplaza: firestoreUtils.cancelarEntregaConfirmadaConCosto()
 * 
 * @param {string} idHistorico - ID en ventashistorico
 * @param {object} venta - Datos de la venta
 * @param {number} costoDelivery - Costo de delivery
 */
export async function cancelarEntregaConfirmadaConCosto(idHistorico, venta, costoDelivery) {
  try {
    const costo = Number(costoDelivery) || 0;
    
    // Restaurar stock
    await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
    if (venta.skuExtra && venta.cantidadExtra) {
      await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    }

    // Obtener datos actuales de la venta
    const { data: saleData, error: saleDataError } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', idHistorico)
      .maybeSingle();

    if (saleDataError) {
      console.error('[cancelarVentaConfirmada] Error obteniendo datos de venta:', saleDataError);
      throw new Error('No se pudo obtener los datos de la venta para cancelar');
    }

    if (!saleData) {
      console.warn('[cancelarVentaConfirmada] Venta no encontrada:', idHistorico);
      throw new Error('Venta no encontrada');
    }

    const precioNum = Number(saleData?.precio ?? venta.precio) || 0;
    const total = precioNum - costo;

    // Actualizar venta
    const updates = {
      estado_entrega: 'cancelado',
      cancelado_at: new Date().toISOString(),
      gasto_cancelacion: costo,
      total,
      sintetica_cancelada: true
    };

    const { error } = await supabase
      .from('ventas')
      .update(updates)
      .eq('id', idHistorico);

    if (error) throw error;
  } catch (err) {
    console.error('[cancelarEntregaConfirmadaConCosto] ERROR', err, { idHistorico, venta, costoDelivery });
    throw err;
  }
}

/**
 * Registrar cancelación pendiente con costo
 * Reemplaza: firestoreUtils.registrarCancelacionPendienteConCosto()
 * 
 * @param {object} venta - Datos de la venta
 * @param {number} costo - Costo de cancelación
 */
export async function registrarCancelacionPendienteConCosto(venta, costo) {
  try {
    console.log('[registrarCancelacionPendienteConCosto] inicio', { venta, costo });
    
    const costoNum = Number(costo) || 0;
    if (!costoNum) {
      console.warn('[registrarCancelacionPendienteConCosto] costo = 0: se omite inserción');
      return;
    }

    const nowFecha = new Date();
    const fechaISO = venta.fecha || nowFecha.toISOString().split('T')[0];
    const codigoUnico = uuidv4();

    // Preparar datos de la venta
    const ventaData = {
      fecha: fechaISO,
      ciudad: normalizeCity(venta.ciudad),
      sku: venta.sku || null,
      cantidad: parseInt(venta.cantidad || 0, 10),
      sku_extra: venta.skuExtra || null,
      cantidad_extra: parseInt(venta.cantidadExtra || 0, 10),
      precio: 0, // no hubo ingreso
      gasto_cancelacion: costoNum,
      gasto: 0,
      total: -costoNum, // negativo porque es costo
      estado_entrega: 'cancelado',
      estado_pago: 'pendiente',
      cancelado_at: new Date().toISOString(),
      vendedora: venta.vendedora || null,
      vendedora_id: venta.vendedoraId || venta.vendedora_id || null,
      metodo: venta.metodo || 'Delivery',
      sintetica_cancelada: true,
      codigo_unico: codigoUnico,
      motivo: 'cancelado',
      deleted_from_pending_at: null // Activar en lista por cobrar
    };

    // Insertar venta
    const { data, error } = await supabase
      .from('ventas')
      .insert(ventaData)
      .select('id')
      .single();

    if (error) throw error;

    console.log('[registrarCancelacionPendienteConCosto] venta creada', data.id);
    return data;
  } catch (err) {
    console.error('[registrarCancelacionPendienteConCosto] ERROR', err, { venta, costo });
    throw err;
  }
}

// ============================================================================
// FUNCIONES DE DEPÓSITOS (Paso 4)
// ============================================================================

/**
 * Crear snapshot de depósito
 * Reemplaza: firestoreUtils.crearSnapshotDeposito()
 * 
 * @param {string} ciudad - Ciudad del depósito
 * @param {Array<object>} ventas - Ventas seleccionadas
 * @param {object} resumen - Resumen del depósito
 * @returns {Promise<string>} - ID del depósito creado
 */
export async function crearSnapshotDeposito(ciudad, ventas, resumen) {
  if (!ciudad) throw new Error('ciudad requerida');

  try {
    // Construir payload de ventas
    const ventasPayload = [];
    for (const v of ventas) {
      const codigoUnico = v.codigoUnico || v.codigo_unico;
      
      // Resolver ID por codigo_unico si no existe
      let saleId = v.idPorCobrar || v.id;
      if (codigoUnico && !saleId) {
        const { data, error: errorBuscar } = await supabase
          .from('ventas')
          .select('id')
          .eq('codigo_unico', codigoUnico)
          .is('deleted_from_pending_at', null)
          .eq('estado_pago', 'pendiente')
          .limit(1)
          .maybeSingle();
        if (errorBuscar) {
          console.warn('[crearSnapshotDeposito] Error buscando venta por codigo_unico:', errorBuscar);
        } else if (data) {
          saleId = data.id;
        }
      }

      // Asegurar que saleId es un UUID válido o null
      if (saleId && typeof saleId !== 'string') {
        console.warn('[crearSnapshotDeposito] saleId inválido:', saleId, 'para venta:', v);
        continue;
      }

      // Determinar si es cancelada con costo
      // Una venta es cancelada con costo si:
      // 1. estado_entrega === 'cancelado' Y gasto_cancelacion > 0
      // 2. O si ya está marcada como sintetica_cancelada
      const estadoEntrega = v.estado_entrega || v.estadoEntrega || '';
      const gastoCancelacion = Number(v.gasto_cancelacion || v.gastoCancelacion || 0);
      const esCanceladaConCosto = (estadoEntrega === 'cancelado' && gastoCancelacion > 0) || 
                                   !!v.sintetica_cancelada || 
                                   !!v.sinteticaCancelada;
      
      // Calcular total: si es cancelada con costo, total = -gastoCancelacion
      // Si no, usar total explícito o calcular precio - gasto
      let totalCalculado;
      if (esCanceladaConCosto && gastoCancelacion > 0) {
        totalCalculado = -gastoCancelacion;
      } else if (v.total != null) {
        totalCalculado = Number(v.total);
      } else {
        totalCalculado = (Number(v.precio) || 0) - (Number(v.gasto) || 0);
      }

      const baseVenta = {
        id: saleId || null,
        codigo_unico: codigoUnico || null,
        total: totalCalculado,
        gasto: Number(v.gasto || 0),
        precio: Number(v.precio || 0),
        fecha: v.fecha || null,
        sku: v.sku || null,
        cantidad: v.cantidad != null ? Number(v.cantidad) : null,
        sku_extra: v.sku_extra || v.skuExtra || null,
        cantidad_extra: v.cantidad_extra != null ? Number(v.cantidad_extra) : (v.cantidadExtra != null ? Number(v.cantidadExtra) : null),
        estado_entrega: v.estado_entrega || v.estadoEntrega || null,
        sintetica_cancelada: esCanceladaConCosto,
        gasto_cancelacion: gastoCancelacion > 0 ? gastoCancelacion : null
      };

      // Limpiar undefined y convertir strings "null" a null real
      const limpia = Object.fromEntries(
        Object.entries(baseVenta)
          .filter(([_, val]) => val !== undefined)
          .map(([key, val]) => {
            // Convertir strings "null" o "undefined" a null real
            if (val === 'null' || val === 'undefined' || val === '') {
              return [key, null];
            }
            return [key, val];
          })
      );
      ventasPayload.push(limpia);
    }

    // Limpiar resumen
    const resumenLimpio = resumen ? JSON.parse(JSON.stringify(resumen, (_k, value) => value === undefined ? null : value)) : {};

    // Crear depósito (generar UUID explícitamente si la tabla no tiene DEFAULT)
    const depositId = uuidv4();
    
    const { data: depositData, error: depositError } = await supabase
      .from('generar_deposito')
      .insert({
        id: depositId,
        ciudad: normalizeCity(ciudad),
        fecha: new Date().toISOString().split('T')[0],
        monto_total: resumenLimpio.totalNeto || resumenLimpio.totalMonto || 0,
        nota: JSON.stringify({ resumen: resumenLimpio, ventas: ventasPayload }),
        estado: 'pendiente'
      })
      .select('id')
      .single();

    if (depositError) throw depositError;

    // Usar el ID del insert o el generado
    const finalDepositId = depositData?.id || depositId;

    // Marcar ventas con deposit_id y settled_at
    const nowISO = new Date().toISOString();
    for (const v of ventasPayload) {
      if (!v.id) {
        console.warn('[crearSnapshotDeposito] Venta sin ID, saltando:', v);
        continue;
      }
      try {
        const updateData = {
          deposit_id: finalDepositId,
          settled_at: nowISO,
          fecha_cobro: nowISO,
          estado_pago: 'cobrado'
        };
        
        // Asegurar que no hay strings "null"
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === 'null' || updateData[key] === 'undefined') {
            updateData[key] = null;
          }
        });
        
        const { error: updateError } = await supabase
          .from('ventas')
          .update(updateData)
          .eq('id', v.id);
          
        if (updateError) {
          console.error('[crearSnapshotDeposito] Error actualizando venta', v.id, updateError);
          throw updateError;
        }
      } catch (err) {
        console.error('[crearSnapshotDeposito] Error marcando venta', v.id, err);
        throw err; // Re-lanzar para que se maneje arriba
      }
    }

    return finalDepositId;
  } catch (err) {
    console.error('[crearSnapshotDeposito] ERROR', err, { ciudad, ventas, resumen });
    throw err;
  }
}

/**
 * Confirmar depósito de venta
 * Reemplaza: firestoreUtils.confirmarDepositoVenta()
 * 
 * @param {string} idPorCobrar - ID en ventasporcobrar
 * @param {string} idHistorico - ID en ventashistorico
 */
export async function confirmarDepositoVenta(idPorCobrar, idHistorico) {
  try {
    const saleId = idHistorico || idPorCobrar;
    
    // Obtener datos actuales
    const { data: saleData, error: saleDataError } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', saleId)
      .maybeSingle();

    if (saleDataError) {
      throw new Error(`Error al obtener datos de la venta: ${saleDataError.message}`);
    }

    if (!saleData) {
      throw new Error('Venta no encontrada');
    }

    const precioNum = Number(saleData.precio || 0);
    const gastoNum = Number(saleData.gasto || 0);
    const total = precioNum - gastoNum;

    // Actualizar estado de pago
    const { error } = await supabase
      .from('ventas')
      .update({
        estado_pago: 'cobrado',
        fecha_cobro: new Date().toISOString(),
        total
      })
      .eq('id', saleId);

    if (error) throw error;
  } catch (err) {
    console.error('[confirmarDepositoVenta] ERROR', err, { idPorCobrar, idHistorico });
    throw err;
  }
}

/**
 * Eliminar venta de depósito (robusto)
 * Reemplaza: firestoreUtils.eliminarVentaDepositoRobusto()
 * 
 * @param {object} row - Fila del depósito
 * @returns {Promise<object>} - Resultado de la operación
 */
export async function eliminarVentaDepositoRobusto(row) {
  if (!row || !row.id) {
    console.warn('[eliminarDeposito] row inválida', row);
    return { ok: false, error: 'row invalida' };
  }

  const result = { ok: false, restored: false, deletedDeposit: false, deletedSale: false, saleId: null };

  try {
    const depositId = row.id;

    // 1. Restaurar stock si no es sintética cancelada
    if (!row.sinteticaCancelada) {
      try {
        if (row.sku && row.cantidad) {
          await restoreCityStock(row.ciudad, row.sku, Number(row.cantidad));
        }
        if (row.skuExtra && row.cantidadExtra) {
          await restoreCityStock(row.ciudad, row.skuExtra, Number(row.cantidadExtra));
        }
        result.restored = true;
      } catch (errStock) {
        console.warn('[eliminarDeposito] fallo restore stock (continuando)', errStock);
      }
    }

    // 2. Buscar venta asociada
    let saleId = row.idHistorico || row.idPorCobrar || null;
    if (!saleId && row.codigoUnico) {
      const { data, error: errorBuscar } = await supabase
        .from('ventas')
        .select('id')
        .eq('codigo_unico', row.codigoUnico)
        .limit(1)
        .maybeSingle();
      if (errorBuscar) {
        console.warn('[eliminarDeposito] Error buscando venta por codigo_unico:', errorBuscar);
      } else if (data) {
        saleId = data.id;
      }
    }

    // 3. Eliminar depósito
    try {
      const { error } = await supabase
        .from('generar_deposito')
        .delete()
        .eq('id', depositId);

      if (error) throw error;
      result.deletedDeposit = true;
    } catch (errDel) {
      console.error('[eliminarDeposito] Error eliminando depósito', errDel);
      // Revertir stock si lo restauramos
      if (result.restored && !row.sinteticaCancelada) {
        try {
          if (row.sku && row.cantidad) {
            await discountCityStock(row.ciudad, row.sku, Number(row.cantidad));
          }
          if (row.skuExtra && row.cantidadExtra) {
            await discountCityStock(row.ciudad, row.skuExtra, Number(row.cantidadExtra));
          }
          result.restored = false;
        } catch {/* ignore */}
      }
      return result;
    }

    // 4. Actualizar venta (remover deposit_id y settled_at)
    if (saleId) {
      try {
        await supabase
          .from('ventas')
          .update({
            deposit_id: null,
            settled_at: null,
            fecha_cobro: null,
            estado_pago: 'pendiente'
          })
          .eq('id', saleId);
        result.deletedSale = true;
        result.saleId = saleId;
      } catch (errSale) {
        console.warn('[eliminarDeposito] fallo actualizar venta', errSale);
      }
    }

    result.ok = true;
    return result;
  } catch (err) {
    console.error('[eliminarDeposito] ERROR general', err, row);
    return result;
  }
}

// ============================================================================
// FUNCIONES DE SINCRONIZACIÓN (Paso 5)
// ============================================================================

/**
 * Sincronizar edición de depósito histórico
 * Reemplaza: firestoreUtils.sincronizarEdicionDepositoHistorico()
 * 
 * @param {string} id - ID del documento
 * @param {object} ventaAnterior - Datos anteriores
 * @param {object} ventaNueva - Datos nuevos
 */
export async function sincronizarEdicionDepositoHistorico(id, ventaAnterior, ventaNueva) {
  try {
    // Buscar venta por ID o codigo_unico
    let saleId = id;
    if (!saleId && ventaNueva.codigoUnico) {
      const { data, error: errorBuscar } = await supabase
        .from('ventas')
        .select('id')
        .eq('codigo_unico', ventaNueva.codigoUnico)
        .limit(1)
        .maybeSingle();
      if (errorBuscar) {
        console.warn('[sincronizarEdicionDepositoHistorico] Error buscando venta por codigo_unico:', errorBuscar);
      } else if (data) {
        saleId = data.id;
      }
    }

    if (!saleId) {
      console.warn('[sincronizarEdicionDepositoHistorico] No se encontró venta', { id, ventaNueva });
      return;
    }

    // Preparar actualización
    const updates = {
      fecha: ventaNueva.fecha || ventaAnterior.fecha,
      ciudad: normalizeCity(ventaNueva.ciudad || ventaAnterior.ciudad),
      sku: ventaNueva.sku || ventaAnterior.sku,
      cantidad: parseInt(ventaNueva.cantidad || ventaAnterior.cantidad, 10),
      precio: parseFloat(ventaNueva.precio || ventaAnterior.precio || 0),
      sku_extra: ventaNueva.skuExtra || ventaAnterior.skuExtra || null,
      cantidad_extra: parseInt(ventaNueva.cantidadExtra || ventaAnterior.cantidadExtra || 0, 10),
      gasto: parseFloat(ventaNueva.gasto || ventaAnterior.gasto || 0),
      gasto_cancelacion: parseFloat(ventaNueva.gastoCancelacion || ventaAnterior.gastoCancelacion || 0),
      total: ventaNueva.total !== undefined ? parseFloat(ventaNueva.total) : null,
      vendedora: ventaNueva.vendedora || ventaAnterior.vendedora || null,
      metodo: ventaNueva.metodo || ventaAnterior.metodo || null,
      cliente: ventaNueva.cliente || ventaAnterior.cliente || null,
      notas: ventaNueva.notas || ventaAnterior.notas || null,
      hora_entrega: ventaNueva.horaEntrega || ventaNueva.hora || ventaAnterior.horaEntrega || null,
      destino_encomienda: ventaNueva.destinoEncomienda || ventaAnterior.destinoEncomienda || null,
      motivo: ventaNueva.motivo || ventaAnterior.motivo || null
    };

    // Si cambian cantidades/productos, ajustar stock
    if (ventaAnterior.sku !== ventaNueva.sku || Number(ventaAnterior.cantidad) !== Number(ventaNueva.cantidad)) {
      await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
      await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
    }

    if ((ventaAnterior.skuExtra !== ventaNueva.skuExtra) || Number(ventaAnterior.cantidadExtra) !== Number(ventaNueva.cantidadExtra)) {
      if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
        await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
      }
      if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
        await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
      }
    }

    // Actualizar venta
    const { error } = await supabase
      .from('ventas')
      .update(updates)
      .eq('id', saleId);

    if (error) throw error;

    console.log('[sincronizarEdicionDepositoHistorico] Stock ajustado y venta actualizada para', saleId);
  } catch (err) {
    console.error('[sincronizarEdicionDepositoHistorico] ERROR', err, { id, ventaAnterior, ventaNueva });
    throw err;
  }
}

/**
 * Sincronizar edición de depósito histórico V2 (robusto)
 * Reemplaza: firestoreUtils.sincronizarEdicionDepositoHistoricoV2()
 * 
 * @param {object} referencias - Objeto con referencias
 * @param {object} ventaAnterior - Datos anteriores
 * @param {object} ventaNueva - Datos nuevos
 * @returns {Promise<boolean>} - Éxito de la operación
 */
export async function sincronizarEdicionDepositoHistoricoV2(referencias, ventaAnterior, ventaNueva) {
  const { idGenerarDeposito, idHistorico, idPorCobrar, codigoUnico, skipStockAdjustment } = referencias || {};

  try {
    let saleId = idHistorico || idPorCobrar || null;

    // 1. Buscar por codigo_unico si no tenemos ID
    if (!saleId && codigoUnico) {
      const { data, error: errorBuscar } = await supabase
        .from('ventas')
        .select('id')
        .eq('codigo_unico', codigoUnico)
        .limit(1)
        .maybeSingle();
      if (errorBuscar) {
        console.warn('[sincronizarEdicionDepositoHistoricoV2] Error buscando venta por codigo_unico:', errorBuscar);
      } else if (data) {
        saleId = data.id;
      }
    }

    // 2. Heurística reforzada si aún no encontrado
    if (!saleId && ventaNueva.ciudad && ventaNueva.fecha) {
      const { data: candidates } = await supabase
        .from('ventas')
        .select('*')
        .eq('ciudad', normalizeCity(ventaNueva.ciudad))
        .eq('fecha', ventaNueva.fecha);

      if (candidates && candidates.length > 0) {
        // Calcular score para cada candidato
        let best = null;
        let bestScore = -1;
        const target = ventaNueva;

        candidates.forEach(candidate => {
          let score = 0;
          const eq = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();

          if (eq(candidate.sku, target.sku)) score += 8;
          if (Number(candidate.cantidad) == Number(target.cantidad)) score += 6;
          if (eq(candidate.sku_extra, target.skuExtra) && target.skuExtra) score += 3;
          if (Number(candidate.cantidad_extra) == Number(target.cantidadExtra) && target.cantidadExtra) score += 2;
          if (Number(candidate.precio) == Number(target.precio)) score += 4;
          if (Number(candidate.total) == Number(target.total)) score += 5;
          if (Number(candidate.gasto) == Number(target.gasto)) score += 3;

          if (score > bestScore) {
            bestScore = score;
            best = candidate;
          }
        });

        if (best && bestScore >= 10) {
          saleId = best.id;
          console.log('[syncDepoV2] heurística reforzada seleccionó', saleId, 'score=', bestScore);
        }
      }
    }

    if (!saleId) {
      console.warn('[syncDepoV2] No se pudo resolver venta', { idGenerarDeposito, idHistorico, idPorCobrar, codigoUnico, ventaNueva });
      return false;
    }

    // Preparar actualización
    const updates = {
      fecha: ventaNueva.fecha || ventaAnterior.fecha,
      ciudad: normalizeCity(ventaNueva.ciudad || ventaAnterior.ciudad),
      sku: ventaNueva.sku || ventaAnterior.sku,
      cantidad: parseInt(ventaNueva.cantidad || ventaAnterior.cantidad, 10),
      precio: parseFloat(ventaNueva.precio || ventaAnterior.precio || 0),
      sku_extra: ventaNueva.skuExtra || ventaAnterior.skuExtra || null,
      cantidad_extra: parseInt(ventaNueva.cantidadExtra || ventaAnterior.cantidadExtra || 0, 10),
      gasto: parseFloat(ventaNueva.gasto || ventaAnterior.gasto || 0),
      gasto_cancelacion: parseFloat(ventaNueva.gastoCancelacion || ventaAnterior.gastoCancelacion || 0),
      total: ventaNueva.total !== undefined ? parseFloat(ventaNueva.total) : null,
      vendedora: ventaNueva.vendedora || ventaAnterior.vendedora || null,
      metodo: ventaNueva.metodo || ventaAnterior.metodo || null
    };

    // Actualizar venta
    const { error } = await supabase
      .from('ventas')
      .update(updates)
      .eq('id', saleId);

    if (error) {
      console.error('[syncDepoV2] fallo update', error);
      return false;
    }

    // Ajustar stock si no se omite
    if (!skipStockAdjustment) {
      const cambioPrincipal = (ventaAnterior.sku !== ventaNueva.sku) || (Number(ventaAnterior.cantidad) != Number(ventaNueva.cantidad));
      const cambioExtra = (ventaAnterior.skuExtra !== ventaNueva.skuExtra) || (Number(ventaAnterior.cantidadExtra) != Number(ventaNueva.cantidadExtra));

      try {
        if (cambioPrincipal) {
          await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
          await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
        }
        if (cambioExtra) {
          if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
            await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
          }
          if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
            await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
          }
        }
        if (cambioPrincipal || cambioExtra) {
          console.log('[syncDepoV2] stock ajustado');
        }
      } catch (errStock) {
        console.warn('[syncDepoV2] fallo ajuste stock', errStock);
      }
    }

    return true;
  } catch (err) {
    console.error('[syncDepoV2] ERROR general', err, { referencias, ventaAnterior, ventaNueva });
    return false;
  }
}

/**
 * Asegurar que todas las ventas canceladas con costo tengan registro en ventas por cobrar
 * Reemplaza: firestoreUtils.ensureCanceladasConCostoEnVentasPorCobrar()
 * 
 * @param {string} ciudad - Ciudad a verificar
 * @returns {Promise<Array<string>>} - IDs de ventas creadas
 */
export async function ensureCanceladasConCostoEnVentasPorCobrar(ciudad) {
  try {
    if (!ciudad) return [];

    const creadas = [];

    // Traer canceladas de esa ciudad con gasto_cancelacion > 0
    const { data: canceladas } = await supabase
      .from('ventas')
      .select('*')
      .eq('ciudad', normalizeCity(ciudad))
      .eq('estado_entrega', 'cancelado')
      .gt('gasto_cancelacion', 0);

    if (!canceladas) return [];

    for (const venta of canceladas) {
      // Verificar si ya está en lista por cobrar (deleted_from_pending_at es null)
      if (venta.deleted_from_pending_at === null && venta.estado_pago === 'pendiente') {
        continue; // Ya está en lista por cobrar
      }

      // Activar en lista por cobrar
      const { error } = await supabase
        .from('ventas')
        .update({
          deleted_from_pending_at: null,
          estado_pago: 'pendiente'
        })
        .eq('id', venta.id);

      if (!error) {
        creadas.push(venta.id);
        console.warn('[ensureCanceladasConCostoEnVentasPorCobrar] Activada venta en lista por cobrar', venta.id);
      }
    }

    return creadas;
  } catch (err) {
    console.warn('[ensureCanceladasConCostoEnVentasPorCobrar] Error', err, { ciudad });
    return [];
  }
}

