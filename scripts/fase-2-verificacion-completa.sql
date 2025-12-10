-- Verificación completa FASE 2
-- Ejecutar en SQL Editor de Supabase

-- 1. Comparar fechas de actualización (almacen_central debería ser más reciente si hay cambios)
SELECT 
  'almacen_central' as tabla,
  MAX(updated_at) as ultima_actualizacion,
  COUNT(*) as total_registros
FROM almacen_central
UNION ALL
SELECT 
  'products_backup' as tabla,
  MAX(updated_at) as ultima_actualizacion,
  COUNT(*) as total_registros
FROM products_backup;

-- 2. Verificar que products_backup NO se ha modificado después de la migración
-- (almacen_central debería tener actualizaciones más recientes si se han hecho cambios)
SELECT 
  CASE 
    WHEN (SELECT MAX(updated_at) FROM almacen_central) >= (SELECT MAX(updated_at) FROM products_backup)
    THEN '✅ products_backup NO se ha modificado (correcto)'
    ELSE '⚠️ Verificar: products_backup tiene actualizaciones más recientes'
  END as verificacion_integridad,
  (SELECT MAX(updated_at) FROM almacen_central) as ultima_almacen_central,
  (SELECT MAX(updated_at) FROM products_backup) as ultima_products_backup;

-- 3. Verificar que almacen_central tiene los mismos o más productos que products_backup
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM almacen_central) >= (SELECT COUNT(*) FROM products_backup)
    THEN '✅ almacen_central tiene igual o más productos (correcto)'
    ELSE '❌ ERROR: almacen_central tiene menos productos'
  END as verificacion_conteo,
  (SELECT COUNT(*) FROM almacen_central) as total_almacen_central,
  (SELECT COUNT(*) FROM products_backup) as total_products_backup;

-- 4. Verificar que la vista products funciona
SELECT 
  'products (vista)' as tabla,
  COUNT(*) as total_registros
FROM products;


