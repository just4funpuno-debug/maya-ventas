-- ================================================================
-- Script para listar todos los productos disponibles
-- ================================================================
-- Objetivo: Encontrar el producto "Cardio Vascular" o similar
-- ================================================================

-- Listar productos desde almacen_central
SELECT 
  'almacen_central' AS tabla_origen,
  id,
  sku,
  nombre,
  sintetico,
  created_at
FROM almacen_central
WHERE (sintetico = false OR sintetico IS NULL)
ORDER BY nombre ASC;

-- Buscar productos que contengan "cardio" o "vascular" (case insensitive)
SELECT 
  'almacen_central' AS tabla_origen,
  id,
  sku,
  nombre,
  sintetico
FROM almacen_central
WHERE (
  LOWER(nombre) LIKE '%cardio%' 
  OR LOWER(nombre) LIKE '%vascular%'
  OR LOWER(sku) LIKE '%cvp%'
  OR LOWER(sku) LIKE '%cardio%'
)
AND (sintetico = false OR sintetico IS NULL)
ORDER BY nombre ASC;

