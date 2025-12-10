/**
 * Servicio para inicialización automática de CRM al crear producto
 * FASE 2: Inicialización Automática
 * 
 * Este servicio crea automáticamente:
 * - Pipeline por defecto para el producto
 * - WhatsApp Account vacío (inactivo) para configurar después
 */

import { createPipeline } from './pipelines';
import { createAccount } from './accounts';

/**
 * Inicializar CRM completo para un producto nuevo
 * FASE 2: SUBFASE 2.1 - Crear función initializeCRMForProduct()
 * 
 * @param {string} productId - ID del producto (debe ser UUID válido)
 * @param {Object} productData - Datos del producto (nombre, sku, etc.)
 * @returns {Promise<{success: boolean, pipeline: Object|null, whatsappAccount: Object|null, errors: Array}>}
 */
export async function initializeCRMForProduct(productId, productData = {}) {
  const results = {
    success: false,
    pipeline: null,
    whatsappAccount: null,
    errors: []
  };

  try {
    // Validar productId
    if (!productId) {
      results.errors.push({ 
        step: 'validation', 
        error: 'productId es requerido' 
      });
      return results;
    }

    // 1. Crear Pipeline por defecto
    try {
      const defaultStages = [
        { 
          name: 'Leads Entrantes', 
          order: 1, 
          color: '#3b82f6',
          sequence_id: null // FASE 3: Se asignará secuencia después
        },
        { 
          name: 'Seguimiento', 
          order: 2, 
          color: '#f59e0b',
          sequence_id: null
        },
        { 
          name: 'Venta', 
          order: 3, 
          color: '#10b981',
          sequence_id: null
        },
        { 
          name: 'Cliente', 
          order: 4, 
          color: '#8b5cf6',
          sequence_id: null
        }
      ];
      
      const pipelineName = productData.nombre 
        ? `Pipeline - ${productData.nombre}` 
        : 'Pipeline por Defecto';
      
      const { data: pipeline, error: pipelineError } = await createPipeline({
        product_id: productId,
        name: pipelineName,
        stages: defaultStages,
        is_default: true,
        account_id: null // Pipeline global por producto
      });
      
      if (pipelineError) {
        throw pipelineError;
      }
      
      results.pipeline = pipeline;
      console.log('[initializeCRMForProduct] ✅ Pipeline creado:', pipeline?.id);
    } catch (err) {
      const errorMsg = err.message || 'Error desconocido al crear pipeline';
      results.errors.push({ 
        step: 'pipeline', 
        error: errorMsg 
      });
      console.error('[initializeCRMForProduct] ❌ Error creando pipeline:', err);
      // Continuar aunque falle el pipeline (puede crear WhatsApp Account)
    }
    
    // 2. Crear WhatsApp Account vacío (inactivo, para configurar después)
    try {
      const accountDisplayName = productData.nombre 
        ? `WhatsApp - ${productData.nombre}` 
        : 'WhatsApp Account';
      
      const { data: whatsappAccount, error: accountError } = await createAccount({
        phone_number_id: null, // Vacío - se configurará después
        business_account_id: null,
        access_token: null,
        verify_token: null,
        phone_number: null,
        display_name: accountDisplayName,
        product_id: productId, // FASE 1: Vinculado al producto
        active: false // Inactivo hasta configurar
      });
      
      if (accountError) {
        // FASE 1: Puede fallar si ya existe cuenta (índice único)
        if (accountError.code === 'DUPLICATE_PRODUCT_ACCOUNT') {
          console.warn('[initializeCRMForProduct] ⚠️ Ya existe WhatsApp Account para este producto');
          results.errors.push({ 
            step: 'whatsapp', 
            error: 'Ya existe un WhatsApp Account para este producto',
            code: accountError.code
          });
        } else {
          throw accountError;
        }
      } else {
        results.whatsappAccount = whatsappAccount;
        console.log('[initializeCRMForProduct] ✅ WhatsApp Account creado:', whatsappAccount?.id);
      }
    } catch (err) {
      const errorMsg = err.message || 'Error desconocido al crear WhatsApp Account';
      results.errors.push({ 
        step: 'whatsapp', 
        error: errorMsg 
      });
      console.error('[initializeCRMForProduct] ❌ Error creando WhatsApp Account:', err);
      // Continuar aunque falle (al menos se creó el pipeline)
    }
    
    // Considerar éxito si al menos se creó el pipeline
    // WhatsApp Account es opcional (puede fallar si ya existe)
    results.success = results.pipeline !== null;
    
    if (results.success) {
      console.log('[initializeCRMForProduct] ✅ CRM inicializado correctamente para producto:', productId);
    } else {
      console.error('[initializeCRMForProduct] ❌ Error al inicializar CRM. Errores:', results.errors);
    }
    
    return results;
  } catch (err) {
    console.error('[initializeCRMForProduct] ❌ Error fatal:', err);
    results.errors.push({ 
      step: 'fatal', 
      error: err.message || 'Error desconocido' 
    });
    return results;
  }
}

/**
 * Verificar si el CRM ya está inicializado para un producto
 * FASE 2: SUBFASE 2.1 - Función auxiliar de verificación
 * 
 * @param {string} productId - ID del producto
 * @returns {Promise<{hasPipeline: boolean, hasWhatsAppAccount: boolean, isComplete: boolean}>}
 */
export async function checkCRMInitialization(productId) {
  try {
    const { getPipelineByProduct } = await import('./pipelines');
    const { getAllAccounts } = await import('./accounts');
    
    // Verificar pipeline
    const { data: pipeline } = await getPipelineByProduct(productId);
    const hasPipeline = pipeline !== null;
    
    // Verificar WhatsApp Account
    const { data: accounts } = await getAllAccounts();
    const hasWhatsAppAccount = accounts?.some(acc => acc.product_id === productId) || false;
    
    return {
      hasPipeline,
      hasWhatsAppAccount,
      isComplete: hasPipeline && hasWhatsAppAccount
    };
  } catch (err) {
    console.error('[checkCRMInitialization] Error:', err);
    return {
      hasPipeline: false,
      hasWhatsAppAccount: false,
      isComplete: false
    };
  }
}



