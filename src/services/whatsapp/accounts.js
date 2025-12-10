/**
 * Servicio para gestionar cuentas WhatsApp
 * SUBFASE 1.4: CRUD de cuentas WhatsApp en Supabase
 * FASE 2: SUBFASE 2.1 - Filtrado por productos del usuario
 */

import { supabase } from '../../supabaseClient';

const TABLE_NAME = 'whatsapp_accounts';

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
 * Obtener todas las cuentas WhatsApp
 * Incluye información del producto asociado (nombre y SKU)
 * Si no hay foreign key, hace consultas separadas
 * FASE 2: Filtrado por productos del usuario
 * 
 * @param {Array<string>|null} userSkus - SKUs del usuario (null = admin, ver todas)
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getAllAccounts(userSkus = null) {
  try {
    // Obtener account_ids permitidos si hay filtro de productos
    const allowedAccountIds = await getAccountIdsForUser(userSkus);
    
    // Si hay filtro y no hay cuentas permitidas, retornar vacío
    if (userSkus && allowedAccountIds !== null && allowedAccountIds.length === 0) {
      return { data: [], error: null };
    }
    
    // Construir query base
    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        product:products(id, sku, nombre)
      `);
    
    // Aplicar filtro por account_ids si hay filtro de productos
    if (allowedAccountIds !== null && allowedAccountIds.length > 0) {
      query = query.in('id', allowedAccountIds);
    }
    
    query = query.order('created_at', { ascending: false });
    
    // Intentar con JOIN primero (si existe foreign key)
    let data, error;
    const { data: accountsData, error: accountsError } = await query;
    
    data = accountsData;
    error = accountsError;
    
    // Si el error es por falta de relación, hacer consultas separadas
    if (error && (error.message?.includes('relationship') || error.message?.includes('schema cache'))) {
      console.warn('[getAllAccounts] No hay foreign key, usando consultas separadas');
      
      // Obtener cuentas sin JOIN
      const { data: accountsOnly, error: accountsOnlyError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (accountsOnlyError) {
        throw accountsOnlyError;
      }
      
      // Obtener productos (intentar products primero, luego almacen_central)
      let productsData = null;
      const { data: productsData1, error: productsError1 } = await supabase
        .from('products')
        .select('id, sku, nombre');
      
      if (!productsError1 && productsData1) {
        productsData = productsData1;
      } else {
        // Fallback a almacen_central si products no existe
        const errorCode = productsError1?.code;
        const errorMessage = productsError1?.message || '';
        if (errorCode === 'PGRST204' || errorCode === 'PGRST205' || errorCode === '42P01' || 
            errorMessage.includes('does not exist') || errorMessage.includes('schema cache')) {
          const { data: almacenData, error: almacenError } = await supabase
            .from('almacen_central')
            .select('id, sku, nombre');
          
          if (!almacenError && almacenData) {
            productsData = almacenData;
          }
        }
      }
      
      const productsMap = new Map((productsData || []).map(p => [p.id, p]));
      
      // Mapear datos manualmente
      data = (accountsOnly || []).map(account => ({
        ...account,
        product_name: account.product_id ? (productsMap.get(account.product_id)?.nombre || null) : null,
        product_sku: account.product_id ? (productsMap.get(account.product_id)?.sku || null) : null
      }));
      
      error = null;
    } else if (error) {
      throw error;
    } else {
      // Mapear datos para incluir nombre y SKU del producto
      data = (data || []).map(account => ({
        ...account,
        product_name: account.product?.nombre || null,
        product_sku: account.product?.sku || null
      }));
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAllAccounts] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Obtener cuenta por ID
 * Incluye información del producto asociado (nombre y SKU)
 * Si no hay foreign key, hace consultas separadas
 * FASE 2: Verificación de permisos por productos del usuario
 * 
 * @param {string} accountId - ID de la cuenta
 * @param {Array<string>|null} userSkus - SKUs del usuario (null = admin, ver todas)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getAccountById(accountId, userSkus = null) {
  try {
    // Si hay filtro de productos, verificar permisos primero
    if (userSkus && userSkus.length > 0) {
      const allowedAccountIds = await getAccountIdsForUser(userSkus);
      
      // Si no hay cuentas permitidas o la cuenta no está en la lista, retornar error
      if (!allowedAccountIds || allowedAccountIds.length === 0 || !allowedAccountIds.includes(accountId)) {
        return {
          data: null,
          error: {
            message: 'No tienes permisos para acceder a esta cuenta',
            code: 'PERMISSION_DENIED'
          }
        };
      }
    }
    
    // Intentar con JOIN primero (si existe foreign key)
    let data, error;
    const { data: accountData, error: accountError } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        product:products(id, sku, nombre)
      `)
      .eq('id', accountId)
      .single();
    
    data = accountData;
    error = accountError;
    
    // Si el error es por falta de relación, hacer consultas separadas
    if (error && (error.message?.includes('relationship') || error.message?.includes('schema cache'))) {
      console.warn('[getAccountById] No hay foreign key, usando consultas separadas');
      
      // Obtener cuenta sin JOIN
      const { data: accountOnly, error: accountOnlyError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', accountId)
        .single();
      
      if (accountOnlyError) {
        throw accountOnlyError;
      }
      
      // Si tiene product_id, obtener producto (intentar products primero, luego almacen_central)
      let product = null;
      if (accountOnly.product_id) {
        const { data: productData1, error: productError1 } = await supabase
          .from('products')
          .select('id, sku, nombre')
          .eq('id', accountOnly.product_id)
          .maybeSingle();
        
        if (!productError1 && productData1) {
          product = productData1;
        } else {
          // Fallback a almacen_central si products no existe
          const errorCode = productError1?.code;
          const errorMessage = productError1?.message || '';
          if (errorCode === 'PGRST204' || errorCode === 'PGRST205' || errorCode === '42P01' || 
              errorMessage.includes('does not exist') || errorMessage.includes('schema cache')) {
            const { data: almacenData, error: almacenError } = await supabase
              .from('almacen_central')
              .select('id, sku, nombre')
              .eq('id', accountOnly.product_id)
              .maybeSingle();
            
            if (!almacenError && almacenData) {
              product = almacenData;
            }
          }
        }
      }
      
      data = {
        ...accountOnly,
        product_name: product?.nombre || null,
        product_sku: product?.sku || null
      };
      
      error = null;
    } else if (error) {
      throw error;
    } else {
      // Mapear datos para incluir nombre y SKU del producto
      data = {
        ...data,
        product_name: data.product?.nombre || null,
        product_sku: data.product?.sku || null
      };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAccountById] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Obtener cuenta por Phone Number ID
 */
export async function getAccountByPhoneNumberId(phoneNumberId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle();
    
    if (error) {
      console.error('[getAccountByPhoneNumberId] Error:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAccountByPhoneNumberId] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Crear nueva cuenta WhatsApp
 */
export async function createAccount(accountData) {
  try {
    // FASE 4: SUBFASE 4.1 - Validar que product_id no sea null
    // Nota: product_id puede ser null si el usuario explícitamente quiere crear una cuenta sin producto
    // pero esto ya no es recomendado. Por ahora, permitimos null pero con advertencia.
    const productId = accountData.product_id && accountData.product_id.trim() !== '' ? accountData.product_id : null;
    
    // FASE 1: SUBFASE 1.2 - Validar que no exista ya un WhatsApp Account para este producto
    if (productId) {
      const { data: existingAccount, error: checkError } = await supabase
        .from(TABLE_NAME)
        .select('id, display_name')
        .eq('product_id', productId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (no existe), eso está bien
        console.error('[createAccount] Error verificando cuenta existente:', checkError);
        return { 
          data: null, 
          error: { 
            message: 'Error al verificar cuenta existente',
            details: checkError
          } 
        };
      }
      
      if (existingAccount) {
        return {
          data: null,
          error: {
            message: `Este producto ya tiene un WhatsApp Account asignado (${existingAccount.display_name || 'Sin nombre'}). Cada producto solo puede tener una cuenta.`,
            code: 'DUPLICATE_PRODUCT_ACCOUNT',
            existing_account_id: existingAccount.id
          }
        };
      }
    }
    
    // Preparar datos para insertar
    const insertData = {
      phone_number_id: accountData.phone_number_id?.trim(),
      business_account_id: accountData.business_account_id?.trim(),
      access_token: accountData.access_token?.trim(),
      verify_token: accountData.verify_token?.trim(),
      phone_number: accountData.phone_number?.trim(),
      display_name: accountData.display_name?.trim() || null,
      product_id: productId,
      active: accountData.active !== undefined ? accountData.active : true
    };
    
    // Advertencia si product_id es null (pero no bloqueamos)
    if (!productId) {
      console.warn('[createAccount] Advertencia: Se está creando una cuenta sin product_id. Esto no es recomendado.');
    }
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('[createAccount] Error:', error);
      
      // FASE 1: SUBFASE 1.2 - Manejar error de índice único si ocurre
      if (error.code === '23505' || error.message?.includes('idx_accounts_product_unique')) {
        return {
          data: null,
          error: {
            message: 'Este producto ya tiene un WhatsApp Account asignado. Cada producto solo puede tener una cuenta.',
            code: 'DUPLICATE_PRODUCT_ACCOUNT',
            details: error
          }
        };
      }
      
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[createAccount] Error fatal:', err);
    
    // FASE 1: SUBFASE 1.2 - Manejar error de índice único en catch
    if (err.code === '23505' || err.message?.includes('idx_accounts_product_unique')) {
      return {
        data: null,
        error: {
          message: 'Este producto ya tiene un WhatsApp Account asignado. Cada producto solo puede tener una cuenta.',
          code: 'DUPLICATE_PRODUCT_ACCOUNT',
          details: err
        }
      };
    }
    
    return { data: null, error: err };
  }
}

/**
 * Actualizar cuenta WhatsApp
 */
export async function updateAccount(accountId, updates) {
  try {
    // Preparar datos para actualizar
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Solo incluir campos que se proporcionaron
    if (updates.phone_number_id !== undefined) {
      updateData.phone_number_id = updates.phone_number_id?.trim();
    }
    if (updates.business_account_id !== undefined) {
      updateData.business_account_id = updates.business_account_id?.trim();
    }
    if (updates.access_token !== undefined) {
      updateData.access_token = updates.access_token?.trim();
    }
    if (updates.verify_token !== undefined) {
      updateData.verify_token = updates.verify_token?.trim();
    }
    if (updates.phone_number !== undefined) {
      updateData.phone_number = updates.phone_number?.trim();
    }
    if (updates.display_name !== undefined) {
      updateData.display_name = updates.display_name?.trim() || null;
    }
    if (updates.product_id !== undefined) {
      const productId = updates.product_id && updates.product_id.trim() !== '' ? updates.product_id : null;
      
      // FASE 1: SUBFASE 1.2 - Validar que no exista ya otro WhatsApp Account para este producto
      if (productId) {
        const { data: existingAccount, error: checkError } = await supabase
          .from(TABLE_NAME)
          .select('id, display_name')
          .eq('product_id', productId)
          .neq('id', accountId) // Excluir la cuenta actual
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (no existe), eso está bien
          console.error('[updateAccount] Error verificando cuenta existente:', checkError);
          return { 
            data: null, 
            error: { 
              message: 'Error al verificar cuenta existente',
              details: checkError
            } 
          };
        }
        
        if (existingAccount) {
          return {
            data: null,
            error: {
              message: `Este producto ya tiene un WhatsApp Account asignado (${existingAccount.display_name || 'Sin nombre'}). Cada producto solo puede tener una cuenta.`,
              code: 'DUPLICATE_PRODUCT_ACCOUNT',
              existing_account_id: existingAccount.id
            }
          };
        }
      }
      
      updateData.product_id = productId;
      
      // FASE 4: SUBFASE 4.1 - Advertencia si se intenta establecer product_id a null
      if (!productId) {
        console.warn('[updateAccount] Advertencia: Se está actualizando product_id a null. Esto no es recomendado.');
      }
    }
    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();
    
    if (error) {
      console.error('[updateAccount] Error:', error);
      
      // FASE 1: SUBFASE 1.2 - Manejar error de índice único si ocurre
      if (error.code === '23505' || error.message?.includes('idx_accounts_product_unique')) {
        return {
          data: null,
          error: {
            message: 'Este producto ya tiene un WhatsApp Account asignado. Cada producto solo puede tener una cuenta.',
            code: 'DUPLICATE_PRODUCT_ACCOUNT',
            details: error
          }
        };
      }
      
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[updateAccount] Error fatal:', err);
    
    // FASE 1: SUBFASE 1.2 - Manejar error de índice único en catch
    if (err.code === '23505' || err.message?.includes('idx_accounts_product_unique')) {
      return {
        data: null,
        error: {
          message: 'Este producto ya tiene un WhatsApp Account asignado. Cada producto solo puede tener una cuenta.',
          code: 'DUPLICATE_PRODUCT_ACCOUNT',
          details: err
        }
      };
    }
    
    return { data: null, error: err };
  }
}

/**
 * Eliminar cuenta WhatsApp
 */
export async function deleteAccount(accountId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', accountId);
    
    if (error) {
      console.error('[deleteAccount] Error:', error);
      throw error;
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[deleteAccount] Error fatal:', err);
    return { success: false, error: err };
  }
}

/**
 * Activar/desactivar cuenta
 */
export async function toggleAccountActive(accountId, active) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single();
    
    if (error) {
      console.error('[toggleAccountActive] Error:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[toggleAccountActive] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Suscripción en tiempo real a cambios en cuentas
 */
export function subscribeAccounts(callback) {
  const channel = supabase
    .channel('whatsapp_accounts_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}

/**
 * Obtener productos disponibles (para selector)
 * Intenta usar 'products' primero, luego 'almacen_central' como fallback
 */
export async function getProducts() {
  try {
    // Intentar primero con 'products'
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, sku, nombre, sintetico')
      .eq('sintetico', false) // Excluir productos sintéticos
      .order('nombre', { ascending: true });
    
    // Si no hay error y hay datos, usar products
    if (!productsError && productsData) {
      // Filtrar también en el cliente por si acaso (doble seguridad)
      const filteredData = productsData.filter(product => !product.sintetico);
      const mappedData = filteredData.map(product => ({
        id: product.id,
        name: product.nombre || 'Sin nombre',
        sku: product.sku || ''
      }));
      return { data: mappedData, error: null };
    }
    
    // Si hay error o no hay datos, intentar con 'almacen_central' como fallback
    // (Esto cubre el caso donde products no existe o no es accesible)
    if (productsError || !productsData || productsData.length === 0) {
      if (productsError) {
        const errorCode = productsError.code;
        const errorMessage = productsError.message || '';
        console.warn('[getProducts] Error con products (código:', errorCode, '), intentando almacen_central:', errorMessage.substring(0, 100));
      } else {
        console.warn('[getProducts] No hay datos en products, intentando almacen_central');
      }
      
      // Intentar filtrar por sintetico en almacen_central si existe el campo
      let query = supabase
        .from('almacen_central')
        .select('id, sku, nombre, sintetico')
        .order('nombre', { ascending: true });
      
      // Si el campo sintetico existe, filtrar
      // Nota: Si el campo no existe, esto puede fallar, pero lo manejamos con try/catch
      try {
        query = query.eq('sintetico', false);
      } catch (e) {
        // Si el campo no existe, continuar sin filtro
        console.warn('[getProducts] Campo sintetico no existe en almacen_central, continuando sin filtro');
      }
      
      const { data: almacenData, error: almacenError } = await query;
      
      if (almacenError) {
        console.warn('[getProducts] Error obteniendo productos de almacen_central:', almacenError);
        return { data: [], error: null };
      }
      
      if (almacenData && almacenData.length > 0) {
        // Filtrar también en el cliente por si acaso (doble seguridad)
        const filteredData = almacenData.filter(product => !product.sintetico);
        // Mapear datos de almacen_central
        const mappedData = filteredData.map(product => ({
          id: product.id,
          name: product.nombre || 'Sin nombre',
          sku: product.sku || ''
        }));
        
        return { data: mappedData, error: null };
      }
    }
    
    // Si no hay datos ni error, retornar vacío
    return { data: [], error: null };
  } catch (err) {
    // Si hay excepción, intentar almacen_central como último recurso
    console.warn('[getProducts] Excepción al obtener productos, intentando almacen_central:', err);
    
    try {
      let query = supabase
        .from('almacen_central')
        .select('id, sku, nombre, sintetico')
        .order('nombre', { ascending: true });
      
      // Intentar filtrar por sintetico si existe
      try {
        query = query.eq('sintetico', false);
      } catch (e) {
        // Si el campo no existe, continuar sin filtro
      }
      
      const { data: almacenData, error: almacenError } = await query;
      
      if (almacenError) {
        console.warn('[getProducts] Error obteniendo productos de almacen_central:', almacenError);
        return { data: [], error: null };
      }
      
      // Filtrar también en el cliente por si acaso (doble seguridad)
      const filteredData = (almacenData || []).filter(product => !product.sintetico);
      const mappedData = filteredData.map(product => ({
        id: product.id,
        name: product.nombre || 'Sin nombre',
        sku: product.sku || ''
      }));
      
      return { data: mappedData, error: null };
    } catch (fallbackErr) {
      console.warn('[getProducts] Error en fallback:', fallbackErr);
      return { data: [], error: null };
    }
  }
}

