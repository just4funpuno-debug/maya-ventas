-- Script de testing para FASE 4: Limpieza final
-- Ejecutar después de ejecutar fase-4-renombrar-products.sql

-- 1. Verificar estructura final
SELECT 
  'Estructura Final' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
    THEN '✅ Tabla almacen_central existe'
    ELSE '❌ ERROR: Tabla almacen_central NO existe'
  END as tabla_almacen_central,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ Tabla products_backup existe (backup)'
    ELSE '⚠️ products_backup NO existe'
  END as tabla_products_backup,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products existe (compatibilidad)'
    ELSE '⚠️ Vista products NO existe (eliminada)'
  END as vista_products;

-- 2. Verificar que almacen_central es la tabla principal activa
SELECT 
  'Verificación de Datos' as verificacion,
  (SELECT COUNT(*) FROM almacen_central) as productos_almacen_central,
  (SELECT COUNT(*) FROM products_backup) as productos_backup,
  (SELECT COUNT(*) FROM products) as productos_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM almacen_central) = (SELECT COUNT(*) FROM products)
    THEN '✅ Vista sincronizada'
    ELSE '⚠️ Verificar sincronización'
  END as estado_sincronizacion;

-- 3. Verificar foreign keys
SELECT 
  'Foreign Keys' as verificacion,
  tc.constraint_name,
  tc.table_name,
  ccu.table_name AS foreign_table_name,
  CASE 
    WHEN ccu.table_name = 'almacen_central' THEN '✅ Apunta a almacen_central'
    ELSE '❌ NO apunta a almacen_central'
  END as estado
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Verificar que products_backup NO se ha modificado
SELECT 
  'Integridad Backup' as verificacion,
  (SELECT MAX(updated_at) FROM almacen_central) as ultima_actualizacion_almacen_central,
  (SELECT MAX(updated_at) FROM products_backup) as ultima_actualizacion_products_backup,
  CASE 
    WHEN (SELECT MAX(updated_at) FROM almacen_central) >= (SELECT MAX(updated_at) FROM products_backup)
    THEN '✅ products_backup NO se ha modificado (correcto)'
    ELSE '⚠️ Verificar: products_backup tiene actualizaciones más recientes'
  END as estado_integridad;

-- 5. Resumen final completo
SELECT 
  'RESUMEN FINAL MIGRACIÓN' as resumen,
  (SELECT COUNT(*) FROM almacen_central) as total_productos,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) as foreign_keys_actualizadas,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN 'Vista products mantenida'
    ELSE 'Vista products eliminada'
  END as estado_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) = 3
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
    THEN '✅ MIGRACIÓN COMPLETA Y EXITOSA'
    ELSE '⚠️ VERIFICAR ESTADO'
  END as estado_final;

