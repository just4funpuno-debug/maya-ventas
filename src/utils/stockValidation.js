/**
 * Utilidades para validación de stock
 * 
 * Centraliza la lógica de validación de stock para evitar duplicación
 * entre onAddSale (Dashboard) y addSale (RegisterSaleView)
 */

import { supabase } from '../supabaseClient';
import { normalizeCity } from './cityUtils';

/**
 * Valida el stock de un producto y su producto extra (si existe)
 * 
 * @param {Object} params - Parámetros de validación
 * @param {Object} params.product - Producto principal
 * @param {number} params.cantidad - Cantidad solicitada
 * @param {Object} params.productExtra - Producto extra (opcional)
 * @param {number} params.cantidadExtra - Cantidad extra solicitada (opcional)
 * @param {string} params.ciudad - Ciudad para validar stock de ciudad (opcional)
 * @param {string} params.validationType - Tipo de validación: 'central' | 'city' (default: 'central')
 * @param {Function} params.onError - Callback para mostrar errores (debe recibir { type, title, message })
 * 
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateStockForSale({
  product,
  cantidad,
  productExtra = null,
  cantidadExtra = null,
  ciudad = null,
  validationType = 'central', // 'central' | 'city'
  onError
}) {
  if (!product) {
    onError?.({ type: 'error', title: 'Producto', message: 'Producto no encontrado' });
    return { valid: false, error: 'Producto no encontrado' };
  }

  const esSintetico = !!product.sintetico;

  // Validar producto principal
  if (validationType === 'central') {
    // Validar stock del almacén central
    const centralValidation = await validateCentralStock({
      product,
      cantidad,
      esSintetico,
      onError
    });
    
    if (!centralValidation.valid) {
      return centralValidation;
    }
  } else if (validationType === 'city') {
    // Validar stock de la ciudad
    if (!ciudad) {
      onError?.({ type: 'error', title: 'Ciudad', message: 'Ciudad requerida para validación' });
      return { valid: false, error: 'Ciudad requerida' };
    }

    const cityValidation = await validateCityStock({
      product,
      cantidad,
      ciudad,
      esSintetico,
      onError
    });

    if (!cityValidation.valid) {
      return cityValidation;
    }
  }

  // Validar producto extra si existe
  if (productExtra && cantidadExtra) {
    if (!productExtra) {
      onError?.({ type: 'error', title: 'Adicional', message: 'Producto adicional no existe' });
      return { valid: false, error: 'Producto adicional no existe' };
    }

    const esSinteticoExtra = !!productExtra.sintetico;

    if (validationType === 'central') {
      const extraCentralValidation = await validateCentralStock({
        product: productExtra,
        cantidad: cantidadExtra,
        esSintetico: esSinteticoExtra,
        onError,
        isExtra: true
      });

      if (!extraCentralValidation.valid) {
        return extraCentralValidation;
      }
    } else if (validationType === 'city') {
      const extraCityValidation = await validateCityStock({
        product: productExtra,
        cantidad: cantidadExtra,
        ciudad,
        esSintetico: esSinteticoExtra,
        onError,
        isExtra: true
      });

      if (!extraCityValidation.valid) {
        return extraCityValidation;
      }
    }
  }

  return { valid: true };
}

/**
 * Valida stock del almacén central
 * 
 * @private
 */
async function validateCentralStock({
  product,
  cantidad,
  esSintetico,
  onError,
  isExtra = false
}) {
  if (esSintetico) {
    return { valid: true };
  }

  let realStock = Number(product.stock || 0);

  try {
    if (product.id) {
      const { data: productData, error: productError } = await supabase
        .from('almacen_central')
        .select('stock')
        .eq('id', product.id)
        .maybeSingle();

      if (productError) {
        console.warn(`[validateCentralStock] Error obteniendo stock del producto${isExtra ? ' extra' : ''}:`, productError);
        // Continuar con stock local si hay error
      } else if (productData && typeof productData.stock === 'number') {
        realStock = productData.stock;
      }
    }
  } catch (e) {
    console.warn(`[validateCentralStock] Fallo al refrescar stock remoto${isExtra ? ' extra' : ''}, usando stock local`, e);
  }

  if (realStock <= 0) {
    const title = isExtra ? 'Adicional sin stock' : 'Sin stock';
    const message = isExtra ? 'Stock adicional 0' : 'Stock central 0. No se registra.';
    onError?.({ type: 'error', title, message });
    return { valid: false, error: message };
  }

  if (cantidad > realStock) {
    const title = isExtra ? 'Excede adicional' : 'Excede stock';
    const message = isExtra 
      ? `Disponible adicional: ${realStock}` 
      : `Disponible: ${realStock}. Ajusta la cantidad.`;
    onError?.({ type: 'error', title, message });
    return { valid: false, error: message };
  }

  return { valid: true };
}

/**
 * Valida stock de la ciudad
 * 
 * @private
 */
async function validateCityStock({
  product,
  cantidad,
  ciudad,
  esSintetico,
  onError,
  isExtra = false
}) {
  if (esSintetico) {
    return { valid: true };
  }

  try {
    const ciudadNormalizada = normalizeCity(ciudad);
    
    const { data: cityStockData, error } = await supabase
      .from('city_stock')
      .select('cantidad')
      .eq('ciudad', ciudadNormalizada)
      .eq('sku', product.sku)
      .maybeSingle();

    if (error) {
      console.error(`[validateCityStock] Error validando stock ciudad${isExtra ? ' extra' : ''}:`, error);
      const title = 'Validación falló';
      const message = isExtra 
        ? 'No se pudo validar stock adicional. Intenta de nuevo.' 
        : 'No se pudo validar stock ciudad. Intenta de nuevo.';
      onError?.({ type: 'error', title, message });
      return { valid: false, error: message };
    }

    if (cityStockData) {
      const stockCiudad = Number(cityStockData.cantidad || 0);
      
      if (stockCiudad <= 0) {
        const title = isExtra ? 'Adicional sin stock' : 'Sin stock ciudad';
        const message = isExtra 
          ? `${product.sku} en ${ciudad}: 0 unidades.` 
          : `${ciudad}: stock 0. No se registra.`;
        onError?.({ type: 'error', title, message });
        return { valid: false, error: message };
      }

      if (cantidad > stockCiudad) {
        const title = isExtra ? 'Excede stock adicional' : 'Excede stock ciudad';
        const message = isExtra 
          ? `Disponible adicional: ${stockCiudad}. Ajusta cantidad.` 
          : `Disponible en ${ciudad}: ${stockCiudad}. Ajusta la cantidad.`;
        onError?.({ type: 'error', title, message });
        return { valid: false, error: message };
      }
    } else {
      // Si no existe registro de cityStock, no permitir venta (excepto sintéticos)
      const title = 'Sin registro de stock';
      const message = `No existe registro de stock para la ciudad ${ciudad}. Contacta al administrador.`;
      onError?.({ type: 'error', title, message });
      return { valid: false, error: message };
    }
  } catch (err) {
    console.warn(`[validateCityStock] Error validando stock ciudad${isExtra ? ' extra' : ''}`, err);
    const title = 'Validación falló';
    const message = 'No se pudo validar stock ciudad. Intenta de nuevo.';
    onError?.({ type: 'error', title, message });
    return { valid: false, error: message };
  }

  return { valid: true };
}

