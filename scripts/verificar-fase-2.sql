-- Verificación completa FASE 2
-- Ejecutar en SQL Editor de Supabase

-- 1. Verificar conteo en almacen_central
SELECT 
  'almacen_central' as tabla,
  COUNT(*) as total_registros
FROM almacen_central;

-- 2. Verificar conteo en products_backup (debe mantenerse en 8)
SELECT 
  'products_backup' as tabla,
  COUNT(*) as total_registros
FROM products_backup;

-- 3. Verificar conteo en vista products (debe coincidir con almacen_central)
SELECT 
  'products (vista)' as tabla,
  COUNT(*) as total_registros
FROM products;

-- 4. Verificar que almacen_central tiene los mismos SKUs que products_backup
SELECT 
  'Comparación SKUs' as verificacion,
  (SELECT COUNT(DISTINCT sku) FROM almacen_central) as skus_almacen_central,
  (SELECT COUNT(DISTINCT sku) FROM products_backup) as skus_products_backup,
  CASE 
    WHEN (SELECT COUNT(DISTINCT sku) FROM almacen_central) = (SELECT COUNT(DISTINCT sku) FROM products_backup)
    THEN '✅ Los SKUs coinciden'
    ELSE '❌ Los SKUs NO coinciden'
  END as estado;

-- 5. Verificar que products_backup NO ha sido modificado (comparar updated_at)
SELECT 
  'Verificación de integridad' as verificacion,
  MAX(updated_at) as ultima_actualizacion_almacen_central,
  MAX(updated_at) as ultima_actualizacion_products_backup,
  CASE 
    WHEN (SELECT MAX(updated_at) FROM almacen_central) > (SELECT MAX(updated_at) FROM products_backup)
    THEN '✅ products_backup NO se ha modificado (correcto)'
    ELSE '⚠️ Verificar si products_backup se modificó'
  END as estado
FROM almacen_central, products_backup;


