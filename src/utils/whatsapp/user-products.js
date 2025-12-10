/**
 * Utilidades para obtener información de productos del usuario
 * FASE 3: SUBFASE 3.1 - Helper para userSkus
 */

/**
 * Obtener SKUs del usuario desde session
 * @param {Object|null} session - Sesión del usuario
 * @returns {Array<string>|null} - Array de SKUs o null si es admin o no hay productos
 */
export function getUserSkus(session) {
  if (!session) {
    return null;
  }
  
  // Si es admin, retornar null (ver todos los productos)
  if (session.rol === 'admin') {
    return null;
  }
  
  // Retornar productos del usuario (array de SKUs)
  return session.productos || null;
}

/**
 * Verificar si el usuario es admin
 * @param {Object|null} session - Sesión del usuario
 * @returns {boolean} - true si es admin
 */
export function isAdmin(session) {
  return session?.rol === 'admin' || false;
}

/**
 * Obtener productos asignados al usuario (objetos completos)
 * Excluye productos sintéticos
 * @param {Object|null} session - Sesión del usuario
 * @param {Array} allProducts - Lista completa de productos
 * @returns {Array} - Array de productos asignados al usuario (sin sintéticos)
 */
export function getUserProducts(session, allProducts = []) {
  if (!session || !allProducts || allProducts.length === 0) {
    return [];
  }
  
  // Filtrar productos sintéticos primero (doble seguridad)
  const nonSyntheticProducts = allProducts.filter(product => !product.sintetico);
  
  // Si es admin, retornar todos los productos no sintéticos
  if (session.rol === 'admin') {
    return nonSyntheticProducts;
  }
  
  // Filtrar productos por SKUs asignados
  const userSkus = session.productos || [];
  if (userSkus.length === 0) {
    return [];
  }
  
  return nonSyntheticProducts.filter(product => 
    userSkus.includes(product.sku)
  );
}

