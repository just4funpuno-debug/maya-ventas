-- Script para eliminar la vista products y la tabla products_backup
-- ⚠️ IMPORTANTE: Solo ejecutar después de confirmar que todo funciona correctamente
-- ✅ El código ya no usa estos elementos, todo apunta a almacen_central

-- ================================================================
-- 1. VERIFICACIÓN PRE-ELIMINACIÓN
-- ================================================================

-- Verificar que almacen_central existe y tiene datos
SELECT 
  'Verificación Pre-Eliminación' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
    THEN '✅ Tabla almacen_central existe'
    ELSE '❌ ERROR: Tabla almacen_central NO existe'
  END as tabla_almacen_central,
  (SELECT COUNT(*) FROM almacen_central) as total_productos_almacen_central,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products existe, se eliminará'
    ELSE '⚠️ Vista products NO existe'
  END as vista_products,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ Tabla products_backup existe, se eliminará'
    ELSE '⚠️ Tabla products_backup NO existe'
  END as tabla_products_backup;

-- ================================================================
-- 2. ELIMINAR VISTA PRODUCTS
-- ================================================================

DROP VIEW IF EXISTS products;

-- Verificar que se eliminó
SELECT 
  'Eliminación Vista products' as verificacion,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products eliminada correctamente'
    ELSE '❌ ERROR: Vista products aún existe'
  END as estado;

-- ================================================================
-- 3. ACTUALIZAR DEPENDENCIAS DE PRODUCTS_BACKUP
-- ================================================================

-- 3.1. Actualizar foreign key de city_stock para que apunte a almacen_central
DO $$
BEGIN
  -- Eliminar foreign key existente si apunta a products_backup
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'city_stock_sku_fkey' 
    AND table_name = 'city_stock'
  ) THEN
    ALTER TABLE city_stock DROP CONSTRAINT city_stock_sku_fkey;
    RAISE NOTICE '✅ Foreign key city_stock_sku_fkey eliminada';
  END IF;
  
  -- Crear nueva foreign key apuntando a almacen_central
  ALTER TABLE city_stock 
    ADD CONSTRAINT city_stock_sku_fkey 
    FOREIGN KEY (sku) REFERENCES almacen_central(sku) 
    ON UPDATE CASCADE ON DELETE SET NULL;
  RAISE NOTICE '✅ Foreign key city_stock_sku_fkey creada apuntando a almacen_central';
END $$;

-- 3.2. Eliminar o actualizar vista v_sales_net si existe
DROP VIEW IF EXISTS v_sales_net CASCADE;

-- ================================================================
-- 4. ELIMINAR TABLA PRODUCTS_BACKUP
-- ================================================================

DROP TABLE IF EXISTS products_backup;

-- Verificar que se eliminó
SELECT 
  'Eliminación Tabla products_backup' as verificacion,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ Tabla products_backup eliminada correctamente'
    ELSE '❌ ERROR: Tabla products_backup aún existe'
  END as estado;

-- Verificar que city_stock ahora apunta a almacen_central
SELECT 
  'Verificación Foreign Key city_stock' as verificacion,
  tc.constraint_name,
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
  AND tc.constraint_name = 'city_stock_sku_fkey';

-- ================================================================
-- 5. VERIFICACIÓN FINAL
-- ================================================================

-- Verificar estructura final
SELECT 
  'Estructura Final' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
    THEN '✅ Tabla almacen_central existe (tabla principal)'
    ELSE '❌ ERROR: Tabla almacen_central NO existe'
  END as tabla_almacen_central,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products eliminada'
    ELSE '❌ ERROR: Vista products aún existe'
  END as vista_products,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ Tabla products_backup eliminada'
    ELSE '❌ ERROR: Tabla products_backup aún existe'
  END as tabla_products_backup;

-- ================================================================
-- 6. RESUMEN FINAL
-- ================================================================

SELECT 
  'LIMPIEZA COMPLETADA' as resumen,
  (SELECT COUNT(*) FROM almacen_central) as total_productos_almacen_central,
  'almacen_central es ahora la única tabla de productos' as resultado,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
      AND NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ LIMPIEZA EXITOSA'
    ELSE '⚠️ VERIFICAR ESTADO'
  END as estado_final;

