/**
 * Utilidades para normalización de ciudades
 * 
 * Centraliza la lógica de normalización/desnormalización de nombres de ciudades
 * para evitar duplicación entre diferentes módulos.
 */

/**
 * Normaliza nombre de ciudad para almacenamiento en base de datos
 * 
 * Convierte nombres de ciudades a formato normalizado:
 * - "EL ALTO" -> "el_alto"
 * - "La Paz" -> "la_paz"
 * - "SANTA CRUZ" -> "santa_cruz"
 * 
 * @param {string|null|undefined} ciudad - Nombre de la ciudad a normalizar
 * @returns {string|null} - Ciudad normalizada o null si no se proporciona
 * 
 * @example
 * normalizeCity("EL ALTO") // "el_alto"
 * normalizeCity("La Paz") // "la_paz"
 * normalizeCity(null) // null
 */
export function normalizeCity(ciudad) {
  if (!ciudad) return null;
  return ciudad.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Desnormaliza nombre de ciudad para visualización en UI
 * 
 * Convierte nombres de ciudades normalizados a formato de visualización:
 * - "el_alto" -> "EL ALTO"
 * - "la_paz" -> "LA PAZ"
 * - "santa_cruz" -> "SANTA CRUZ"
 * 
 * @param {string|null|undefined} ciudad - Nombre de la ciudad normalizado
 * @returns {string} - Ciudad desnormalizada para mostrar
 * 
 * @example
 * denormalizeCity("el_alto") // "EL ALTO"
 * denormalizeCity("la_paz") // "LA PAZ"
 * denormalizeCity(null) // null
 */
export function denormalizeCity(ciudad) {
  if (!ciudad) return ciudad;
  // Convertir de formato normalizado (el_alto) a formato display (EL ALTO)
  return ciudad
    .split('_')
    .map(word => word.toUpperCase())
    .join(' ');
}


