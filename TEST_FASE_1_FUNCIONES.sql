-- ============================================================================
-- TEST FASE 1: Verificar Funciones Helper
-- ============================================================================

-- 1. Verificar qué SKUs existen en almacen_central
SELECT sku, id, nombre 
FROM almacen_central 
ORDER BY sku 
LIMIT 10;

-- 2. Probar función con SKUs reales (reemplaza con SKUs que realmente existan)
-- Primero obtén los SKUs de arriba, luego prueba:
-- SELECT get_product_ids_from_skus(ARRAY['SKU1', 'SKU2']);

-- 3. Verificar que la función funciona con un solo SKU
-- SELECT get_product_ids_from_skus(ARRAY['CVP-60']);

-- 4. Probar función get_account_ids_without_product
SELECT get_account_ids_without_product();

-- 5. Si hay cuentas con productos, probar:
-- SELECT get_account_ids_by_user_skus(ARRAY['SKU1']);

-- 6. Verificar estructura de almacen_central
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'almacen_central'
  AND column_name IN ('id', 'sku', 'nombre')
ORDER BY column_name;

