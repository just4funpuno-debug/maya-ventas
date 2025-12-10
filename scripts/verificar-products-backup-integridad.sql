-- Verificar que products_backup NO se está modificando después de la migración
-- Ejecutar en SQL Editor de Supabase

-- 1. Comparar fechas de actualización
SELECT 
  'almacen_central' as tabla,
  MAX(updated_at) as ultima_actualizacion,
  COUNT(*) as total_registros
FROM almacen_central;

SELECT 
  'products_backup' as tabla,
  MAX(updated_at) as ultima_actualizacion,
  COUNT(*) as total_registros
FROM products_backup;

-- 2. Verificar si hay productos nuevos en almacen_central que NO están en products_backup
SELECT 
  'Productos nuevos en almacen_central' as verificacion,
  COUNT(*) as productos_nuevos
FROM almacen_central a
WHERE NOT EXISTS (
  SELECT 1 FROM products_backup p 
  WHERE p.sku = a.sku
);

-- 3. Verificar si hay diferencias en los datos (muestra primeros 3 productos con diferencias)
SELECT 
  a.sku,
  a.nombre as nombre_almacen_central,
  p.nombre as nombre_products_backup,
  a.stock as stock_almacen_central,
  p.stock as stock_products_backup,
  CASE 
    WHEN a.stock != p.stock THEN '⚠️ Stock diferente'
    WHEN a.nombre != p.nombre THEN '⚠️ Nombre diferente'
    ELSE '✅ Coincide'
  END as estado
FROM almacen_central a
JOIN products_backup p ON a.sku = p.sku
WHERE a.stock != p.stock OR a.nombre != p.nombre
LIMIT 3;

-- 4. Verificar que products_backup NO tiene productos que no están en almacen_central
-- (Esto confirmaría que products_backup es realmente un backup estático)
SELECT 
  'Productos solo en products_backup (no debería haber)' as verificacion,
  COUNT(*) as productos_huérfanos
FROM products_backup p
WHERE NOT EXISTS (
  SELECT 1 FROM almacen_central a 
  WHERE a.sku = p.sku
);

-- 5. Resumen final
SELECT 
  'RESUMEN INTEGRIDAD' as resumen,
  (SELECT COUNT(*) FROM almacen_central) as total_almacen_central,
  (SELECT COUNT(*) FROM products_backup) as total_products_backup,
  (SELECT COUNT(*) FROM almacen_central WHERE updated_at > (SELECT MAX(updated_at) FROM products_backup)) as productos_modificados_despues_migracion,
  CASE 
    WHEN (SELECT MAX(updated_at) FROM almacen_central) > (SELECT MAX(updated_at) FROM products_backup)
    THEN '✅ products_backup NO se ha modificado (correcto)'
    ELSE '⚠️ Verificar si products_backup se modificó'
  END as estado_integridad;


