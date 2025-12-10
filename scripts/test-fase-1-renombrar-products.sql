-- Script de testing para FASE 1: Renombrar products a almacen_central
-- Ejecutar después de ejecutar fase-1-renombrar-products.sql

-- 1. Verificar que la tabla almacen_central existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'almacen_central')
    THEN '✅ Tabla almacen_central existe'
    ELSE '❌ ERROR: Tabla almacen_central NO existe'
  END as verificacion_tabla;

-- 2. Verificar que la vista products existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products existe'
    ELSE '❌ ERROR: Vista products NO existe'
  END as verificacion_vista;

-- 3. Verificar conteo de registros (deben coincidir)
SELECT 
  (SELECT COUNT(*) FROM products_backup) as productos_en_backup,
  (SELECT COUNT(*) FROM products) as productos_en_vista,
  (SELECT COUNT(*) FROM almacen_central) as productos_en_tabla,
  CASE 
    WHEN (SELECT COUNT(*) FROM products_backup) = (SELECT COUNT(*) FROM almacen_central)
      AND (SELECT COUNT(*) FROM products) = (SELECT COUNT(*) FROM almacen_central)
    THEN '✅ Los conteos coinciden'
    ELSE '❌ ERROR: Los conteos NO coinciden'
  END as verificacion_conteo;

-- 4. Verificar estructura de columnas (deben ser iguales)
SELECT 
  'almacen_central' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'almacen_central'
ORDER BY ordinal_position;

SELECT 
  'products (vista)' as tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 5. Verificar que los datos son idénticos (muestra primeros 5 registros)
SELECT 
  'Comparación de datos' as test,
  p.id as id_vista,
  a.id as id_tabla,
  p.sku as sku_vista,
  a.sku as sku_tabla,
  CASE 
    WHEN p.id = a.id AND p.sku = a.sku
    THEN '✅ Coincide'
    ELSE '❌ NO coincide'
  END as verificacion
FROM products p
JOIN almacen_central a ON p.id = a.id
LIMIT 5;

-- 6. Verificar que se pueden hacer SELECT en ambas
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM products) > 0
    THEN '✅ SELECT en vista products funciona'
    ELSE '❌ ERROR: SELECT en vista products falla'
  END as test_select_vista;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM almacen_central) > 0
    THEN '✅ SELECT en tabla almacen_central funciona'
    ELSE '❌ ERROR: SELECT en tabla almacen_central falla'
  END as test_select_tabla;

-- 7. Verificar RLS está habilitado
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'almacen_central' 
      AND rowsecurity = true
    )
    THEN '✅ RLS habilitado en almacen_central'
    ELSE '⚠️ RLS NO habilitado en almacen_central'
  END as verificacion_rls;

-- 8. Verificar políticas RLS
SELECT 
  policyname,
  cmd as operacion,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Política activa'
    ELSE '⚠️ Política sin condiciones'
  END as estado
FROM pg_policies
WHERE tablename = 'almacen_central';

-- 9. Verificar trigger
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'almacen_central_updated'
    )
    THEN '✅ Trigger almacen_central_updated existe'
    ELSE '❌ ERROR: Trigger NO existe'
  END as verificacion_trigger;

-- 10. Verificar índice
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'almacen_central' 
      AND indexname = 'idx_almacen_central_sku'
    )
    THEN '✅ Índice idx_almacen_central_sku existe'
    ELSE '❌ ERROR: Índice NO existe'
  END as verificacion_indice;

-- 11. Test de INSERT (debe funcionar en almacen_central y reflejarse en products)
-- ⚠️ Este test crea un registro temporal que se eliminará después
DO $$
DECLARE
  test_id uuid;
  test_sku text := 'TEST-FASE-1-' || extract(epoch from now())::text;
BEGIN
  -- Insertar en almacen_central
  INSERT INTO almacen_central (sku, nombre, precio, costo, stock)
  VALUES (test_sku, 'Producto Test FASE 1', 100, 50, 10)
  RETURNING id INTO test_id;
  
  -- Verificar que aparece en la vista products
  IF EXISTS (SELECT 1 FROM products WHERE id = test_id) THEN
    RAISE NOTICE '✅ Test INSERT: El registro aparece en la vista products';
  ELSE
    RAISE WARNING '❌ Test INSERT: El registro NO aparece en la vista products';
  END IF;
  
  -- Eliminar registro de prueba
  DELETE FROM almacen_central WHERE id = test_id;
  
  RAISE NOTICE '✅ Test INSERT completado y limpiado';
END $$;

-- 12. Verificar que products_backup existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_backup')
    THEN '✅ Tabla products_backup existe (backup de la tabla original)'
    ELSE '⚠️ products_backup NO existe'
  END as verificacion_backup;

-- 13. Resumen final
SELECT 
  'RESUMEN FASE 1' as resumen,
  (SELECT COUNT(*) FROM products_backup) as total_en_backup,
  (SELECT COUNT(*) FROM almacen_central) as total_en_almacen_central,
  (SELECT COUNT(*) FROM products) as total_en_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM products_backup) = (SELECT COUNT(*) FROM almacen_central)
      AND (SELECT COUNT(*) FROM almacen_central) = (SELECT COUNT(*) FROM products)
    THEN '✅ TODO CORRECTO'
    ELSE '❌ HAY PROBLEMAS'
  END as estado_final;

